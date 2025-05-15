"""
MCP Toolkit Bridge for Podplay Build

This module bridges the Flask backend with the JavaScript MCP Toolkit implementation.
It provides a seamless interface for managing MCP servers and executing tools.
"""

import os
import json
import subprocess
import logging
from pathlib import Path
import platform
import threading
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('mcp_toolkit_bridge')

class MCPToolkitBridge:
    """Bridge between Python backend and JavaScript MCP Toolkit"""
    
    def __init__(self, mcp_dir=None):
        """
        Initialize the MCP Toolkit Bridge
        
        Args:
            mcp_dir (str, optional): Path to the MCP toolkit directory.
                If None, will use the default location.
        """
        self.root_dir = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.mcp_dir = Path(mcp_dir) if mcp_dir else self.root_dir / 'mcp'
        
        logger.info(f"MCP Toolkit Bridge initialized with directory: {self.mcp_dir}")
        
        # Check if the directory exists
        if not self.mcp_dir.exists():
            logger.warning(f"MCP directory does not exist: {self.mcp_dir}")
            try:
                self.mcp_dir.mkdir(parents=True, exist_ok=True)
                logger.info(f"Created MCP directory: {self.mcp_dir}")
            except Exception as e:
                logger.error(f"Failed to create MCP directory: {e}")
        
        # Server status cache to avoid excessive subprocess calls
        self._status_cache = {}
        self._cache_timestamp = 0
        self._cache_lock = threading.Lock()
        
        # Create environment with all variables from current environment
        self.env = os.environ.copy()
    
    def _run_js_command(self, script, args=None, input_data=None, capture_output=True):
        """
        Run a JavaScript command using Node.js
        
        Args:
            script (str): Name of the script to run (e.g., 'status.js')
            args (list, optional): Command line arguments to pass to the script
            input_data (str, optional): Data to pass to the script's standard input
            capture_output (bool, optional): Whether to capture the command output
            
        Returns:
            dict: Result of the command execution with stdout, stderr, and return code
        """
        # Prepare command
        command = ['node']
        
        # Add full path to script
        script_path = self.mcp_dir / script
        command.append(str(script_path))
        
        # Add any additional arguments
        if args:
            command.extend(args)
        
        logger.info(f"Running MCP command: {' '.join(command)}")
        
        try:
            # Run the process
            process = subprocess.run(
                command,
                cwd=str(self.mcp_dir),
                input=input_data.encode('utf-8') if input_data else None,
                capture_output=capture_output,
                text=True,
                env=self.env
            )
            
            # Process the result
            result = {
                'returncode': process.returncode,
                'stdout': process.stdout if capture_output else None,
                'stderr': process.stderr if capture_output else None,
                'success': process.returncode == 0
            }
            
            # Log results
            if process.returncode != 0:
                logger.error(f"MCP command failed: {process.stderr}")
            else:
                logger.info(f"MCP command completed successfully")
                
            return result
            
        except Exception as e:
            logger.error(f"Error running MCP command: {e}")
            return {
                'returncode': -1,
                'stdout': None,
                'stderr': str(e),
                'success': False,
                'error': str(e)
            }
    
    def _run_custom_node_script(self, script_content, args=None, capture_output=True):
        """
        Run a custom Node.js script by creating a temporary file
        
        Args:
            script_content (str): JavaScript code to execute
            args (list, optional): Command line arguments
            capture_output (bool, optional): Whether to capture the command output
            
        Returns:
            dict: Result of the script execution
        """
        import tempfile
        
        # Create a temporary JS file
        with tempfile.NamedTemporaryFile(suffix='.js', dir=self.mcp_dir, delete=False) as temp_file:
            temp_path = temp_file.name
            temp_file.write(script_content.encode('utf-8'))
        
        try:
            # Run the script
            command = ['node', os.path.basename(temp_path)]
            if args:
                command.extend(args)
                
            result = self._run_js_command(os.path.basename(temp_path), capture_output=capture_output)
            
            return result
        finally:
            # Clean up the temporary file
            try:
                os.unlink(temp_path)
            except Exception as e:
                logger.warning(f"Failed to delete temporary script: {e}")
    
    def get_server_status(self, refresh=False):
        """
        Get the status of all MCP servers
        
        Args:
            refresh (bool, optional): Force a refresh of the status cache
            
        Returns:
            dict: Status of all servers
        """
        with self._cache_lock:
            current_time = time.time()
            
            # Use cached data if it's fresh (less than 5 seconds old)
            if not refresh and current_time - self._cache_timestamp < 5 and self._status_cache:
                return self._status_cache
        
        # Run the JavaScript status script
        result = self._run_js_command('status.js')
        
        if result['success']:
            try:
                # Try to extract JSON from the output
                # Find the first { and the last } in the output
                stdout = result['stdout']
                start_idx = stdout.find('{')
                end_idx = stdout.rfind('}') + 1
                
                if start_idx >= 0 and end_idx > start_idx:
                    json_str = stdout[start_idx:end_idx]
                    status_data = json.loads(json_str)
                    
                    with self._cache_lock:
                        self._status_cache = status_data
                        self._cache_timestamp = time.time()
                        
                    return status_data
                else:
                    # Custom parsing logic for when JSON extraction fails
                    status_data = self._parse_status_output(stdout)
                    
                    with self._cache_lock:
                        self._status_cache = status_data
                        self._cache_timestamp = time.time()
                        
                    return status_data
            except Exception as e:
                logger.error(f"Error parsing server status: {e}")
                
                # Fallback to direct method if parsing fails
                js_code = """
                import { getServerStatus } from './index.js';
                console.log(JSON.stringify(getServerStatus(), null, 2));
                """
                
                direct_result = self._run_custom_node_script(js_code)
                
                if direct_result['success']:
                    try:
                        direct_status = json.loads(direct_result['stdout'])
                        
                        with self._cache_lock:
                            self._status_cache = direct_status
                            self._cache_timestamp = time.time()
                            
                        return direct_status
                    except Exception as e2:
                        logger.error(f"Error parsing direct server status: {e2}")
        
        # Default response if all else fails
        return {}
    
    def _parse_status_output(self, stdout):
        """
        Parse the status output for cases where JSON extraction fails
        
        Args:
            stdout (str): Status command output
            
        Returns:
            dict: Parsed server status
        """
        status_data = {}
        
        # Simple parsing logic for server names and running status
        import re
        
        # Look for server names and status
        server_matches = re.findall(r'✓|✗\s+([a-zA-Z0-9_-]+).+Status:\s+(Running|Stopped)', stdout)
        
        for match in server_matches:
            server_name = match[0].strip()
            status = match[1].strip()
            
            status_data[server_name] = {
                'running': status == 'Running',
                'health': 'healthy' if status == 'Running' else 'unknown'
            }
            
            # Look for port information
            port_match = re.search(f"{server_name}.+Port:\\s+(\\d+)", stdout)
            if port_match:
                status_data[server_name]['port'] = int(port_match.group(1))
        
        return status_data
    
    def start_server(self, server_name):
        """
        Start a specific MCP server
        
        Args:
            server_name (str): Name of the server to start
            
        Returns:
            bool: True if the server was started successfully
        """
        js_code = f"""
        import {{ startServer }} from './index.js';
        
        async function main() {{
            try {{
                const result = await startServer('{server_name}');
                console.log(JSON.stringify({{ success: true, result }}));
            }} catch (error) {{
                console.error(JSON.stringify({{ success: false, error: error.message }}));
            }}
        }}
        
        main();
        """
        
        result = self._run_custom_node_script(js_code)
        
        if result['success']:
            try:
                response = json.loads(result['stdout'])
                return response.get('success', False)
            except Exception as e:
                logger.error(f"Error parsing start server response: {e}")
        
        return False
    
    def stop_server(self, server_name):
        """
        Stop a specific MCP server
        
        Args:
            server_name (str): Name of the server to stop
            
        Returns:
            bool: True if the server was stopped successfully
        """
        js_code = f"""
        import {{ stopServer }} from './index.js';
        
        async function main() {{
            try {{
                const result = await stopServer('{server_name}');
                console.log(JSON.stringify({{ success: true, result }}));
            }} catch (error) {{
                console.error(JSON.stringify({{ success: false, error: error.message }}));
            }}
        }}
        
        main();
        """
        
        result = self._run_custom_node_script(js_code)
        
        if result['success']:
            try:
                response = json.loads(result['stdout'])
                return response.get('success', False)
            except Exception as e:
                logger.error(f"Error parsing stop server response: {e}")
        
        return False
    
    def start_all_servers(self):
        """
        Start all MCP servers
        
        Returns:
            dict: Results of starting each server
        """
        result = self._run_js_command('start-all.js')
        
        # Force a status refresh
        status = self.get_server_status(refresh=True)
        
        # Convert status to start results format
        results = {}
        for server_name, server_status in status.items():
            results[server_name] = server_status.get('running', False)
            
        return results
    
    def stop_all_servers(self):
        """
        Stop all running MCP servers
        
        Returns:
            dict: Results of stopping each server
        """
        # Get current status to know which servers are running
        before_status = self.get_server_status()
        running_servers = {name for name, status in before_status.items() if status.get('running', False)}
        
        # Stop all servers
        result = self._run_js_command('stop-all.js')
        
        # Force a status refresh
        after_status = self.get_server_status(refresh=True)
        
        # Check which servers were successfully stopped
        results = {}
        for server_name in running_servers:
            results[server_name] = not after_status.get(server_name, {}).get('running', False)
            
        return results
    
    def call_tool(self, server_name, tool_name, params=None):
        """
        Call a tool on a specific MCP server
        
        Args:
            server_name (str): Name of the server
            tool_name (str): Name of the tool to call
            params (dict, optional): Parameters for the tool
            
        Returns:
            dict: Result of the tool call
        """
        if params is None:
            params = {}
        
        # Check if this is a Docker-based MCP server
        if server_name.startswith('docker-'):
            return self._call_docker_mcp_tool(server_name, tool_name, params)
            
        js_code = f"""
        import {{ callTool }} from './index.js';
        
        async function main() {{
            try {{
                const params = {json.dumps(params)};
                const result = await callTool('{server_name}', '{tool_name}', params);
                console.log(JSON.stringify({{ success: true, result }}));
            }} catch (error) {{
                console.error(JSON.stringify({{ success: false, error: error.message }}));
            }}
        }}
        
        main();
        """
        
        result = self._run_custom_node_script(js_code)
        
        if result['success']:
            try:
                response = json.loads(result['stdout'])
                if response.get('success', False):
                    return response.get('result', {})
                else:
                    logger.error(f"Tool call failed: {response.get('error', 'Unknown error')}")
                    return {'error': response.get('error', 'Unknown error')}
            except Exception as e:
                logger.error(f"Error parsing tool call response: {e}")
                return {'error': str(e)}
        else:
            logger.error(f"Tool call command failed: {result.get('stderr', 'Unknown error')}")
            return {'error': result.get('stderr', 'Unknown error')}
    
    def _get_docker_container_config(self, server_name):
        """
        Get Docker container configuration for a server
        
        Args:
            server_name (str): Name of the Docker MCP server
            
        Returns:
            dict: Container configuration
        """
        # This would typically come from a config file
        # For now, we'll use some hardcoded defaults and a simple mapping
        docker_configs = {
            'docker-brave': {
                'image': 'docker/mcp/brave-search',
                'port': 8811
            },
            'docker-filesystem': {
                'image': 'docker/mcp/filesystem',
                'port': 8812
            },
            'docker-github': {
                'image': 'docker/mcp/github',
                'port': 8813
            },
            'docker-time': {
                'image': 'docker/mcp/time',
                'port': 8814
            }
        }
        
        return docker_configs.get(server_name, {'image': 'alpine/socat', 'port': 8811})
    
    def _check_docker_container_running(self, container_name):
        """
        Check if a Docker container is running
        
        Args:
            container_name (str): Name of the container
            
        Returns:
            bool: True if container is running, False otherwise
        """
        try:
            import subprocess
            
            result = subprocess.run(
                ['docker', 'ps', '--filter', f'name={container_name}', '--format', '{{.Names}}'],
                capture_output=True,
                text=True
            )
            
            return container_name in result.stdout
        except Exception as e:
            logger.error(f"Error checking Docker container status: {e}")
            return False
    
    def _start_docker_container(self, container_name, image, host_port):
        """
        Start a Docker container for an MCP server
        
        Args:
            container_name (str): Name for the container
            image (str): Docker image to use
            host_port (int): Port to expose on the host
            
        Returns:
            bool: True if container started successfully, False otherwise
        """
        try:
            import subprocess
            
            # Remove any existing container with the same name
            subprocess.run(['docker', 'rm', '-f', container_name], capture_output=True)
            
            # Start the container
            result = subprocess.run(
                [
                    'docker', 'run', '-d', '--name', container_name,
                    '-p', f'{host_port}:8811',
                    image, 'STDIO', 'TCP:0.0.0.0:8811'
                ],
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                logger.error(f"Failed to start Docker container: {result.stderr}")
                return False
                
            logger.info(f"Started Docker container {container_name} with image {image} on port {host_port}")
            return True
        except Exception as e:
            logger.error(f"Error starting Docker container: {e}")
            return False

# Singleton instance of the MCP Toolkit Bridge
_mcp_bridge_instance = None

def get_mcp_bridge():
    """
    Get the singleton instance of the MCP Toolkit Bridge
    
    Returns:
        MCPToolkitBridge: The singleton instance
    """
    global _mcp_bridge_instance
    
    if _mcp_bridge_instance is None:
        _mcp_bridge_instance = MCPToolkitBridge()
        
    return _mcp_bridge_instance