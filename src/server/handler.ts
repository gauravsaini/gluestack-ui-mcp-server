import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { ComponentDiscovery } from "../utils/component-discovery.js";
import { logDebug, logError } from "../utils/logger.js";

// Import tool handlers and schemas
import { 
  handleListComponents, 
  schema as listComponentsSchema 
} from "../tools/components/list-components.js";
import { 
  handleGetComponent, 
  schema as getComponentSchema 
} from "../tools/components/get-component.js";
import { 
  handleGetComponentDemo, 
  schema as getComponentDemoSchema 
} from "../tools/components/get-component-demo.js";
import { 
  handleGetComponentMetadata, 
  schema as getComponentMetadataSchema 
} from "../tools/components/get-component-metadata.js";
import { 
  handleListComponentVariants, 
  schema as listComponentVariantsSchema 
} from "../tools/components/list-component-variants.js";
import { 
  handleGetDirectoryStructure, 
  schema as getDirectoryStructureSchema 
} from "../tools/repository/get-directory-structure.js";

export function setupHandlers(server: Server) {
  const gluestackPath = process.env.GLUESTACK_PATH || '../gluestack-ui';
  const componentDiscovery = new ComponentDiscovery(gluestackPath);

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logDebug("Received list_tools request");
    
    return {
      tools: [
        {
          name: listComponentsSchema.name,
          description: listComponentsSchema.description,
          inputSchema: listComponentsSchema.inputSchema
        },
        {
          name: getComponentSchema.name,
          description: getComponentSchema.description,
          inputSchema: getComponentSchema.inputSchema
        },
        {
          name: getComponentDemoSchema.name,
          description: getComponentDemoSchema.description,
          inputSchema: getComponentDemoSchema.inputSchema
        },
        {
          name: getComponentMetadataSchema.name,
          description: getComponentMetadataSchema.description,
          inputSchema: getComponentMetadataSchema.inputSchema
        },
        {
          name: listComponentVariantsSchema.name,
          description: listComponentVariantsSchema.description,
          inputSchema: listComponentVariantsSchema.inputSchema
        },
        {
          name: getDirectoryStructureSchema.name,
          description: getDirectoryStructureSchema.description,
          inputSchema: getDirectoryStructureSchema.inputSchema
        }
      ]
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    logDebug(`Received call_tool request: ${name}`, args);

    try {
      switch (name) {
        case "list_components":
          return await handleListComponents(componentDiscovery);

        case "get_component":
          if (!args || typeof args !== 'object') {
            throw new Error("Invalid arguments for get_component");
          }
          
          const { componentName, variant } = args as { componentName?: string; variant?: string };
          if (!componentName || typeof componentName !== 'string') {
            throw new Error("componentName is required and must be a string");
          }
          
          return await handleGetComponent({ componentName, variant });

        case "get_component_demo":
          if (!args || typeof args !== 'object') {
            throw new Error("Invalid arguments for get_component_demo");
          }
          
          const { componentName: demoComponentName, variant: demoVariant } = args as { 
            componentName?: string; 
            variant?: string 
          };
          if (!demoComponentName || typeof demoComponentName !== 'string') {
            throw new Error("componentName is required and must be a string");
          }
          
          return await handleGetComponentDemo({ 
            componentName: demoComponentName, 
            variant: demoVariant 
          });

        case "get_component_metadata":
          if (!args || typeof args !== 'object') {
            throw new Error("Invalid arguments for get_component_metadata");
          }
          
          const { componentName: metadataComponentName, variant: metadataVariant } = args as { 
            componentName?: string; 
            variant?: string 
          };
          if (!metadataComponentName || typeof metadataComponentName !== 'string') {
            throw new Error("componentName is required and must be a string");
          }
          
          return await handleGetComponentMetadata({ 
            componentName: metadataComponentName, 
            variant: metadataVariant 
          });

        case "list_component_variants":
          if (!args || typeof args !== 'object') {
            throw new Error("Invalid arguments for list_component_variants");
          }
          
          const { componentName: variantsComponentName } = args as { componentName?: string };
          if (!variantsComponentName || typeof variantsComponentName !== 'string') {
            throw new Error("componentName is required and must be a string");
          }
          
          return await handleListComponentVariants({ componentName: variantsComponentName });

        case "get_directory_structure":
          if (!args || typeof args !== 'object') {
            // Allow empty args for default behavior
            return await handleGetDirectoryStructure({});
          }
          
          const { path: dirPath, depth, includeFiles } = args as { 
            path?: string; 
            depth?: number;
            includeFiles?: boolean;
          };
          
          return await handleGetDirectoryStructure({ 
            path: dirPath, 
            depth, 
            includeFiles 
          });

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      logError(`Error handling tool call: ${name}`, error);
      throw error;
    }
  });
}