import { readFile } from 'fs/promises';
import { join } from 'path';
import { ComponentDiscovery } from '../../utils/component-discovery.js';
import { logError, logDebug } from '../../utils/logger.js';

export async function handleGetComponentMetadata({
  componentName,
  variant = 'nativewind'
}: {
  componentName: string;
  variant?: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const discovery = new ComponentDiscovery(process.env.GLUESTACK_PATH || '../gluestack-ui');
    await discovery.initialize();
    
    const component = discovery.getComponent(componentName, variant);
    
    if (!component) {
      const availableComponents = discovery.getComponents();
      throw new Error(`Component "${componentName}" not found. Available components: ${availableComponents.join(', ')}`);
    }

    const metadata = await extractComponentMetadata(component);
    
    return {
      content: [{ 
        type: "text", 
        text: formatMetadata(component, metadata)
      }]
    };
  } catch (error) {
    logError(`Failed to get component metadata for "${componentName}"`, error);
    throw new Error(`Failed to get component metadata for "${componentName}": ${error instanceof Error ? error.message : String(error)}`);
  }
}

interface ComponentMetadata {
  name: string;
  variant: string;
  description?: string;
  props?: PropInfo[];
  dependencies?: string[];
  examples?: string[];
  hasStories: boolean;
  hasDemo: boolean;
  hasDocs: boolean;
}

interface PropInfo {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: string;
}

async function extractComponentMetadata(component: any): Promise<ComponentMetadata> {
  const metadata: ComponentMetadata = {
    name: component.name,
    variant: component.variant,
    hasStories: component.hasStories,
    hasDemo: component.hasDemo,
    hasDocs: component.hasDocs,
    description: component.metadata?.description
  };

  try {
    // Extract props from TypeScript interfaces
    const props = await extractPropsFromSource(component);
    if (props.length > 0) {
      metadata.props = props;
    }

    // Extract dependencies
    const dependencies = await extractDependencies(component);
    if (dependencies.length > 0) {
      metadata.dependencies = dependencies;
    }

    // Extract examples if available
    const examples = await extractExamples(component);
    if (examples.length > 0) {
      metadata.examples = examples;
    }
  } catch (error) {
    logDebug(`Failed to extract detailed metadata for ${component.name}`, error);
  }

  return metadata;
}

async function extractPropsFromSource(component: any): Promise<PropInfo[]> {
  try {
    let sourceContent = '';
    
    if (component.variant === 'nativewind') {
      // Try to read the component source
      const componentFile = join(component.path, `${component.name}.tsx`);
      try {
        sourceContent = await readFile(componentFile, 'utf-8');
      } catch {
        const indexFile = join(component.path, 'index.tsx');
        sourceContent = await readFile(indexFile, 'utf-8');
      }
    } else if (component.variant === 'unstyled') {
      const srcPath = join(component.path, 'src/index.tsx');
      try {
        sourceContent = await readFile(srcPath, 'utf-8');
      } catch {
        const rootIndex = join(component.path, 'index.tsx');
        sourceContent = await readFile(rootIndex, 'utf-8');
      }
    }

    return parsePropsFromTypeScript(sourceContent);
  } catch (error) {
    logDebug(`Failed to extract props from source for ${component.name}`, error);
    return [];
  }
}

function parsePropsFromTypeScript(source: string): PropInfo[] {
  const props: PropInfo[] = [];
  
  // Simple regex patterns to extract interface/type definitions
  const interfaceRegex = /interface\s+(\w+Props)\s*\{([^}]+)\}/g;
  const typeRegex = /type\s+(\w+Props)\s*=\s*\{([^}]+)\}/g;
  
  let match;
  
  // Parse interfaces
  while ((match = interfaceRegex.exec(source)) !== null) {
    const propsBody = match[2];
    if (propsBody) {
      const interfaceProps = parsePropsBody(propsBody);
      props.push(...interfaceProps);
    }
  }
  
  // Parse types
  while ((match = typeRegex.exec(source)) !== null) {
    const propsBody = match[2];
    if (propsBody) {
      const typeProps = parsePropsBody(propsBody);
      props.push(...typeProps);
    }
  }
  
  return props;
}

function parsePropsBody(propsBody: string): PropInfo[] {
  const props: PropInfo[] = [];
  const lines = propsBody.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    
    // Simple prop pattern: name?: type; or name: type;
    const propMatch = trimmed.match(/^(\w+)(\??):\s*([^;]+);?/);
    if (propMatch) {
      const [, name, optional, type] = propMatch;
      if (name && type) {
        props.push({
          name,
          type: type.trim(),
          required: !optional,
        });
      }
    }
  }
  
  return props;
}

async function extractDependencies(component: any): Promise<string[]> {
  try {
    let sourceContent = '';
    
    if (component.variant === 'unstyled') {
      // Try to read package.json for unstyled components
      const packageJsonPath = join(component.path, 'package.json');
      try {
        const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
        const deps = Object.keys(packageJson.dependencies || {});
        const peerDeps = Object.keys(packageJson.peerDependencies || {});
        return [...deps, ...peerDeps].filter(dep => dep.startsWith('@gluestack-ui') || dep.includes('react'));
      } catch {
        // Fallback to source analysis
      }
    }
    
    // Extract imports from source
    if (component.variant === 'nativewind') {
      const componentFile = join(component.path, `${component.name}.tsx`);
      try {
        sourceContent = await readFile(componentFile, 'utf-8');
      } catch {
        const indexFile = join(component.path, 'index.tsx');
        sourceContent = await readFile(indexFile, 'utf-8');
      }
    }
    
    if (sourceContent) {
      return extractImportsFromSource(sourceContent);
    }
    
    return [];
  } catch (error) {
    logDebug(`Failed to extract dependencies for ${component.name}`, error);
    return [];
  }
}

function extractImportsFromSource(source: string): string[] {
  const imports: string[] = [];
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"];?/g;
  
  let match;
  while ((match = importRegex.exec(source)) !== null) {
    const importPath = match[1];
    if (importPath && 
        (importPath.startsWith('@gluestack-ui') || 
         importPath.includes('react') || 
         importPath.startsWith('@'))) {
      imports.push(importPath);
    }
  }
  
  return [...new Set(imports)];
}

async function extractExamples(component: any): Promise<string[]> {
  const examples: string[] = [];
  
  try {
    if (component.hasStories) {
      const storiesFile = join(component.path, `${component.name}.stories.tsx`);
      const storiesContent = await readFile(storiesFile, 'utf-8');
      
      // Extract story names
      const storyRegex = /export\s+const\s+(\w+)\s*=/g;
      let match;
      while ((match = storyRegex.exec(storiesContent)) !== null) {
        if (match[1]) {
          examples.push(match[1]);
        }
      }
    }
  } catch (error) {
    logDebug(`Failed to extract examples for ${component.name}`, error);
  }
  
  return examples;
}

function formatMetadata(component: any, metadata: ComponentMetadata): string {
  const sections: string[] = [];
  
  sections.push(`# ${metadata.name} (${metadata.variant}) - Metadata\n`);
  
  if (metadata.description) {
    sections.push(`**Description:** ${metadata.description}\n`);
  }
  
  // Features
  const features: string[] = [];
  if (metadata.hasDemo) features.push('demo');
  if (metadata.hasStories) features.push('stories');  
  if (metadata.hasDocs) features.push('documentation');
  
  if (features.length > 0) {
    sections.push(`**Features:** ${features.join(', ')}\n`);
  }
  
  // Props
  if (metadata.props && metadata.props.length > 0) {
    sections.push(`\n## Props\n`);
    metadata.props.forEach(prop => {
      const required = prop.required ? '(required)' : '(optional)';
      sections.push(`- **${prop.name}** ${required}: \`${prop.type}\`\n`);
      if (prop.description) {
        sections.push(`  ${prop.description}\n`);
      }
    });
  }
  
  // Dependencies
  if (metadata.dependencies && metadata.dependencies.length > 0) {
    sections.push(`\n## Dependencies\n`);
    metadata.dependencies.forEach(dep => {
      sections.push(`- \`${dep}\`\n`);
    });
  }
  
  // Examples
  if (metadata.examples && metadata.examples.length > 0) {
    sections.push(`\n## Available Examples\n`);
    metadata.examples.forEach(example => {
      sections.push(`- ${example}\n`);
    });
  }
  
  return sections.join('');
}

export const schema = {
  name: "get_component_metadata",
  description: "Get metadata for a specific Gluestack UI component including props, dependencies, and examples",
  inputSchema: {
    type: "object",
    properties: {
      componentName: {
        type: "string",
        description: "Name of the Gluestack UI component (e.g., 'Button', 'Input', 'Modal')"
      },
      variant: {
        type: "string",
        enum: ["nativewind", "themed", "unstyled"],
        description: "Component variant to get metadata for (defaults to nativewind)"
      }
    },
    required: ["componentName"]
  }
};