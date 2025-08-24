import { ComponentDiscovery } from '../../utils/component-discovery.js';
import { logError } from '../../utils/logger.js';

export async function handleListComponents(
  discovery: ComponentDiscovery
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    await discovery.initialize();
    
    const components = discovery.getComponents();
    const allComponents = discovery.getAllComponents();
    
    // Group components by variant
    const componentsByVariant: Record<string, string[]> = {};
    allComponents.forEach(comp => {
      if (!componentsByVariant[comp.variant]) {
        componentsByVariant[comp.variant] = [];
      }
      componentsByVariant[comp.variant]!.push(comp.name);
    });

    // Create summary
    const summary = [
      `# Gluestack UI Components (${components.length} total)\n`,
      `Available components: ${components.join(', ')}\n\n`,
      '## Component Variants:\n'
    ];

    Object.entries(componentsByVariant).forEach(([variant, names]) => {
      summary.push(`**${variant.toUpperCase()}** (${names.length}): ${[...new Set(names)].sort().join(', ')}\n`);
    });

    summary.push('\n## Component Details:\n');
    
    components.forEach(name => {
      const variants = discovery.getComponentVariants(name);
      summary.push(`### ${name}\n`);
      variants.forEach(variant => {
        const features = [];
        if (variant.hasDemo) features.push('demo');
        if (variant.hasStories) features.push('stories');
        if (variant.hasDocs) features.push('docs');
        
        summary.push(`- **${variant.variant}**: ${features.length > 0 ? features.join(', ') : 'basic'}\n`);
      });
      summary.push('\n');
    });

    return {
      content: [{ type: "text", text: summary.join('') }]
    };
  } catch (error) {
    logError("Failed to list components", error);
    throw new Error(`Failed to list components: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const schema = {
  name: "list_components",
  description: "List all available Gluestack UI components with their variants and features",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  }
};