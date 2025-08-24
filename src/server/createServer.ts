import { Server } from "@modelcontextprotocol/sdk/server/index.js";

export function createServer(version: string): Server {
  const server = new Server(
    {
      name: "gluestack-ui-mcp-server",
      version: version,
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  return server;
}