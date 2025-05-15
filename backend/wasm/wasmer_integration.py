"""
WebAssembly Runtime Integration for Podplay Build
Uses Wasmer to provide secure code execution capabilities
"""
import os
import json
import logging
import tempfile
import subprocess
from typing import Dict, Any, Optional, Union

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("wasm_integration")

class WasmerRuntime:
    """Wasmer WebAssembly runtime integration for secure code execution"""
    
    def __init__(self):
        """Initialize the Wasmer runtime"""
        self.initialized = False
        self.wasmer_path = None
        self.runtime_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "runtime")
        
        # Create runtime directory if it doesn't exist
        if not os.path.exists(self.runtime_path):
            try:
                os.makedirs(self.runtime_path)
                logger.info(f"Created Wasmer runtime directory at {self.runtime_path}")
            except Exception as e:
                logger.error(f"Failed to create runtime directory: {str(e)}")
                return
        
        # Check if Wasmer is installed
        self._check_wasmer_installation()
    
    def _check_wasmer_installation(self) -> bool:
        """Check if Wasmer is installed and available"""
        try:
            # First check in PATH
            result = subprocess.run(
                ["wasmer", "--version"], 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE,
                shell=True
            )
            
            if result.returncode == 0:
                self.wasmer_path = "wasmer"
                self.initialized = True
                logger.info(f"Found Wasmer in PATH: {result.stdout.decode().strip()}")
                return True
            
            # Check if Wasmer is installed in user's home directory
            home_wasmer = os.path.join(os.path.expanduser("~"), ".wasmer", "bin", "wasmer")
            if os.path.exists(home_wasmer):
                self.wasmer_path = home_wasmer
                self.initialized = True
                logger.info(f"Found Wasmer in home directory: {home_wasmer}")
                return True
                
            logger.warning("Wasmer not found. Code execution capabilities will be limited.")
            return False
            
        except Exception as e:
            logger.error(f"Error checking Wasmer installation: {str(e)}")
            return False
    
    def install_wasmer(self) -> bool:
        """Install Wasmer if not already installed"""
        if self.initialized:
            logger.info("Wasmer is already installed and initialized.")
            return True
            
        try:
            logger.info("Installing Wasmer...")
            
            # Use the appropriate installation command based on OS
            if os.name == "posix":  # Linux/Mac
                install_cmd = "curl https://get.wasmer.io -sSf | sh"
            else:  # Windows
                install_cmd = "iwr https://win.wasmer.io -useb | iex"
                
            result = subprocess.run(
                install_cmd,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            if result.returncode == 0:
                logger.info("Wasmer installed successfully.")
                return self._check_wasmer_installation()
            else:
                logger.error(f"Failed to install Wasmer: {result.stderr.decode()}")
                return False
                
        except Exception as e:
            logger.error(f"Error installing Wasmer: {str(e)}")
            return False
    
    def execute_python(self, code: str, timeout: int = 10) -> Dict[str, Any]:
        """Execute Python code in a secure Wasmer environment"""
        if not self.initialized:
            return {"error": "WebAssembly runtime not initialized. Please install Wasmer first."}
            
        try:
            # Create a temporary Python file
            with tempfile.NamedTemporaryFile(suffix='.py', mode='w', delete=False) as tmp:
                tmp.write(code)
                tmp_path = tmp.name
                
            # Execute with wasmer-python (which should be installed separately)
            result = subprocess.run(
                [self.wasmer_path, "python", tmp_path],
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=timeout
            )
            
            # Clean up temporary file
            os.unlink(tmp_path)
            
            if result.returncode == 0:
                return {
                    "success": True,
                    "output": result.stdout.decode(),
                    "error": None
                }
            else:
                return {
                    "success": False,
                    "output": result.stdout.decode(),
                    "error": result.stderr.decode()
                }
                
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "output": "",
                "error": f"Execution timed out after {timeout} seconds."
            }
        except Exception as e:
            return {
                "success": False,
                "output": "",
                "error": str(e)
            }
    
    def execute_javascript(self, code: str, timeout: int = 10) -> Dict[str, Any]:
        """Execute JavaScript code in a secure Wasmer environment"""
        if not self.initialized:
            return {"error": "WebAssembly runtime not initialized. Please install Wasmer first."}
            
        try:
            # Create a temporary JavaScript file
            with tempfile.NamedTemporaryFile(suffix='.js', mode='w', delete=False) as tmp:
                tmp.write(code)
                tmp_path = tmp.name
                
            # Execute with wasmer running quickjs
            result = subprocess.run(
                [self.wasmer_path, "run", "--dir=.", "quickjs", "--", tmp_path],
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=timeout
            )
            
            # Clean up temporary file
            os.unlink(tmp_path)
            
            if result.returncode == 0:
                return {
                    "success": True,
                    "output": result.stdout.decode(),
                    "error": None
                }
            else:
                return {
                    "success": False,
                    "output": result.stdout.decode(),
                    "error": result.stderr.decode()
                }
                
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "output": "",
                "error": f"Execution timed out after {timeout} seconds."
            }
        except Exception as e:
            return {
                "success": False,
                "output": "",
                "error": str(e)
            }

# Singleton instance
_wasmer_runtime = None

def get_wasmer_runtime() -> WasmerRuntime:
    """Get the singleton Wasmer runtime instance"""
    global _wasmer_runtime
    if _wasmer_runtime is None:
        _wasmer_runtime = WasmerRuntime()
    return _wasmer_runtime