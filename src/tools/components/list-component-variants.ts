import { ComponentDiscovery } from '../../utils/component-discovery.js';
import { logError } from '../../utils/logger.js';

export async function handleListComponentVariants({
  componentName
}: {
  componentName: string;
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const discovery = new ComponentDiscovery(process.env.GLUESTACK_PATH || '../gluestack-ui');
    await discovery.initialize();
    
    const variants = discovery.getComponentVariants(componentName);
    
    if (variants.length === 0) {
      const availableComponents = discovery.getComponents();
      throw new Error(`Component "${componentName}" not found. Available components: ${availableComponents.join(', ')}`);
    }

    const summary = [`# ${componentName} - Available Variants\n\n`];
    
    variants.forEach(variant => {
      summary.push(`## ${variant.variant.toUpperCase()}\n`);
      summary.push(`**Path:** \`${variant.path}\`\n`);
      
      const features = [];
      if (variant.hasDemo) features.push('✓ Demo');
      if (variant.hasStories) features.push('✓ Stories');
      if (variant.hasDocs) features.push('✓ Documentation');
      
      if (features.length > 0) {
        summary.push(`**Features:** ${features.join(', ')}\n`);
      }
      
      if (variant.metadata?.description) {
        summary.push(`**Description:** ${variant.metadata.description}\n`);
      }
      
      if (variant.metadata?.dependencies && variant.metadata.dependencies.length > 0) {
        summary.push(`**Dependencies:** ${variant.metadata.dependencies.slice(0, 3).join(', ')}${variant.metadata.dependencies.length > 3 ? '...' : ''}\n`);
      }
      
      summary.push('\n---\n\n');
    });

    // Add usage recommendation
    summary.push('## Recommended Usage\n\n');
    const nativewind = variants.find(v => v.variant === 'nativewind');
    const themed = variants.find(v => v.variant === 'themed');
    const unstyled = variants.find(v => v.variant === 'unstyled');
    
    if (nativewind) {
      summary.push('**For most projects:** Use `nativewind` variant - includes Tailwind CSS styling and examples\n');
    }
    if (themed) {
      summary.push('**For styled-system projects:** Use `themed` variant - pre-styled with Gluestack design tokens\n');
    }
    if (unstyled) {
      summary.push('**For custom styling:** Use `unstyled` variant - headless components with full styling control\n');
    }

    return {
      content: [{ type: "text", text: summary.join('') }]
    };
  } catch (error) {
    logError(`Failed to list variants for component "${componentName}"`, error);
    throw new Error(`Failed to list variants for component "${componentName}": ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const schema = {
  name: "list_component_variants",
  description: "List all available variants (nativewind, themed, unstyled) for a specific Gluestack UI component",
  inputSchema: {
    type: "object",
    properties: {
      componentName: {
        type: "string",
        description: "Name of the Gluestack UI component to list variants for (e.g., 'Button', 'Input', 'Modal')"
      }
    },
    required: ["componentName"]
  }
};