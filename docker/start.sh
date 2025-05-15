#!/bin/bash
set -e

# Set up MCP config directory
mkdir -p ~/.mcp

# Copy the MCP configuration to the right location
cat > ~/.mcp/config.json << 'EOF'
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "sequential-thinking": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sequential-thinking"
      ],
      "env": {}
    },
    "puppeteer": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-puppeteer"
      ],
      "env": {}
    },
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@executeautomation/playwright-mcp-server"
      ],
      "env": {}
    },
    "postgresql": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "${DATABASE_URL}"
      ],
      "env": {}
    },
    "brave-search": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-brave-search"
      ],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      }
    }
  }
}
EOF

# Start MCP servers in the background
echo "Starting MCP servers..."
mcp-toolkit start-all &

# Wait a moment for MCP servers to initialize
sleep 5

# Start the Flask application
echo "Starting Flask application..."
cd /app && flask run --host=0.0.0.0 --port=5000