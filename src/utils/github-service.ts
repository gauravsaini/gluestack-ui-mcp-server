import { Axios } from "axios";
import { logError, logWarning, logInfo, logDebug } from './logger.js';

// Constants for the Gluestack UI repository structure
const REPO_OWNER = 'gluestack';
const REPO_NAME = 'gluestack-ui';
const REPO_BRANCH = 'main';

// GitHub API for accessing repository structure and metadata
const githubApi = new Axios({
    baseURL: "https://api.github.com",
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/vnd.github+json",
        "User-Agent": "Mozilla/5.0 (compatible; GluestackUiMcpServer/1.0.0)",
        ...(process.env.GITHUB_TOKEN && {
            "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`
        })
    },
    timeout: 30000,
    transformResponse: [(data) => {
        try {
            return JSON.parse(data);
        } catch {
            return data;
        }
    }],
});

// GitHub Raw for directly fetching file contents
const githubRaw = new Axios({
    baseURL: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}`,
    headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GluestackUiMcpServer/1.0.0)",
    },
    timeout: 30000,
    transformResponse: [(data) => data], // Return raw data
});

/**
 * Fetch component source code from Gluestack UI repository
 * @param componentName Name of the component
 * @param variant Component variant (nativewind, themed, unstyled)
 * @returns Promise with component source code
 */
async function getComponentSource(componentName: string, variant: string = 'nativewind'): Promise<string> {
    const componentPaths = getComponentPaths(componentName, variant);
    
    for (const componentPath of componentPaths) {
        try {
            const response = await githubRaw.get(`/${componentPath}`);
            if (response.status === 200) {
                return response.data;
            }
        } catch (error) {
            logDebug(`Component not found at ${componentPath}`);
            continue;
        }
    }
    
    throw new Error(`Component "${componentName}" not found for variant "${variant}"`);
}

/**
 * Fetch component demo/example from Gluestack UI repository
 * @param componentName Name of the component
 * @returns Promise with component demo code
 */
async function getComponentDemo(componentName: string): Promise<string> {
    const demoPaths = [
        `example/storybook-nativewind/src/components/${componentName.toLowerCase()}/${componentName}.stories.tsx`,
        `example/storybook-nativewind/src/components/${componentName.toLowerCase()}/${componentName}.tsx`,
        `example/storybook-nativewind/src/components/${componentName.toLowerCase()}/index.tsx`,
    ];
    
    for (const demoPath of demoPaths) {
        try {
            const response = await githubRaw.get(`/${demoPath}`);
            if (response.status === 200) {
                return response.data;
            }
        } catch (error) {
            logDebug(`Demo not found at ${demoPath}`);
            continue;
        }
    }
    
    throw new Error(`Demo for component "${componentName}" not found`);
}

/**
 * Get component paths based on variant
 */
function getComponentPaths(componentName: string, variant: string): string[] {
    const lowerName = componentName.toLowerCase();
    
    switch (variant) {
        case 'nativewind':
            return [
                `example/storybook-nativewind/src/core-components/nativewind/${lowerName}/index.tsx`,
                `example/storybook-nativewind/src/components/${lowerName}/index.tsx`,
                `example/storybook-nativewind/src/components/${lowerName}/${componentName}.tsx`,
            ];
        case 'themed':
            return [
                `packages/themed/src/components/${componentName}/index.tsx`,
                `packages/themed/src/${componentName}/index.ts`,
            ];
        case 'unstyled':
            return [
                `packages/unstyled/${componentName}/src/index.tsx`,
                `packages/unstyled/${componentName}/src/${componentName}.tsx`,
            ];
        default:
            return [];
    }
}

/**
 * Fetch all available components from the repository
 * @returns Promise with list of component names
 */
async function getAvailableComponents(): Promise<string[]> {
    try {
        const componentSet = new Set<string>();
        
        // Discovery paths for different variants
        const discoveryPaths = [
            'example/storybook-nativewind/src/components',
            'example/storybook-nativewind/src/core-components/nativewind',
            'packages/themed/src/components',
            'packages/unstyled'
        ];

        for (const path of discoveryPaths) {
            try {
                const response = await githubApi.get(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`);
                
                if (!response.data || !Array.isArray(response.data)) {
                    continue;
                }
                
                const components = response.data
                    .filter((item: any) => item.type === 'dir' && !item.name.startsWith('.'))
                    .map((item: any) => kebabToPascalCase(item.name));
                    
                components.forEach((comp: string) => componentSet.add(comp));
            } catch (error) {
                logDebug(`Failed to scan ${path}`, error);
            }
        }
        
        if (componentSet.size === 0) {
            logWarning('No components found, using fallback list');
            return getFallbackComponents();
        }
        
        return Array.from(componentSet).sort();
    } catch (error: any) {
        logError('Error fetching components from GitHub API', error);
        
        // Check for specific error types
        if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.message || 'Unknown error';
            
            if (status === 403 && message.includes('rate limit')) {
                throw new Error(`GitHub API rate limit exceeded. Please set GITHUB_TOKEN environment variable. Error: ${message}`);
            } else if (status === 404) {
                throw new Error(`Components directory not found in the repository.`);
            } else if (status === 401) {
                throw new Error(`Authentication failed. Please check your GITHUB_TOKEN.`);
            } else {
                throw new Error(`GitHub API error (${status}): ${message}`);
            }
        }
        
        logWarning('Using fallback component list due to API issues');
        return getFallbackComponents();
    }
}

/**
 * Fallback list of known Gluestack UI components
 */
function getFallbackComponents(): string[] {
    return [
        'Accordion',
        'ActionSheet',
        'Alert',
        'AlertDialog',
        'Avatar',
        'Badge',
        'Box',
        'Button',
        'Card',
        'Center',
        'Checkbox',
        'Divider',
        'Fab',
        'FormControl',
        'HStack',
        'Heading',
        'Image',
        'Input',
        'Link',
        'Menu',
        'Modal',
        'Popover',
        'Progress',
        'Radio',
        'Select',
        'Skeleton',
        'Slider',
        'Spinner',
        'Stack',
        'Switch',
        'Text',
        'Textarea',
        'Toast',
        'Tooltip',
        'VStack'
    ];
}

/**
 * Get component metadata (simplified)
 * @param componentName Name of the component
 * @returns Promise with component metadata
 */
async function getComponentMetadata(componentName: string): Promise<any> {
    try {
        // For now, return basic metadata since Gluestack doesn't have a registry file like shadcn
        return {
            name: componentName,
            description: `${componentName} component from Gluestack UI`,
            variants: ['nativewind', 'themed', 'unstyled'],
            repository: `${REPO_OWNER}/${REPO_NAME}`,
            dependencies: [],
        };
    } catch (error) {
        logError(`Error getting metadata for ${componentName}`, error);
        return null;
    }
}

/**
 * Build directory tree structure from GitHub repository
 * @param path Path within the repository
 * @returns Promise resolving to directory tree structure
 */
async function buildDirectoryTree(path: string = ''): Promise<any> {
    try {
        const response = await githubApi.get(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${REPO_BRANCH}`);
        
        if (!response.data) {
            throw new Error('No data received from GitHub API');
        }

        const contents = response.data;
        
        if (!Array.isArray(contents)) {
            if (contents.message) {
                const message: string = contents.message;
                if (message.includes('rate limit exceeded')) {
                    throw new Error(`GitHub API rate limit exceeded. ${message}`);
                } else if (message.includes('Not Found')) {
                    throw new Error(`Path not found: ${path}`);
                } else {
                    throw new Error(`GitHub API error: ${message}`);
                }
            }
            
            if (contents.type === 'file') {
                return {
                    path: contents.path,
                    type: 'file',
                    name: contents.name,
                    url: contents.download_url,
                    sha: contents.sha,
                };
            }
        }
        
        const result: Record<string, any> = {
            path,
            type: 'directory',
            children: {},
        };

        for (const item of contents) {
            if (item.type === 'file') {
                result.children[item.name] = {
                    path: item.path,
                    type: 'file',
                    name: item.name,
                    url: item.download_url,
                    sha: item.sha,
                };
            } else if (item.type === 'dir') {
                if (path.split('/').length < 6) { // Limit depth
                    try {
                        const subTree = await buildDirectoryTree(item.path);
                        result.children[item.name] = subTree;
                    } catch (error) {
                        logWarning(`Failed to fetch subdirectory ${item.path}`);
                        result.children[item.name] = {
                            path: item.path,
                            type: 'directory',
                            error: 'Failed to fetch contents'
                        };
                    }
                }
            }
        }

        return result;
    } catch (error: any) {
        logError(`Error building directory tree for ${path}`, error);
        throw error;
    }
}

/**
 * Convert kebab-case to PascalCase
 */
function kebabToPascalCase(str: string): string {
    return str
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

/**
 * Get current GitHub API rate limit status
 */
async function getGitHubRateLimit(): Promise<any> {
    try {
        const response = await githubApi.get('/rate_limit');
        return response.data;
    } catch (error: any) {
        throw new Error(`Failed to get rate limit info: ${error.message}`);
    }
}

export const github = {
    githubRaw,
    githubApi,
    getComponentSource,
    getComponentDemo,
    getAvailableComponents,
    getComponentMetadata,
    buildDirectoryTree,
    getGitHubRateLimit,
    // Constants for easy access
    constants: {
        REPO_OWNER,
        REPO_NAME,
        REPO_BRANCH,
    }
};