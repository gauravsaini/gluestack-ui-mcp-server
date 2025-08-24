interface ParsedArgs {
  gluestackPath?: string;
  logLevel?: string;
  githubToken?: string;
  help?: boolean;
}

export function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const result: ParsedArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--gluestack-path' && i + 1 < args.length) {
      result.gluestackPath = args[i + 1];
      i++;
    } else if (arg === '--log-level' && i + 1 < args.length) {
      result.logLevel = args[i + 1];
      i++;
    } else if (arg === '--github-token' && i + 1 < args.length) {
      result.githubToken = args[i + 1];
      i++;
    }
  }

  if (result.help) {
    printHelp();
    process.exit(0);
  }

  return result;
}

function printHelp() {
  console.log(`
Gluestack UI MCP Server

USAGE:
  gluestack-mcp [OPTIONS]

OPTIONS:
  --gluestack-path <path>  Path to local Gluestack UI installation
  --log-level <level>      Set logging level (debug, info, warn, error)
  --github-token <token>   GitHub personal access token for API access
  --help, -h              Show this help message

DESCRIPTION:
  A Model Context Protocol server that provides AI assistants with access to 
  Gluestack UI components, demos, and metadata.
  
  By default, uses local Gluestack UI installation. With GitHub token,
  fetches latest components directly from the Gluestack repository.

EXAMPLES:
  gluestack-mcp
  gluestack-mcp --gluestack-path /path/to/gluestack-ui
  gluestack-mcp --log-level debug
  gluestack-mcp --github-token ghp_xxxxxxxxxxxx

ENVIRONMENT VARIABLES:
  GLUESTACK_PATH     Alternative to --gluestack-path
  GITHUB_TOKEN       Alternative to --github-token
  LOG_LEVEL          Alternative to --log-level
  `);
}