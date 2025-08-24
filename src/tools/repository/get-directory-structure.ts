import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { logError, logDebug } from '../../utils/logger.js';

interface DirectoryNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DirectoryNode[];
  size?: number;
  extension?: string;
}

export async function handleGetDirectoryStructure({
  path = '',
  depth = 3,
  includeFiles = true
}: {
  path?: string;
  depth?: number;
  includeFiles?: boolean;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const gluestackPath = process.env.GLUESTACK_PATH || '../gluestack-ui';
    const targetPath = path ? join(gluestackPath, path) : gluestackPath;
    
    logDebug(`Getting directory structure for: ${targetPath}`);
    
    const directoryTree = await buildDirectoryTree(targetPath, depth, includeFiles);
    
    const formattedTree = formatDirectoryTree(directoryTree, gluestackPath);
    
    return {
      content: [{
        type: "text",
        text: formattedTree
      }]
    };
  } catch (error) {
    logError('Failed to get directory structure', error);
    throw new Error(`Failed to get directory structure: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function buildDirectoryTree(
  rootPath: string, 
  maxDepth: number, 
  includeFiles: boolean,
  currentDepth = 0
): Promise<DirectoryNode> {
  const stats = await stat(rootPath);
  const name = rootPath.split('/').pop() || 'root';
  
  if (stats.isFile()) {
    return {
      name,
      path: rootPath,
      type: 'file',
      size: stats.size,
      extension: name.includes('.') ? name.split('.').pop() : undefined
    };
  }
  
  const node: DirectoryNode = {
    name,
    path: rootPath,
    type: 'directory',
    children: []
  };
  
  if (currentDepth >= maxDepth) {
    return node;
  }
  
  try {
    const items = await readdir(rootPath);
    const filteredItems = items.filter(item => 
      !item.startsWith('.') && 
      item !== 'node_modules' && 
      item !== 'build' &&
      item !== 'dist'
    );
    
    for (const item of filteredItems.slice(0, 50)) { // Limit to 50 items per directory
      try {
        const itemPath = join(rootPath, item);
        const itemStats = await stat(itemPath);
        
        if (itemStats.isDirectory()) {
          const childNode = await buildDirectoryTree(itemPath, maxDepth, includeFiles, currentDepth + 1);
          node.children!.push(childNode);
        } else if (includeFiles && isRelevantFile(item)) {
          node.children!.push({
            name: item,
            path: itemPath,
            type: 'file',
            size: itemStats.size,
            extension: item.includes('.') ? item.split('.').pop() : undefined
          });
        }
      } catch (error) {
        logDebug(`Skipping item ${item}: ${error}`);
      }
    }
    
    // Sort children: directories first, then files
    node.children!.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    
  } catch (error) {
    logDebug(`Cannot read directory ${rootPath}: ${error}`);
  }
  
  return node;
}

function isRelevantFile(filename: string): boolean {
  const relevantExtensions = [
    '.ts', '.tsx', '.js', '.jsx', 
    '.json', '.md', '.yml', '.yaml',
    '.css', '.scss', '.sass'
  ];
  
  const extension = '.' + (filename.split('.').pop() || '');
  return relevantExtensions.includes(extension.toLowerCase()) ||
         filename === 'README.md' ||
         filename === 'package.json' ||
         filename === 'tsconfig.json';
}

function formatDirectoryTree(tree: DirectoryNode, basePath: string): string {
  const lines: string[] = [];
  const relativePath = relative(basePath, tree.path) || '.';
  
  lines.push(`# Gluestack UI Directory Structure`);
  lines.push(`**Base Path**: \`${basePath}\``);
  lines.push(`**Target Path**: \`${relativePath}\`\n`);
  
  function addNode(node: DirectoryNode, prefix = '', isLast = true) {
    const connector = isLast ? '└── ' : '├── ';
    const icon = node.type === 'directory' ? '📁' : '📄';
    
    let line = `${prefix}${connector}${icon} **${node.name}**`;
    
    if (node.type === 'file') {
      if (node.extension) {
        line += ` *(${node.extension})*`;
      }
      if (node.size !== undefined) {
        const sizeKB = Math.round(node.size / 1024 * 100) / 100;
        line += ` - ${sizeKB}KB`;
      }
    } else if (node.children) {
      line += ` *(${node.children.length} items)*`;
    }
    
    lines.push(line);
    
    if (node.children && node.children.length > 0) {
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      node.children.forEach((child, index) => {
        const childIsLast = index === node.children!.length - 1;
        addNode(child, newPrefix, childIsLast);
      });
    }
  }
  
  addNode(tree);
  
  // Add summary statistics
  const stats = getTreeStats(tree);
  lines.push('\n## Summary');
  lines.push(`- **Directories**: ${stats.directories}`);
  lines.push(`- **Files**: ${stats.files}`);
  lines.push(`- **Total Size**: ${(stats.totalSize / 1024).toFixed(1)}KB`);
  lines.push(`- **File Types**: ${Array.from(stats.extensions).join(', ')}`);
  
  // Add helpful paths for common directories
  const commonPaths = [
    'example/storybook-nativewind/src/components',
    'example/storybook-nativewind/src/core-components',
    'packages/config/src/theme',
    'packages/unstyled',
    'packages/styled'
  ];
  
  lines.push('\n## Common Paths');
  commonPaths.forEach(path => {
    lines.push(`- \`${path}\` - ${getPathDescription(path)}`);
  });
  
  return lines.join('\n');
}

function getTreeStats(tree: DirectoryNode): {
  directories: number;
  files: number;
  totalSize: number;
  extensions: Set<string>;
} {
  const stats = {
    directories: 0,
    files: 0,
    totalSize: 0,
    extensions: new Set<string>()
  };
  
  function traverse(node: DirectoryNode) {
    if (node.type === 'directory') {
      stats.directories++;
      if (node.children) {
        node.children.forEach(traverse);
      }
    } else {
      stats.files++;
      stats.totalSize += node.size || 0;
      if (node.extension) {
        stats.extensions.add(node.extension);
      }
    }
  }
  
  traverse(tree);
  return stats;
}

function getPathDescription(path: string): string {
  const descriptions: { [key: string]: string } = {
    'example/storybook-nativewind/src/components': 'Example components with demos and stories',
    'example/storybook-nativewind/src/core-components': 'Core NativeWind component implementations',
    'packages/config/src/theme': 'Theme configuration and design tokens',
    'packages/unstyled': 'Headless/unstyled component packages',
    'packages/styled': 'Styled component implementations'
  };
  
  return descriptions[path] || 'Directory contents';
}

export const schema = {
  name: "get_directory_structure",
  description: "Get the directory structure of the Gluestack UI repository or a specific path within it",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path within the Gluestack UI repository (relative to root). Leave empty for full structure."
      },
      depth: {
        type: "number",
        description: "Maximum depth to traverse (default: 3)",
        minimum: 1,
        maximum: 10
      },
      includeFiles: {
        type: "boolean",
        description: "Whether to include files in the structure (default: true)"
      }
    },
    required: []
  }
};