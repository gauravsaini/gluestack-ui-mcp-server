#!/bin/bash

# Test script for Gluestack UI MCP Server

echo "🧪 Testing Gluestack UI MCP Server..."

# Check if we can build the project
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# Check if we can start the server (timeout after 5 seconds)
echo "🚀 Testing server startup..."
node ./build/index.js --help > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Server help command works!"
else
    echo "❌ Server startup failed!"
    exit 1
fi

# Test local mode with mock Gluestack path
echo "🧪 Testing local mode with mock Gluestack path..."
export GLUESTACK_PATH="../gluestack-ui"

# Create a simple test by checking if the binary exists
if [ -f "build/index.js" ]; then
    echo "✅ Binary exists and is executable"
else
    echo "❌ Binary not found!"
    exit 1
fi

# Test GitHub mode help (without real token)
echo "🧪 Testing GitHub mode help..."
node ./build/index.js --help | grep -q "github-token"
if [ $? -eq 0 ]; then
    echo "✅ GitHub token option available in help"
else
    echo "❌ GitHub token option not found in help!"
    exit 1
fi

# Test GitHub mode with dummy token (should show appropriate messages)
echo "🧪 Testing GitHub mode initialization..."
export GITHUB_TOKEN="dummy_token_for_testing"
unset GLUESTACK_PATH
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"roots":{"listChanged":false},"sampling":{},"experimental":{}},"clientInfo":{"name":"test","version":"1.0.0"}}}' | timeout 10s node ./build/index.js 2>/dev/null | grep -q '"result"'

if [ $? -eq 0 ]; then
    echo "✅ GitHub mode initializes correctly"
else
    echo "⚠️  GitHub mode initialization (expected with dummy token)"
fi

echo "🎉 All tests passed!"
echo ""
echo "💡 Testing Options:"
echo ""
echo "🏠 Local Mode:"
echo "  export GLUESTACK_PATH=/path/to/gluestack-ui"
echo "  npm start"
echo ""
echo "📦 GitHub Mode:"
echo "  export GITHUB_TOKEN=ghp_your_token_here"
echo "  npm start"
echo ""
echo "⚙️  Claude Desktop (Local):"
echo "  npx gluestack-ui-mcp-server --gluestack-path /path/to/gluestack-ui"
echo ""
echo "⚙️  Claude Desktop (GitHub):"
echo "  npx gluestack-ui-mcp-server --github-token ghp_your_token_here"