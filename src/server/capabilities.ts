import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ServerCapabilities
} from "@modelcontextprotocol/sdk/types.js";

export const SERVER_CAPABILITIES: ServerCapabilities = {};

export const SUPPORTED_TOOL_SCHEMAS = [
  ListToolsRequestSchema,
  CallToolRequestSchema
];