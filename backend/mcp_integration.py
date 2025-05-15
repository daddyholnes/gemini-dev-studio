"""
MCP Integration Module for Podplay Build
Connects to Model Context Protocol servers to extend Mama Bear's capabilities
"""
import os
import json
import requests
import subprocess
import logging
from typing import Dict, List, Any, Optional, Union

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("mcp_integration")

class MCPClient:
    def __init__(self, config_path: Optional[str] = None):
        """Initialize MCP client with optional configuration file path"""
        self.servers = {}
        self.active_servers = {}
        self.config_path = config_path or os.path.join(os.path.expanduser("~"), ".mcp", "config.json")
        self.load_config()
    
    def load_config(self) -> None:
        """Load MCP configuration from file"""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    config = json.load(f)
                    self.servers = config.get("mcpServers", {})
                    logger.info(f"Loaded MCP configuration with {len(self.servers)} servers")
            else:
                # Try to find Docker MCP Toolkit configuration
                docker_mcp_path = os.path.join(os.path.expanduser("~"), ".docker", "mcp-toolkit", "config.json")
                if os.path.exists(docker_mcp_path):
                    with open(docker_mcp_path, 'r') as f:
                        config = json.load(f)
                        self.servers = config.get("mcpServers", {})
                        logger.info(f"Loaded Docker MCP configuration with {len(self.servers)} servers")
                else:
                    logger.warning("No MCP configuration found. Using default empty configuration.")
        except Exception as e:
            logger.error(f"Error loading MCP configuration: {str(e)}")
    
    def get_available_servers(self) -> List[str]:
        """Get list of available MCP servers"""
        return list(self.servers.keys())
    
    def start_server(self, server_name: str) -> bool:
        """Start an MCP server by name"""
        if server_name not in self.servers:
            logger.error(f"Server {server_name} not found in configuration")
            return False
        
        if server_name in self.active_servers:
            logger.info(f"Server {server_name} is already running")
            return True
        
        try:
            server_config = self.servers[server_name]
            command = server_config.get("command", "npx")
            args = server_config.get("args", [])
            env = {**os.environ, **server_config.get("env", {})}
            
            # Start server process
            process = subprocess.Popen(
                [command] + args,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Store process
            self.active_servers[server_name] = {
                "process": process,
                "config": server_config,
                "port": self._get_server_port(process)
            }
            
            logger.info(f"Started MCP server: {server_name}")
            return True
        
        except Exception as e:
            logger.error(f"Error starting MCP server {server_name}: {str(e)}")
            return False
    
    def _get_server_port(self, process) -> Optional[int]:
        """Extract port from server output"""
        # Wait for server to output port information (timeout after 10 seconds)
        import time
        start_time = time.time()
        
        while time.time() - start_time < 10:
            output = process.stdout.readline()
            if "Server running on port" in output:
                try:
                    return int(output.split("port")[1].strip())
                except:
                    pass
            time.sleep(0.1)
        
        return None
    
    def stop_server(self, server_name: str) -> bool:
        """Stop a running MCP server"""
        if server_name not in self.active_servers:
            logger.warning(f"Server {server_name} is not running")
            return False
        
        try:
            server = self.active_servers[server_name]
            process = server["process"]
            process.terminate()
            process.wait(timeout=5)
            
            del self.active_servers[server_name]
            logger.info(f"Stopped MCP server: {server_name}")
            return True
        
        except Exception as e:
            logger.error(f"Error stopping MCP server {server_name}: {str(e)}")
            return False
    
    def stop_all_servers(self) -> None:
        """Stop all running MCP servers"""
        for server_name in list(self.active_servers.keys()):
            self.stop_server(server_name)
    
    def call_tool(self, server_name: str, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Call a tool on an MCP server"""
        if server_name not in self.active_servers:
            if not self.start_server(server_name):
                return {"error": f"Could not start MCP server: {server_name}"}
        
        server = self.active_servers[server_name]
        port = server.get("port")
        
        if not port:
            return {"error": f"MCP server {server_name} is not properly initialized"}
        
        try:
            url = f"http://localhost:{port}/tool"
            payload = {
                "method": tool_name,
                "params": params
            }
            
            response = requests.post(url, json=payload)
            return response.json()
        
        except Exception as e:
            logger.error(f"Error calling MCP tool {tool_name} on server {server_name}: {str(e)}")
            return {"error": str(e)}

    def github_search(self, query: str, type: str = "code") -> Dict[str, Any]:
        """Search GitHub using the GitHub MCP server"""
        return self.call_tool("github", "searchCode", {
            "query": query,
            "per_page": 10
        })
    
    def web_search(self, query: str) -> Dict[str, Any]:
        """Perform web search using the Puppeteer MCP server"""
        return self.call_tool("puppeteer", "search", {
            "query": query
        })
    
    def sequential_thinking(self, problem: str) -> Dict[str, Any]:
        """Use sequential thinking to solve a complex problem"""
        return self.call_tool("sequential-thinking", "solve", {
            "problem": problem,
            "steps": 5  # Number of thinking steps
        })
    
    def run_code(self, code: str, language: str = "python") -> Dict[str, Any]:
        """Run code snippet in a secure environment"""
        # This would normally use a specialized MCP server for code execution
        # For now, we'll use a placeholder
        return {
            "result": f"Code execution for {language} is not yet implemented"
        }

# Singleton instance
_mcp_client = None

def get_mcp_client() -> MCPClient:
    """Get the singleton MCP client instance"""
    global _mcp_client
    if _mcp_client is None:
        _mcp_client = MCPClient()
    return _mcp_client