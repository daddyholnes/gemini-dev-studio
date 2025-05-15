"""
Code Execution Module for Podplay Build
Enables secure code execution within the Mama Bear environment
"""
import os
import uuid
import json
import docker
import logging
import tempfile
import subprocess
from typing import Dict, Any, Optional, List

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("code_execution")

# Supported languages with their Docker images and execution commands
SUPPORTED_LANGUAGES = {
    "python": {
        "image": "python:3.9-slim",
        "file_ext": ".py",
        "command": ["python", "{file}"]
    },
    "javascript": {
        "image": "node:16-alpine",
        "file_ext": ".js",
        "command": ["node", "{file}"]
    },
    "typescript": {
        "image": "node:16-alpine",
        "file_ext": ".ts",
        "command": ["npx", "ts-node", "{file}"]
    },
    "bash": {
        "image": "ubuntu:20.04",
        "file_ext": ".sh",
        "command": ["bash", "{file}"]
    },
    "ruby": {
        "image": "ruby:3.0-alpine",
        "file_ext": ".rb",
        "command": ["ruby", "{file}"]
    }
}

# Default Docker network settings
DEFAULT_DOCKER_NETWORK = "none"  # Isolated network

class CodeExecutionEnvironment:
    def __init__(self, use_docker: bool = True, timeout: int = 10):
        """Initialize code execution environment
        
        Args:
            use_docker: Whether to use Docker for sandboxed execution
            timeout: Maximum execution time in seconds
        """
        self.use_docker = use_docker
        self.timeout = timeout
        self.docker_client = None
        
        if self.use_docker:
            try:
                self.docker_client = docker.from_env()
                logger.info("Docker client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Docker client: {str(e)}")
                self.use_docker = False
    
    def execute_code(self, code: str, language: str = "python", 
                     args: List[str] = None, 
                     env_vars: Dict[str, str] = None) -> Dict[str, Any]:
        """Execute code in the specified language
        
        Args:
            code: Code string to execute
            language: Programming language (python, javascript, etc.)
            args: Command line arguments for the program
            env_vars: Environment variables for the execution
            
        Returns:
            Dictionary with execution results
        """
        if language not in SUPPORTED_LANGUAGES:
            return {
                "success": False,
                "error": f"Unsupported language: {language}. Supported languages: {', '.join(SUPPORTED_LANGUAGES.keys())}",
                "output": None,
                "execution_time": 0
            }
        
        # Default values
        args = args or []
        env_vars = env_vars or {}
        
        # Create unique execution ID
        execution_id = str(uuid.uuid4())
        
        # Execute using Docker if available
        if self.use_docker and self.docker_client:
            return self._docker_execute(code, language, execution_id, args, env_vars)
        else:
            return self._local_execute(code, language, execution_id, args, env_vars)
    
    def _docker_execute(self, code: str, language: str, execution_id: str, 
                        args: List[str], env_vars: Dict[str, str]) -> Dict[str, Any]:
        """Execute code in a Docker container"""
        import time
        start_time = time.time()
        
        try:
            # Get language settings
            lang_settings = SUPPORTED_LANGUAGES[language]
            image = lang_settings["image"]
            file_ext = lang_settings["file_ext"]
            command_template = lang_settings["command"]
            
            # Create temporary directory and file
            temp_dir = tempfile.mkdtemp(prefix=f"code_exec_{execution_id}_")
            file_path = os.path.join(temp_dir, f"code{file_ext}")
            
            # Write code to file
            with open(file_path, 'w') as f:
                f.write(code)
            
            # Prepare Docker volumes and command
            volumes = {temp_dir: {'bind': '/app', 'mode': 'ro'}}
            file_name = os.path.basename(file_path)
            container_file_path = f"/app/{file_name}"
            
            # Replace {file} placeholder in command with actual file path
            command = [cmd.replace("{file}", container_file_path) for cmd in command_template]
            command.extend(args)
            
            # Run Docker container
            container = self.docker_client.containers.run(
                image=image,
                command=command,
                volumes=volumes,
                environment=env_vars,
                working_dir="/app",
                network=DEFAULT_DOCKER_NETWORK,
                remove=True,
                detach=True,
                mem_limit="512m",  # Memory limit
                cpu_quota=100000,  # CPU limit (100% of one core)
                pids_limit=50      # Process limit
            )
            
            # Wait for container to complete or timeout
            try:
                container_logs = container.logs(stream=True)
                container_output = ""
                for line in container_logs:
                    container_output += line.decode('utf-8')
                    if time.time() - start_time > self.timeout:
                        container.stop(timeout=1)
                        return {
                            "success": False,
                            "error": "Execution timeout",
                            "output": container_output,
                            "execution_time": self.timeout
                        }
                
                # Check exit code
                container_info = container.wait()
                exit_code = container_info.get('StatusCode', -1)
                
                execution_time = time.time() - start_time
                
                if exit_code != 0:
                    return {
                        "success": False,
                        "error": f"Process exited with code {exit_code}",
                        "output": container_output,
                        "execution_time": execution_time
                    }
                
                return {
                    "success": True,
                    "output": container_output,
                    "execution_time": execution_time
                }
            
            except Exception as e:
                try:
                    container.stop(timeout=1)
                except:
                    pass
                
                return {
                    "success": False,
                    "error": str(e),
                    "output": "Error during execution",
                    "execution_time": time.time() - start_time
                }
            
            finally:
                # Clean up temporary directory
                try:
                    import shutil
                    shutil.rmtree(temp_dir)
                except:
                    pass
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "output": None,
                "execution_time": time.time() - start_time
            }
    
    def _local_execute(self, code: str, language: str, execution_id: str, 
                      args: List[str], env_vars: Dict[str, str]) -> Dict[str, Any]:
        """Execute code locally (fallback if Docker is not available)"""
        import time
        start_time = time.time()
        
        try:
            # Get language settings
            lang_settings = SUPPORTED_LANGUAGES[language]
            file_ext = lang_settings["file_ext"]
            command_template = lang_settings["command"]
            
            # Create temporary directory and file
            temp_dir = tempfile.mkdtemp(prefix=f"code_exec_{execution_id}_")
            file_path = os.path.join(temp_dir, f"code{file_ext}")
            
            # Write code to file
            with open(file_path, 'w') as f:
                f.write(code)
            
            # Replace {file} placeholder in command with actual file path
            command = [cmd.replace("{file}", file_path) for cmd in command_template]
            command.extend(args)
            
            # Prepare environment variables
            env = os.environ.copy()
            env.update(env_vars)
            
            # Execute command
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=temp_dir,
                env=env,
                text=True
            )
            
            # Wait for process to complete or timeout
            try:
                stdout, stderr = process.communicate(timeout=self.timeout)
                exit_code = process.returncode
                
                execution_time = time.time() - start_time
                
                if exit_code != 0:
                    return {
                        "success": False,
                        "error": stderr,
                        "output": stdout,
                        "execution_time": execution_time
                    }
                
                return {
                    "success": True,
                    "output": stdout,
                    "execution_time": execution_time
                }
            
            except subprocess.TimeoutExpired:
                process.kill()
                return {
                    "success": False,
                    "error": "Execution timeout",
                    "output": None,
                    "execution_time": self.timeout
                }
            
            finally:
                # Clean up temporary directory
                try:
                    import shutil
                    shutil.rmtree(temp_dir)
                except:
                    pass
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "output": None,
                "execution_time": time.time() - start_time
            }

# Singleton instance
_code_execution_env = None

def get_code_execution_environment() -> CodeExecutionEnvironment:
    """Get the singleton code execution environment instance"""
    global _code_execution_env
    if _code_execution_env is None:
        # Check if Docker is available, otherwise use local execution
        use_docker = True
        try:
            docker.from_env()
        except:
            use_docker = False
            logger.warning("Docker not available, using local code execution (less secure)")
        
        _code_execution_env = CodeExecutionEnvironment(use_docker=use_docker)
    
    return _code_execution_env

# Function calling API for Mama Bear to execute code
def execute_code_snippet(code: str, language: str = "python") -> Dict[str, Any]:
    """Execute a code snippet and return the result
    
    Args:
        code: The code to execute
        language: The programming language
        
    Returns:
        Dictionary with execution results
    """
    environment = get_code_execution_environment()
    return environment.execute_code(code, language)