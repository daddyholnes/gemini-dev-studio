"""
MCP Integration Module for Podplay Build
Connects to Model Context Protocol servers to extend Mama Bear's capabilities with direct
process management and full ownership of server lifecycle.
"""
import os
import json
import time
import signal
import socket
import requests
import threading
import subprocess
import logging
import platform
from pathlib import Path
from typing import Dict, List, Any, Optional, Union, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("mcp_integration")

class MCPClient:
    def __init__(self, config_path: Optional[str] = None):
        """Initialize MCP client with direct server lifecycle management"""
        self.servers = {}
        self.active_servers = {}
        self.processes = {}
        self.ports = {}
        self.status_thread = None
        self.running = False
        
        # Look in multiple locations for config, prioritizing app-specific config
        self.config_paths = [
            # App-specific config (first priority)
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', 'config', 'mcp_config.json'),
            # User's home directory (second priority)
            os.path.join(os.path.expanduser("~"), ".mcp", "config.json"),
            # Docker MCP toolkit (third priority)
            os.path.join(os.path.expanduser("~"), ".docker", "mcp-toolkit", "config.json")
        ]
        
        # Override with provided config path if given
        if config_path:
            self.config_paths.insert(0, config_path)
            
        # Create log directory for MCP servers
        self.log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs', 'mcp')
        os.makedirs(self.log_dir, exist_ok=True)
            
        # Load the configuration
        self.load_config()
        
        # Assign ports to servers
        self._assign_ports()
        
        # Start status monitoring thread
        self._start_monitoring()
    
    def load_config(self) -> None:
        """Load MCP configuration from file, trying multiple locations"""
        config_loaded = False
        
        try:
            for config_path in self.config_paths:
                try:
                    if os.path.exists(config_path):
                        with open(config_path, 'r') as f:
                            config = json.load(f)
                            
                            # Support both our custom format and standard MCP format
                            if "mcpServers" in config:
                                self.servers = config.get("mcpServers", {})
                                logger.info(f"Loaded native MCP configuration from {config_path} with {len(self.servers)} servers")
                                config_loaded = True
                                break
                            elif "providers" in config:
                                # Convert our custom format to MCP server format
                                providers = config.get("providers", {})
                                self.servers = {}
                                
                                for name, provider in providers.items():
                                    if provider.get("enabled", True):
                                        server_config = {
                                            "name": name,
                                            "enabled": True,
                                            "tools": provider.get("tools", [])
                                        }
                                        
                                        # Handle different server types
                                        if name == "brave-search":
                                            server_config["command"] = "npx"
                                            server_config["args"] = ["-y", "@modelcontextprotocol/server-brave-search"]
                                            server_config["env"] = {"BRAVE_API_KEY": os.environ.get("BRAVE_API_KEY", "")}
                                        elif name == "github":
                                            server_config["command"] = "npx"
                                            server_config["args"] = ["-y", "@modelcontextprotocol/server-github"]
                                            server_config["env"] = {"GITHUB_PERSONAL_ACCESS_TOKEN": os.environ.get("GITHUB_TOKEN", "")}
                                        elif name == "filesystem":
                                            server_config["command"] = "npx"
                                            server_config["args"] = ["-y", "@modelcontextprotocol/server-filesystem"]
                                            server_config["env"] = {}
                                        else:
                                            # Generic Node.js server template
                                            server_config["command"] = "npx"
                                            server_config["args"] = ["-y", f"@modelcontextprotocol/server-{name}"]
                                            server_config["env"] = {}
                                            
                                        self.servers[name] = server_config
                                
                                logger.info(f"Converted provider configuration from {config_path} to {len(self.servers)} MCP servers")
                                config_loaded = True
                                break
                except Exception as e:
                    logger.error(f"Error loading MCP configuration from {config_path}: {str(e)}")
            
            if not config_loaded:
                # Create default configuration with core MCP servers
                self.servers = {
                    "brave-search": {
                        "name": "brave-search",
                        "command": "npx",
                        "args": ["-y", "@modelcontextprotocol/server-brave-search"],
                        "env": {"BRAVE_API_KEY": os.environ.get("BRAVE_API_KEY", "")},
                        "enabled": True,
                        "tools": ["web_search", "local_search", "image_search"]
                    },
                    "github": {
                        "name": "github",
                        "command": "npx",
                        "args": ["-y", "@modelcontextprotocol/server-github"],
                        "env": {"GITHUB_PERSONAL_ACCESS_TOKEN": os.environ.get("GITHUB_TOKEN", "")},
                        "enabled": True,
                        "tools": ["search_code", "get_file_contents", "create_pull_request"]
                    },
                    "sequential-thinking": {
                        "name": "sequential-thinking",
                        "command": "npx",
                        "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
                        "env": {},
                        "enabled": True,
                        "tools": ["solve"]
                    }
                }
                logger.warning("No MCP configuration found. Using default configuration with basic providers.")
        except Exception as e:
            logger.error(f"Error loading MCP configuration: {str(e)}")
            
    def _assign_ports(self) -> None:
        """Assign unique ports to each MCP server"""
        base_port = 3000
        for i, server_name in enumerate(self.servers.keys()):
            port = base_port + i
            self.ports[server_name] = port
            
    def _port_in_use(self, port: int) -> bool:
        """Check if a TCP port is already in use"""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0
            
    def _start_monitoring(self) -> None:
        """Start monitoring thread for server health checks"""
        self.running = True
        self.status_thread = threading.Thread(target=self._monitor_servers, daemon=True)
        self.status_thread.start()
        
    def _monitor_servers(self) -> None:
        """Monitor the health of running MCP servers"""
        while self.running:
            for server_name, process_info in self.processes.items():
                process = process_info.get("process")
                if process and process.poll() is not None:  # Process has terminated
                    logger.warning(f"MCP server {server_name} terminated unexpectedly with code {process.returncode}")
                    self.active_servers.pop(server_name, None)
                    self.processes.pop(server_name, None)
            time.sleep(10)  # Check every 10 seconds
    
    def get_available_servers(self) -> List[str]:
        """Get list of available MCP servers"""
        return list(self.servers.keys())
    
    def get_active_servers(self) -> List[str]:
        """Get list of currently active MCP servers"""
        return list(self.active_servers.keys())
    
    def start_server(self, server_name: str) -> bool:
        """Start an MCP server if it's not already running"""
        if server_name not in self.servers:
            logger.error(f"MCP server {server_name} not found in configuration")
            return False
        
        # Check if server is already running
        if server_name in self.active_servers and server_name in self.processes:
            logger.info(f"MCP server {server_name} is already running")
            return True
        
        server = self.servers[server_name]
        port = self.ports.get(server_name, 3000 + len(self.active_servers))
        
        # Check if port is already in use
        if self._port_in_use(port):
            logger.warning(f"Port {port} for MCP server {server_name} is already in use. Finding another port...")
            # Find an available port
            for test_port in range(3000, 3100):
                if not self._port_in_use(test_port):
                    port = test_port
                    break
            else:
                logger.error(f"Could not find an available port for MCP server {server_name}")
                return False
        
        # Create command and environment
        command = server.get("command")
        args = server.get("args", [])
        env_vars = server.get("env", {})
        
        if not command:
            logger.error(f"No command found for MCP server {server_name}")
            return False
        
        # Prepare environment variables
        env = os.environ.copy()
        env["PORT"] = str(port)
        for key, value in env_vars.items():
            if value:  # Only set if there's a value
                env[key] = value
        
        # Log files
        log_file = os.path.join(self.log_dir, f"{server_name}.log")
        err_file = os.path.join(self.log_dir, f"{server_name}.err")
        
        try:
            # Start the server
            logger.info(f"Starting MCP server {server_name} on port {port}...")
            
            # Open log files
            out_f = open(log_file, 'w')
            err_f = open(err_file, 'w')
            
            # Start process
            process = subprocess.Popen(
                [command] + args,
                stdout=out_f,
                stderr=err_f,
                env=env,
                shell=True if platform.system() == "Windows" else False
            )
            
            # Store process information
            self.processes[server_name] = {
                "process": process,
                "port": port,
                "start_time": time.time(),
                "log_file": log_file,
                "err_file": err_file,
                "stdout": out_f,
                "stderr": err_f
            }
            
            # Wait for a short time to check if the process immediately fails
            time.sleep(1)
            if process.poll() is not None:
                logger.error(f"MCP server {server_name} failed to start (exit code {process.returncode})")
                out_f.close()
                err_f.close()
                return False
            
            # Store server info and URL
            self.active_servers[server_name] = {
                "url": f"http://localhost:{port}",
                "port": port,
                "running": True
            }
            
            logger.info(f"Started MCP server {server_name} on port {port}")
            return True
            
        except Exception as e:
            logger.error(f"Error starting MCP server {server_name}: {str(e)}")
            return False
    
    def stop_server(self, server_name: str) -> bool:
        """Stop a running MCP server"""
        if server_name not in self.active_servers or server_name not in self.processes:
            logger.warning(f"MCP server {server_name} is not running")
            return False
        
        process_info = self.processes[server_name]
        process = process_info.get("process")
        
        if not process:
            logger.error(f"No process found for MCP server {server_name}")
            return False
        
        try:
            # Attempt to terminate the process gracefully
            if platform.system() == "Windows":
                # Windows requires different process termination
                import ctypes
                kernel32 = ctypes.WinDLL('kernel32')
                PROCESS_TERMINATE = 1
                handle = kernel32.OpenProcess(PROCESS_TERMINATE, False, process.pid)
                kernel32.TerminateProcess(handle, 0)
                kernel32.CloseHandle(handle)
            else:
                # Unix/Linux/Mac
                process.terminate()
                
            # Wait for the process to terminate
            process.wait(timeout=5)
            
            # Close log files
            if "stdout" in process_info and process_info["stdout"]:
                process_info["stdout"].close()
            if "stderr" in process_info and process_info["stderr"]:
                process_info["stderr"].close()
            
            # Remove from active servers and processes
            self.active_servers.pop(server_name, None)
            self.processes.pop(server_name, None)
            
            logger.info(f"Stopped MCP server {server_name}")
            return True
            
        except subprocess.TimeoutExpired:
            # Force kill if graceful termination times out
            try:
                process.kill()
                logger.warning(f"Force killed MCP server {server_name}")
                return True
            except Exception as e:
                logger.error(f"Failed to force kill MCP server {server_name}: {str(e)}")
                return False
        except Exception as e:
            logger.error(f"Error stopping MCP server {server_name}: {str(e)}")
            return False
    
    def restart_server(self, server_name: str) -> bool:
        """Restart an MCP server"""
        self.stop_server(server_name)
        # Wait a moment for port to be released
        time.sleep(2)
        return self.start_server(server_name)
    
    def start_all_servers(self) -> Dict[str, bool]:
        """Start all configured MCP servers"""
        results = {}
        for server_name in self.servers.keys():
            results[server_name] = self.start_server(server_name)
        return results
    
    def stop_all_servers(self) -> Dict[str, bool]:
        """Stop all running MCP servers"""
        results = {}
        for server_name in list(self.active_servers.keys()):
            results[server_name] = self.stop_server(server_name)
        return results
    
    def get_server_status(self, server_name: str) -> Dict[str, Any]:
        """Get status of a specific MCP server"""
        if server_name not in self.servers:
            return {"exists": False, "running": False, "error": "Server not found in configuration"}
        
        server_running = server_name in self.active_servers and server_name in self.processes
        status = {
            "exists": True,
            "running": server_running,
            "configured": True
        }
        
        if server_running:
            process_info = self.processes[server_name]
            server_info = self.active_servers[server_name]
            
            # Check process health
            process = process_info.get("process")
            if process and process.poll() is not None:
                status["running"] = False
                status["exit_code"] = process.returncode
            else:
                status["url"] = server_info.get("url")
                status["port"] = server_info.get("port")
                status["uptime"] = time.time() - process_info.get("start_time", time.time())
        
        return status
    
    def get_all_server_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all MCP servers"""
        status = {}
        for server_name in self.servers.keys():
            status[server_name] = self.get_server_status(server_name)
        return status
    
    def call_tool(self, server_name: str, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Call a tool on a specific MCP server"""
        # Make sure server is running
        if server_name not in self.active_servers:
            if not self.start_server(server_name):
                return {"error": f"Failed to start MCP server {server_name}"}
        
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
        # Look for app-specific config first
        app_config = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config', 'mcp_config.json')
        _mcp_client = MCPClient(app_config if os.path.exists(app_config) else None)
    return _mcp_client