import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupHandlers } from "./handler.js";
import { logError, logInfo, logWarning } from "../utils/logger.js";
import { parseArgs } from "../cli/args.js";
import { readVersion } from "./version.js";
import { createServer } from "./createServer.js";

export async function start() {
  try {
    logInfo("Starting Gluestack UI MCP Server...");

    const { gluestackPath, logLevel, githubToken } = parseArgs();

    // Set log level if provided (command line overrides env var)
    if (logLevel) {
      process.env.LOG_LEVEL = logLevel;
    }

    // Determine Gluestack path: command line > environment variable > default
    let finalGluestackPath = gluestackPath || process.env.GLUESTACK_PATH || '../gluestack-ui';
    
    if (gluestackPath) {
      logInfo(`Using Gluestack UI path from command line: ${gluestackPath}`);
    } else if (process.env.GLUESTACK_PATH) {
      logInfo(`Using Gluestack UI path from environment: ${process.env.GLUESTACK_PATH}`);
    } else {
      logWarning("No Gluestack UI path provided. Using default: ../gluestack-ui");
    }
    
    // Determine GitHub token: command line > environment variable
    let finalGithubToken = githubToken || process.env.GITHUB_TOKEN;
    let useGitHubMode = !!finalGithubToken;
    
    if (finalGithubToken) {
      if (githubToken) {
        logInfo("Using GitHub mode with token from command line");
      } else {
        logInfo("Using GitHub mode with token from environment");
      }
    } else {
      logInfo("Using local mode - accessing local Gluestack UI installation");
    }
    
    // Ensure the environment variables are set for other parts of the application
    process.env.GLUESTACK_PATH = finalGluestackPath;
    process.env.USE_GITHUB_MODE = useGitHubMode.toString();
    if (finalGithubToken) {
      process.env.GITHUB_TOKEN = finalGithubToken;
    }

    const version = await readVersion("1.0.0");
    const server = createServer(version);

    setupHandlers(server);

    const transport = new StdioServerTransport();
    logInfo("Transport initialized: stdio");

    await server.connect(transport);
    logInfo("Gluestack UI MCP Server started successfully");
  } catch (error) {
    logError("Failed to start server", error as Error);
    process.exit(1);
  }
}