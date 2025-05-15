# Model Context Protocol (MCP) Toolkit

## Overview

The Model Context Protocol (MCP) Toolkit is a powerful framework that extends Mama Bear's capabilities in your Podplay Build sanctuary. It allows the AI to interact with external tools, services, and data sources through a standardized protocol, giving her the ability to perform complex actions beyond simple conversation.

## Core Concepts

### MCP Servers

MCP servers are service endpoints that provide specialized functionality to Mama Bear. These can be:

1. **Native MCP Servers**: Integrated directly into the Podplay Build environment
2. **Docker MCP Servers**: Run in isolated Docker containers for enhanced capabilities

Each server provides a set of tools that Mama Bear can use to perform specific tasks, such as file operations, web searches, code execution, and more.

### MCP Tools

Tools are specific capabilities exposed by MCP servers. Each tool:
- Has a defined input/output schema
- Performs a specific function
- Is accessed through a standardized protocol

### MCP Configuration

The MCP toolkit configuration defines:
- Available servers and their endpoints
- Tool definitions and capabilities
- Connection parameters and authorization details

## Available MCP Servers

### 1. Filesystem MCP Server

Provides file system operations for Mama Bear, allowing her to create, read, update, and delete files within your sanctuary.

**Key Tools**:
- `create_directory`: Create a new directory
- `read_file`: Read the contents of a file
- `write_file`: Write content to a file
- `list_directory`: List the contents of a directory
- `search_files`: Find files matching specific patterns

**Example Usage**:
```javascript
// In the MCP dashboard
// Reading a file example
const result = await mcp.callTool('filesystem', 'read_file', {
  path: '/path/to/your/file.txt'
});
console.log(result);
```

### 2. Brave Search MCP Server

Provides web search capabilities using the Brave Search API, allowing Mama Bear to search the internet for information.

**Key Tools**:
- `web_search`: Perform a web search and retrieve results
- `local_search`: Search for local businesses and places

**Example Usage**:
```javascript
// In the MCP dashboard
// Web search example
const results = await mcp.callTool('brave-search', 'web_search', {
  query: 'latest AI developments',
  count: 5
});
```

### 3. GitHub MCP Server

Enables interaction with GitHub repositories, allowing Mama Bear to manage code, issues, and pull requests.

**Key Tools**:
- `search_code`: Search for code across repositories
- `search_repositories`: Find GitHub repositories
- `create_issue`: Create a new issue in a repository
- `create_pull_request`: Create a pull request
- `get_file_contents`: Retrieve file contents from a repository

**Example Usage**:
```javascript
// In the MCP dashboard
// Get file contents example
const fileContent = await mcp.callTool('github', 'get_file_contents', {
  owner: 'username',
  repo: 'repository-name',
  path: 'path/to/file.js'
});
```

### 4. Memory MCP Server

Provides a knowledge graph for storing and retrieving contextual information, helping Mama Bear maintain a coherent understanding of your project.

**Key Tools**:
- `create_entities`: Add new entities to the knowledge graph
- `create_relations`: Create relationships between entities
- `search_nodes`: Find information in the knowledge graph
- `read_graph`: Retrieve the entire knowledge graph

**Example Usage**:
```javascript
// In the MCP dashboard
// Create an entity example
const result = await mcp.callTool('memory', 'create_entities', {
  entities: [{
    name: 'User Interface Component',
    entityType: 'Component',
    observations: ['Responsible for user interaction', 'Built with vanilla JS']
  }]
});
```

## Docker MCP Integration

The Docker MCP integration allows running MCP servers in isolated containers, providing:

1. **Isolation**: Each server runs in its own container, preventing conflicts
2. **Scalability**: Easy to add or remove servers as needed
3. **Resource Management**: Control resource allocation for each server
4. **Security**: Enhanced security through container isolation

### Docker MCP Server Management

Podplay Build provides a comprehensive management interface for Docker MCP servers:

1. **Server Status**: View the status of all Docker MCP servers
2. **Start/Stop Servers**: Easily start or stop individual servers
3. **Server Logs**: View logs from Docker containers
4. **Configuration**: Manage server configurations

## MCP Dashboard

The MCP Dashboard provides a graphical interface for interacting with MCP servers and tools:

1. **Server Status Display**: View the status of all MCP servers
2. **Tool Exploration**: Browse available tools and their documentation
3. **Interactive Console**: Execute MCP tool calls directly
4. **Result Visualization**: View and analyze results from tool calls

### Accessing the MCP Dashboard

1. Click the "MCP" button in the top toolbar of your Podplay Build sanctuary
2. The dashboard will open, showing all available MCP servers
3. Select a server to view its available tools
4. Use the interactive console to execute tool calls

## MCP Configuration File

The MCP configuration is stored in a JSON file at `backend/config/mcp_config.json`. This file defines:

```json
{
  "mcps": [
    {
      "name": "filesystem",
      "type": "native",
      "enabled": true,
      "url": "http://localhost:8811",
      "api_key": ""
    },
    {
      "name": "brave-search",
      "type": "native",
      "enabled": true,
      "url": "http://localhost:8812",
      "api_key": "${BRAVE_API_KEY}"
    },
    {
      "name": "docker-brave",
      "type": "docker",
      "enabled": true,
      "image": "mcp/brave-search:latest",
      "port": 8821,
      "api_key": "${BRAVE_API_KEY}"
    }
    // Additional servers...
  ]
}
```

## Extending MCP Capabilities

You can extend Mama Bear's capabilities by adding new MCP servers or enhancing existing ones:

### Adding a New Native MCP Server

1. Define the server in the MCP configuration file
2. Implement the server using the MCP SDK
3. Register the server with the MCP toolkit

### Creating a Custom Docker MCP Server

1. Create a Dockerfile for your MCP server
2. Build and push the Docker image
3. Add the server configuration to the MCP config file
4. Start the server using the Docker MCP manager

## Best Practices

1. **Resource Management**: Only start Docker MCP servers when needed
2. **API Key Security**: Use environment variables for API keys
3. **Error Handling**: Implement robust error handling for MCP tool calls
4. **Timeout Management**: Set appropriate timeouts for long-running operations
5. **Logging**: Enable logging for debugging MCP server issues

## Troubleshooting

### Common Issues

1. **Docker Container Fails to Start**
   - Check Docker is running
   - Verify the Docker image exists
   - Review container logs: `docker logs podplay-mcp-{server_name}`

2. **MCP Tool Call Fails**
   - Check server status in the dashboard
   - Verify tool parameters are correct
   - Check API keys are properly configured
   - Review server logs for errors

3. **Performance Issues**
   - Limit the number of active Docker containers
   - Assign appropriate resources to containers
   - Close unused MCP servers

### Getting Help

For detailed help with MCP toolkit issues:
1. Check the logs in the terminal
2. Review the MCP documentation
3. Ask Mama Bear for assistance with debugging

## Related Documentation

- [Architecture Overview](./architecture.md)
- [Docker Integration](./docker_integration.md)
- [Security Considerations](./security.md)
- [Development Guide](./development.md)
