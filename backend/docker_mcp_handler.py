"""
Docker MCP Handler

A simplified handler for Docker-based MCP servers in Podplay Build.
This module works with the existing Flask routes to provide Docker container management.
"""

import os
import subprocess
import logging
import json
import time
import requests

# Configure logging
logger = logging.getLogger(__name__)

class DockerMCPHandler:
    """Handler for Docker MCP servers"""
    
    def __init__(self, config=None):
        """Initialize Docker MCP Handler
        
        Args:
            config (dict): MCP configuration
        """
        self.config = config or {}
        self.docker_servers = {}
        self.active_containers = set()
        self.docker_available = self._check_docker_available()
        
        if not self.docker_available:
            logger.warning("Docker is not available. Docker MCP functionality will be limited.")
        else:
            logger.info("Docker is available. Initializing Docker MCP servers.")
            # Initialize Docker servers from config
            self._init_servers()
            
    def _check_docker_available(self):
        """Check if Docker is available on the system
        
        Returns:
            bool: True if Docker is available, False otherwise
        """
        try:
            # Simple command to check Docker availability
            result = subprocess.run(["docker", "--version"], 
                                   capture_output=True, 
                                   text=True, 
                                   check=False)
            
            is_available = result.returncode == 0
            
            if is_available:
                logger.info("Docker is available on this system.")
            else:
                logger.warning("Docker is NOT available on this system. Docker commands will fail.")
                if result.stderr:
                    logger.warning(f"Docker error: {result.stderr}")
            
            return is_available
        except FileNotFoundError:
            logger.warning("Docker command not found in PATH. Please install Docker to use Docker MCP features.")
            return False
        except Exception as e:
            logger.error(f"Error checking Docker availability: {e}")
            return False
        
    def _init_servers(self):
        """Initialize Docker servers from config"""
        for mcp in self.config.get('mcps', []):
            if mcp.get('type') == 'docker' and mcp.get('enabled', True):
                server_name = mcp.get('name')
                self.docker_servers[server_name] = {
                    'name': server_name,
                    'image': mcp.get('image'),
                    'port': mcp.get('port', 8811),
                    'api_key': mcp.get('api_key')
                }
                
                # Check if container is running
                if self.is_container_running(server_name):
                    self.active_containers.add(server_name)
    
    def get_server_status(self):
        """Get status of all Docker MCP servers
        
        Returns:
            list: List of server status objects
        """
        # Refresh container status
        self._refresh_status()
        
        result = []
        for name, config in self.docker_servers.items():
            result.append({
                'name': name,
                'image': config.get('image'),
                'running': name in self.active_containers
            })
            
        return result
    
    def _refresh_status(self):
        """Refresh container status for all servers"""
        self.active_containers.clear()
        
        for name in self.docker_servers:
            if self.is_container_running(name):
                self.active_containers.add(name)
    
    def is_container_running(self, server_name):
        """Check if a Docker container is running
        
        Args:
            server_name (str): Name of the server
            
        Returns:
            bool: True if running, False otherwise
        """
        if server_name not in self.docker_servers:
            return False
            
        try:
            container_name = f"podplay-mcp-{server_name}"
            cmd = ["docker", "ps", "-q", "-f", f"name={container_name}"]
            
            result = subprocess.run(cmd, capture_output=True, text=True, check=False)
            
            # If output is not empty, container is running
            return bool(result.stdout.strip())
        except Exception as e:
            logger.error(f"Error checking Docker container status: {e}")
            return False
    
    def start_container(self, server_name):
        """Start a Docker container
        
        Args:
            server_name (str): Name of the server
            
        Returns:
            bool: True if successful, False otherwise
        """
        # Check if Docker is available
        if not self.docker_available:
            logger.error("Docker is not available on this system")
            return False
            
        if server_name not in self.docker_servers:
            logger.error(f"Docker MCP server {server_name} not found in configuration")
            return False
            
        if self.is_container_running(server_name):
            logger.info(f"Docker container {server_name} is already running")
            return True
            
        try:
            config = self.docker_servers[server_name]
            container_name = f"podplay-mcp-{server_name}"
            
            # Check if container exists but is stopped
            try:
                # First try to remove any existing container with this name
                subprocess.run(["docker", "rm", container_name], 
                              capture_output=True, text=True, check=False)
            except Exception:
                # Ignore errors if container doesn't exist
                pass
                
            # Ensure the image exists
            if not config.get('image'):
                logger.error(f"Docker image not specified for {server_name}")
                return False
            
            # Build Docker command
            cmd = [
                "docker", "run",
                "-d",  # Detached mode
                "--name", container_name,
                "-p", f"{config.get('port', 8811)}:{config.get('port', 8811)}"
            ]
            
            # Add API key if present
            if config.get('api_key'):
                cmd.extend(["-e", f"API_KEY={config['api_key']}"])
                
            # Add image
            cmd.append(config['image'])
            
            # Run command
            logger.info(f"Starting Docker container for {server_name}: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, check=False)
            
            if result.returncode == 0:
                self.active_containers.add(server_name)
                logger.info(f"Docker container {server_name} started successfully")
                return True
            else:
                logger.error(f"Error starting Docker container: {result.stderr}")
                return False
        except Exception as e:
            logger.error(f"Exception starting Docker container: {e}")
            return False
    
    def stop_container(self, server_name):
        """Stop a Docker container
        
        Args:
            server_name (str): Name of the server
            
        Returns:
            bool: True if successful, False otherwise
        """
        # Check if Docker is available
        if not self.docker_available:
            logger.error("Docker is not available on this system")
            return False
            
        if server_name not in self.docker_servers:
            logger.error(f"Docker MCP server {server_name} not found in configuration")
            return False
            
        if not self.is_container_running(server_name):
            logger.info(f"Docker container {server_name} is not running")
            return True
            
        try:
            container_name = f"podplay-mcp-{server_name}"
            
            # Stop container
            logger.info(f"Stopping Docker container: {container_name}")
            stop_cmd = ["docker", "stop", container_name]
            stop_result = subprocess.run(stop_cmd, capture_output=True, text=True, check=False)
            
            # Remove container
            logger.info(f"Removing Docker container: {container_name}")
            rm_cmd = ["docker", "rm", container_name]
            rm_result = subprocess.run(rm_cmd, capture_output=True, text=True, check=False)
            
            # Consider success if either the stop worked or if the container doesn't exist
            if stop_result.returncode == 0 or 'No such container' in stop_result.stderr:
                self.active_containers.discard(server_name)
                logger.info(f"Docker container {server_name} stopped successfully")
                return True
            else:
                logger.error(f"Error stopping Docker container: {stop_result.stderr}")
                return False
        except Exception as e:
            logger.error(f"Exception stopping Docker container: {e}")
            return False
    
    def send_query(self, server_name, query, params=None):
        """Send a query to a Docker MCP server
        
        Args:
            server_name (str): Name of the server
            query (str): Query to send
            params (dict, optional): Query parameters
            
        Returns:
            dict: Query result
        """
        if params is None:
            params = {}
            
        if server_name not in self.docker_servers:
            return {'error': f'Docker MCP server {server_name} not found in configuration'}
            
        # Ensure container is running
        if not self.is_container_running(server_name):
            success = self.start_container(server_name)
            if not success:
                return {'error': 'Failed to start Docker container'}
                
            # Wait for container to start up
            time.sleep(2)
            
        # Send query to container
        try:
            config = self.docker_servers[server_name]
            url = f"http://localhost:{config['port']}/api/query"
            
            data = {
                'query': query,
                'params': params
            }
            
            response = requests.post(url, json=data, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                return {'error': f'Error from Docker MCP server: {response.status_code}'}
        except Exception as e:
            logger.error(f"Error querying Docker MCP server: {e}")
            return {'error': str(e)}

# Don't create an instance at the module level anymore
# Instead, app.py will create its own instance using the DockerMCPHandler class
