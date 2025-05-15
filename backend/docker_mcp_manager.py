"""
Docker MCP Manager for Podplay Build

This module provides Docker container management for MCP servers in the Podplay Build sanctuary.
"""

import os
import json
import subprocess
import logging
import requests
import time
from pathlib import Path

# Configure logging
logger = logging.getLogger('docker_mcp_manager')

class DockerMCPManager:
    """Manages Docker-based MCP servers for Podplay Build"""
    
    def __init__(self, config_path=None):
        """Initialize the Docker MCP Manager
        
        Args:
            config_path (str, optional): Path to the MCP configuration file
        """
        self.docker_servers = {}
        self.active_servers = set()
        
        # Load configuration
        self.config = self._load_config(config_path)
        
        # Initialize Docker servers from config
        self._init_docker_servers()
        
    def _load_config(self, config_path=None):
        """Load MCP configuration from file
        
        Args:
            config_path (str, optional): Path to MCP configuration file
        
        Returns:
            dict: Configuration data
        """
        if not config_path:
            # Try default locations
            possible_paths = [
                os.path.join(os.path.dirname(__file__), 'config', 'mcp_config.json'),
                os.path.join(os.path.dirname(os.path.dirname(__file__)), 'mcp_config.json'),
                os.path.abspath('mcp_config.json')
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    config_path = path
                    break
        
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading MCP configuration: {e}")
                
        # Return empty config if file not found or error
        return {'mcps': []}
        
    def _init_docker_servers(self):
        """Initialize Docker server configurations from the loaded config"""
        for mcp in self.config.get('mcps', []):
            if mcp.get('type') == 'docker' and mcp.get('enabled', True):
                server_name = mcp.get('name')
                self.docker_servers[server_name] = {
                    'name': server_name,
                    'image': mcp.get('image'),
                    'port': mcp.get('port', 8811),
                    'api_key': mcp.get('api_key')
                }
                
                # Check if server is already running
                if self.check_server_running(server_name):
                    self.active_servers.add(server_name)
    
    def get_all_servers(self):
        """Get list of all configured Docker MCP servers
        
        Returns:
            list: List of server configurations
        """
        return list(self.docker_servers.values())
    
    def get_active_servers(self):
        """Get list of active Docker MCP servers
        
        Returns:
            list: List of active server names
        """
        # Refresh status first
        self.refresh_status()
        return list(self.active_servers)
    
    def refresh_status(self):
        """Refresh status of all Docker MCP servers
        
        Returns:
            list: Updated server status list
        """
        self.active_servers.clear()
        
        for server_name in self.docker_servers:
            if self.check_server_running(server_name):
                self.active_servers.add(server_name)
                
        return self.get_all_servers()
    
    def check_server_running(self, server_name):
        """Check if a Docker MCP server is running
        
        Args:
            server_name (str): Name of the server
            
        Returns:
            bool: True if running, False otherwise
        """
        try:
            container_name = f"podplay-mcp-{server_name}"
            cmd = ["docker", "ps", "-q", "-f", f"name={container_name}"]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            # If output is not empty, container is running
            return bool(result.stdout.strip())
        except Exception as e:
            logger.error(f"Error checking Docker container status: {e}")
            return False
    
    def start_server(self, server_name):
        """Start a Docker MCP server
        
        Args:
            server_name (str): Name of the server
            
        Returns:
            dict: Result of the operation
        """
        # Check if server exists in configuration
        if server_name not in self.docker_servers:
            return {'success': False, 'error': f'Docker MCP server {server_name} not found in configuration'}
            
        # Check if already running
        if self.check_server_running(server_name):
            return {'success': True, 'message': f'Docker MCP server {server_name} is already running'}
            
        # Get server config
        server_config = self.docker_servers[server_name]
        image = server_config['image']
        port = server_config['port']
        api_key = server_config.get('api_key')
        
        # Start container
        try:
            container_name = f"podplay-mcp-{server_name}"
            
            # Build command
            cmd = [
                "docker", "run",
                "-d",  # Detached mode
                "--name", container_name,
                "-p", f"{port}:{port}"
            ]
            
            # Add API key if needed
            if api_key:
                cmd.extend(["-e", f"API_KEY={api_key}"])
                
            # Add image
            cmd.append(image)
            
            # Run command
            logger.info(f"Starting Docker MCP server: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                self.active_servers.add(server_name)
                return {'success': True, 'message': f'Docker MCP server {server_name} started successfully'}
            else:
                return {'success': False, 'error': f'Failed to start Docker MCP server: {result.stderr}'}
        except Exception as e:
            logger.error(f"Error starting Docker MCP server: {e}")
            return {'success': False, 'error': str(e)}
    
    def stop_server(self, server_name):
        """Stop a Docker MCP server
        
        Args:
            server_name (str): Name of the server
            
        Returns:
            dict: Result of the operation
        """
        # Check if server exists in configuration
        if server_name not in self.docker_servers:
            return {'success': False, 'error': f'Docker MCP server {server_name} not found in configuration'}
            
        # Check if running
        if not self.check_server_running(server_name):
            return {'success': True, 'message': f'Docker MCP server {server_name} is not running'}
            
        # Stop container
        try:
            container_name = f"podplay-mcp-{server_name}"
            
            # Stop container
            stop_cmd = ["docker", "stop", container_name]
            logger.info(f"Stopping Docker MCP server: {' '.join(stop_cmd)}")
            stop_result = subprocess.run(stop_cmd, capture_output=True, text=True)
            
            # Remove container
            rm_cmd = ["docker", "rm", container_name]
            logger.info(f"Removing Docker MCP server container: {' '.join(rm_cmd)}")
            rm_result = subprocess.run(rm_cmd, capture_output=True, text=True)
            
            if stop_result.returncode == 0:
                self.active_servers.discard(server_name)
                return {'success': True, 'message': f'Docker MCP server {server_name} stopped successfully'}
            else:
                return {'success': False, 'error': f'Failed to stop Docker MCP server: {stop_result.stderr}'}
        except Exception as e:
            logger.error(f"Error stopping Docker MCP server: {e}")
            return {'success': False, 'error': str(e)}
    
    def send_query(self, server_name, query, params=None):
        """Send a query to a Docker MCP server
        
        Args:
            server_name (str): Name of the server
            query (str): Query to send
            params (dict, optional): Query parameters
            
        Returns:
            dict: Result of the query
        """
        if params is None:
            params = {}
            
        # Check if server exists in configuration
        if server_name not in self.docker_servers:
            return {'success': False, 'error': f'Docker MCP server {server_name} not found in configuration'}
            
        # Get server config
        server_config = self.docker_servers[server_name]
        port = server_config['port']
        
        # Ensure server is running
        if not self.check_server_running(server_name):
            start_result = self.start_server(server_name)
            if not start_result['success']:
                return {'success': False, 'error': f'Failed to start Docker MCP server: {start_result["error"]}'}
            
            # Wait for container to start
            time.sleep(2)
            
        # Send query
        try:
            url = f"http://localhost:{port}/api/query"
            headers = {'Content-Type': 'application/json'}
            data = {
                'query': query,
                'params': params
            }
            
            logger.info(f"Sending query to Docker MCP server {server_name}: {query}")
            response = requests.post(url, json=data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                return {'success': True, 'result': response.json()}
            else:
                return {'success': False, 'error': f'Error from Docker MCP server: {response.status_code}'}
        except Exception as e:
            logger.error(f"Error sending query to Docker MCP server: {e}")
            return {'success': False, 'error': str(e)}

# Create singleton instance
docker_mcp_manager = DockerMCPManager()
