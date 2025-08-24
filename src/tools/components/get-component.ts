import { ComponentDiscovery } from '../../utils/component-discovery.js';
import { logError } from '../../utils/logger.js';

export async function handleGetComponent({
  componentName,
  variant
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

    // Use the new getComponentContent method that handles both local and GitHub modes
    const sourceCode = await discovery.getComponentContent(componentName, variant, 'source');
    
    if (!sourceCode) {
      throw new Error(`Source code not found for component "${componentName}" (${component.variant})`);
    }
    
    const sourceMode = discovery.getSourceMode();
    const modeLabel = sourceMode === 'github' ? '📦 GitHub' : '💻 Local';
    
    return {
      content: [{ 
        type: "text", 
        text: `# ${component.name} (${component.variant}) ${modeLabel}\n\n\`\`\`tsx\n${sourceCode}\n\`\`\`` 
      }]
    };
  } catch (error) {
    logError(`Failed to get component "${componentName}"`, error);
    throw new Error(`Failed to get component "${componentName}": ${error instanceof Error ? error.message : String(error)}`);
  }
}


export const schema = {
  name: "get_component",
  description: "Get the source code for a specific Gluestack UI component",
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
        description: "Component variant to retrieve (defaults to nativewind if available)"
      }
    },
    required: ["componentName"]
  }
};