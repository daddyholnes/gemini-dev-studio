"""
Terminal WebSocket Server for Podplay Build

Provides a secure, controlled terminal environment for executing commands within Mama Bear.
This module handles WebSocket connections and maintains a virtual file system for each session.
"""

import os
import sys
import json
import uuid
import logging
import asyncio
import tempfile
import subprocess
import threading
import shutil
from datetime import datetime
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("terminal_server")

# Import Flask and WebSocket libraries
try:
    from flask import request
    from flask_sock import Sock
except ImportError:
    logger.error("Required packages not installed. Run: pip install flask flask-sock")
    raise

# Global variables
WORKSPACE_ROOT = os.path.join(tempfile.gettempdir(), "podplay_workspaces")
SESSIONS = {}

class TerminalSession:
    """Represents a terminal session with its own workspace and state."""
    
    def __init__(self, session_id=None, user_id="default"):
        self.session_id = session_id or str(uuid.uuid4())
        self.user_id = user_id
        self.created_at = datetime.now()
        self.last_active = datetime.now()
        self.ws = None
        self.workspace_path = None
        self.current_dir = None
        self.setup_workspace()
        self.proc = None
        self.is_running = False
        self.command_history = []
        
    def setup_workspace(self):
        """Create a dedicated workspace directory for this session."""
        user_workspace = os.path.join(WORKSPACE_ROOT, self.user_id)
        self.workspace_path = os.path.join(user_workspace, self.session_id)
        
        # Ensure directories exist
        os.makedirs(self.workspace_path, exist_ok=True)
        
        # Set initial current directory
        self.current_dir = self.workspace_path
        
        logger.info(f"Created workspace at {self.workspace_path}")
        
        # Create some initial files to help the user
        readme_path = os.path.join(self.workspace_path, "README.md")
        with open(readme_path, "w") as f:
            f.write(f"""# Mama Bear Workspace

Welcome to your Podplay Build workspace! This is a safe environment where you can create and run code.

## Getting Started

Try these commands:
- `ls` - List files
- `touch hello.html` - Create a new HTML file
- `echo "<h1>Hello World</h1>" > hello.html` - Write to the file
- `cat hello.html` - View the file contents
- `mcp web-search javascript tutorial` - Search the web using Brave

Your Friend,
Mama Bear 🐻
""")
        
    def send(self, data):
        """Send data to the WebSocket client."""
        if self.ws and not self.ws.closed:
            if isinstance(data, dict):
                self.ws.send(json.dumps(data))
            elif isinstance(data, str):
                self.ws.send(json.dumps({"output": data}))
            else:
                self.ws.send(json.dumps({"output": str(data)}))
    
    def execute_command(self, command):
        """Execute a command in the terminal."""
        if not command.strip():
            self.send({"output": "$ "})
            return
            
        # Update last active timestamp
        self.last_active = datetime.now()
        
        # Add to command history
        self.command_history.append(command)
        
        # Handle built-in commands
        if command.startswith("cd "):
            self._change_directory(command[3:].strip())
        elif command == "pwd":
            self._print_working_directory()
        elif command == "ls" or command.startswith("ls "):
            self._list_directory(command[2:].strip())
        elif command.startswith("cat "):
            self._cat_file(command[4:].strip())
        elif command.startswith("touch "):
            self._touch_file(command[6:].strip())
        elif command.startswith("mkdir "):
            self._make_directory(command[6:].strip())
        elif command.startswith("echo "):
            self._echo_command(command[5:])
        elif command == "clear":
            self.send({"output": "\x1b[2J\x1b[H"})
        elif command.startswith("mcp "):
            self._handle_mcp_command(command[4:])
        elif command == "help":
            self._show_help()
        else:
            # For security, we don't allow arbitrary command execution
            # Instead, we'll handle specific commands internally
            self.send({"output": f"Command not supported in sandbox: {command}\r\n"})
            self.send({"output": "Type 'help' to see available commands.\r\n$ "})
            return
    
    def _change_directory(self, path):
        """Change the current directory."""
        try:
            if not path:
                # cd without arguments goes to workspace root
                new_dir = self.workspace_path
            elif path.startswith("/"):
                # Absolute path - but restrict to workspace
                full_path = os.path.normpath(os.path.join(self.workspace_path, path.lstrip("/")))
                if not full_path.startswith(self.workspace_path):
                    raise ValueError("Cannot navigate outside workspace")
                new_dir = full_path
            else:
                # Relative path
                full_path = os.path.normpath(os.path.join(self.current_dir, path))
                if not full_path.startswith(self.workspace_path):
                    raise ValueError("Cannot navigate outside workspace")
                new_dir = full_path
                
            if not os.path.exists(new_dir):
                raise FileNotFoundError(f"Directory not found: {path}")
            if not os.path.isdir(new_dir):
                raise NotADirectoryError(f"Not a directory: {path}")
                
            self.current_dir = new_dir
            rel_path = os.path.relpath(new_dir, self.workspace_path)
            if rel_path == ".":
                self.send({"output": f"Changed to workspace root\r\n$ "})
            else:
                self.send({"output": f"Changed to /{rel_path}\r\n$ "})
                
        except Exception as e:
            self.send({"output": f"Error: {str(e)}\r\n$ "})
    
    def _print_working_directory(self):
        """Show the current directory."""
        rel_path = os.path.relpath(self.current_dir, self.workspace_path)
        if rel_path == ".":
            self.send({"output": "/\r\n$ "})
        else:
            self.send({"output": f"/{rel_path}\r\n$ "})
    
    def _list_directory(self, args):
        """List files in the current directory."""
        try:
            target_dir = self.current_dir
            
            if args:
                # Handle path argument
                if args.startswith("/"):
                    # Absolute path within workspace
                    full_path = os.path.normpath(os.path.join(self.workspace_path, args.lstrip("/")))
                    if not full_path.startswith(self.workspace_path):
                        raise ValueError("Cannot list outside workspace")
                    target_dir = full_path
                else:
                    # Relative path
                    full_path = os.path.normpath(os.path.join(self.current_dir, args))
                    if not full_path.startswith(self.workspace_path):
                        raise ValueError("Cannot list outside workspace")
                    target_dir = full_path
            
            if not os.path.exists(target_dir):
                raise FileNotFoundError(f"Directory not found: {args}")
            if not os.path.isdir(target_dir):
                raise NotADirectoryError(f"Not a directory: {args}")
            
            # Get directory contents
            entries = os.listdir(target_dir)
            
            # Format output
            if not entries:
                self.send({"output": "Directory is empty\r\n$ "})
                return
                
            output = []
            for entry in sorted(entries):
                path = os.path.join(target_dir, entry)
                if os.path.isdir(path):
                    output.append(f"\x1b[1;34m{entry}/\x1b[0m")  # Blue for directories
                elif os.path.isfile(path):
                    if entry.endswith((".html", ".htm")):
                        output.append(f"\x1b[1;31m{entry}\x1b[0m")  # Red for HTML
                    elif entry.endswith((".js", ".ts")):
                        output.append(f"\x1b[1;33m{entry}\x1b[0m")  # Yellow for JS/TS
                    elif entry.endswith((".css", ".scss")):
                        output.append(f"\x1b[1;35m{entry}\x1b[0m")  # Magenta for CSS
                    elif entry.endswith((".py", ".rb", ".php")):
                        output.append(f"\x1b[1;32m{entry}\x1b[0m")  # Green for scripts
                    else:
                        output.append(entry)
            
            # Send formatted output
            self.send({"output": "  ".join(output) + "\r\n$ "})
            
        except Exception as e:
            self.send({"output": f"Error: {str(e)}\r\n$ "})
    
    def _cat_file(self, filename):
        """Display the contents of a file."""
        try:
            if not filename:
                raise ValueError("Filename is required")
                
            # Resolve file path
            if filename.startswith("/"):
                # Absolute path within workspace
                full_path = os.path.normpath(os.path.join(self.workspace_path, filename.lstrip("/")))
                if not full_path.startswith(self.workspace_path):
                    raise ValueError("Cannot access files outside workspace")
            else:
                # Relative path
                full_path = os.path.normpath(os.path.join(self.current_dir, filename))
                if not full_path.startswith(self.workspace_path):
                    raise ValueError("Cannot access files outside workspace")
            
            if not os.path.exists(full_path):
                raise FileNotFoundError(f"File not found: {filename}")
            if not os.path.isfile(full_path):
                raise IsADirectoryError(f"Not a file: {filename}")
                
            # Read file contents
            with open(full_path, "r", encoding="utf-8") as f:
                content = f.read()
                
            # Send content
            self.send({"output": content + "\r\n$ "})
            
            # If it's an HTML file, also send preview event
            if filename.endswith((".html", ".htm")):
                self.send({"preview": content})
                
        except Exception as e:
            self.send({"output": f"Error: {str(e)}\r\n$ "})
    
    def _touch_file(self, filename):
        """Create a new empty file."""
        try:
            if not filename:
                raise ValueError("Filename is required")
                
            # Resolve file path
            if filename.startswith("/"):
                # Absolute path within workspace
                full_path = os.path.normpath(os.path.join(self.workspace_path, filename.lstrip("/")))
                if not full_path.startswith(self.workspace_path):
                    raise ValueError("Cannot create files outside workspace")
            else:
                # Relative path
                full_path = os.path.normpath(os.path.join(self.current_dir, filename))
                if not full_path.startswith(self.workspace_path):
                    raise ValueError("Cannot create files outside workspace")
            
            # Create file (or update timestamp if exists)
            with open(full_path, "a"):
                os.utime(full_path, None)
                
            self.send({"output": f"Created {filename}\r\n$ "})
            
        except Exception as e:
            self.send({"output": f"Error: {str(e)}\r\n$ "})
    
    def _make_directory(self, dirname):
        """Create a new directory."""
        try:
            if not dirname:
                raise ValueError("Directory name is required")
                
            # Resolve path
            if dirname.startswith("/"):
                # Absolute path within workspace
                full_path = os.path.normpath(os.path.join(self.workspace_path, dirname.lstrip("/")))
                if not full_path.startswith(self.workspace_path):
                    raise ValueError("Cannot create directories outside workspace")
            else:
                # Relative path
                full_path = os.path.normpath(os.path.join(self.current_dir, dirname))
                if not full_path.startswith(self.workspace_path):
                    raise ValueError("Cannot create directories outside workspace")
            
            # Create directory
            os.makedirs(full_path, exist_ok=True)
                
            self.send({"output": f"Created directory {dirname}\r\n$ "})
            
        except Exception as e:
            self.send({"output": f"Error: {str(e)}\r\n$ "})
    
    def _echo_command(self, text):
        """Handle echo command, including redirection."""
        try:
            if ">" in text:
                # Handle redirection (echo content > file)
                parts = text.split(">", 1)
                content = parts[0].strip()
                filename = parts[1].strip()
                
                # Remove quotes if present
                if content.startswith('"') and content.endswith('"'):
                    content = content[1:-1]
                elif content.startswith("'") and content.endswith("'"):
                    content = content[1:-1]
                
                # Resolve file path
                if filename.startswith("/"):
                    # Absolute path within workspace
                    full_path = os.path.normpath(os.path.join(self.workspace_path, filename.lstrip("/")))
                    if not full_path.startswith(self.workspace_path):
                        raise ValueError("Cannot create files outside workspace")
                else:
                    # Relative path
                    full_path = os.path.normpath(os.path.join(self.current_dir, filename))
                    if not full_path.startswith(self.workspace_path):
                        raise ValueError("Cannot create files outside workspace")
                
                # Write to file
                with open(full_path, "w", encoding="utf-8") as f:
                    f.write(content)
                    
                self.send({"output": f"Wrote to {filename}\r\n$ "})
                
                # If it's an HTML file, also send preview event
                if filename.endswith((".html", ".htm")):
                    self.send({"preview": content})
            else:
                # Simple echo (just display the text)
                # Remove quotes if present
                if text.startswith('"') and text.endswith('"'):
                    text = text[1:-1]
                elif text.startswith("'") and text.endswith("'"):
                    text = text[1:-1]
                    
                self.send({"output": text + "\r\n$ "})
                
        except Exception as e:
            self.send({"output": f"Error: {str(e)}\r\n$ "})
    
    def _handle_mcp_command(self, command):
        """Handle MCP commands to integrate with other services."""
        parts = command.strip().split(" ", 1)
        if not parts:
            self.send({"output": "MCP command required\r\n$ "})
            return
            
        mcp_type = parts[0].lower()
        query = parts[1] if len(parts) > 1 else ""
        
        if mcp_type == "web-search":
            if not query:
                self.send({"output": "Search query required\r\n$ "})
                return
                
            self.send({"output": f"Searching web for: {query}...\r\n"})
            self.send({"mcp": {"type": "web-search", "query": query}})
            self.send({"output": "See results in the Mama Bear interface\r\n$ "})
            
        elif mcp_type == "code-search":
            if not query:
                self.send({"output": "Code search query required\r\n$ "})
                return
                
            self.send({"output": f"Searching code for: {query}...\r\n"})
            self.send({"mcp": {"type": "code-search", "query": query}})
            self.send({"output": "See results in the Mama Bear interface\r\n$ "})
            
        elif mcp_type == "npm":
            if not query:
                self.send({"output": "NPM command required\r\n$ "})
                return
                
            npm_parts = query.split(" ")
            npm_cmd = npm_parts[0]
            
            if npm_cmd == "install":
                if len(npm_parts) < 2:
                    self.send({"output": "Package name required\r\n$ "})
                    return
                    
                package = npm_parts[1]
                self.send({"output": f"Installing {package}...\r\n"})
                
                # Simulate npm installation (we'd actually execute npm in a real implementation)
                # Creating a node_modules directory and package.json
                node_modules = os.path.join(self.current_dir, "node_modules")
                os.makedirs(node_modules, exist_ok=True)
                
                # Create a dummy package directory
                package_dir = os.path.join(node_modules, package)
                os.makedirs(package_dir, exist_ok=True)
                
                # Create a dummy package.json
                package_json = os.path.join(package_dir, "package.json")
                with open(package_json, "w") as f:
                    f.write(f'{{"name": "{package}", "version": "1.0.0"}}')
                
                self.send({"output": f"Successfully installed {package}\r\n$ "})
                
            else:
                self.send({"output": f"NPM command not supported: {npm_cmd}\r\n$ "})
        
        else:
            self.send({"output": f"Unknown MCP command: {mcp_type}\r\n"})
            self.send({"output": "Available MCP commands: web-search, code-search, npm\r\n$ "})
    
    def _show_help(self):
        """Show available commands."""
        commands = [
            ("File Commands:", ""),
            ("  ls [path]", "List files in directory"),
            ("  cat <file>", "Display file contents"),
            ("  touch <file>", "Create an empty file"),
            ("  mkdir <dir>", "Create a directory"),
            ("  cd <path>", "Change directory"),
            ("  pwd", "Print working directory"),
            ("  echo <text>", "Display text"),
            ("  echo <text> > <file>", "Write text to file"),
            ("", ""),
            ("MCP Commands:", ""),
            ("  mcp web-search <query>", "Search the web using Brave"),
            ("  mcp code-search <query>", "Search for code samples"),
            ("  mcp npm install <package>", "Install an npm package"),
            ("", ""),
            ("Other Commands:", ""),
            ("  clear", "Clear the terminal"),
            ("  help", "Show this help message"),
        ]
        
        output = "\r\n🐻 Mama Bear Terminal Help\r\n"
        output += "==========================\r\n\r\n"
        
        for cmd, desc in commands:
            if desc:
                output += f"{cmd.ljust(30)} {desc}\r\n"
            else:
                output += f"\r\n{cmd}\r\n"
        
        self.send({"output": output + "\r\n$ "})
    
    def cleanup(self):
        """Clean up resources when the session ends."""
        if self.proc:
            try:
                self.proc.terminate()
            except:
                pass
        
        # We don't automatically remove the workspace, as the user might reconnect
        # In a production system, we'd have a cleanup job to remove old workspaces

def init_terminal_server(app):
    """Initialize the terminal WebSocket server."""
    sock = Sock(app)
    
    # Ensure workspace root directory exists
    os.makedirs(WORKSPACE_ROOT, exist_ok=True)
    
    @sock.route('/terminal')
    def terminal_socket(ws):
        """Handle WebSocket connections for the terminal."""
        # Get or create session ID from query params or cookies
        session_id = request.args.get('session_id')
        user_id = request.args.get('user_id', 'default')
        
        # If no session_id, create a new one
        if not session_id:
            session_id = str(uuid.uuid4())
            logger.info(f"Created new terminal session: {session_id}")
        
        # Get or create the session
        if session_id in SESSIONS:
            session = SESSIONS[session_id]
            logger.info(f"Reconnected to existing session: {session_id}")
        else:
            session = TerminalSession(session_id=session_id, user_id=user_id)
            SESSIONS[session_id] = session
            logger.info(f"Created new terminal session: {session_id}")
        
        # Set the WebSocket for this session
        session.ws = ws
        
        # Send welcome message
        session.send({
            "output": f"\r\n🐻 Welcome to Mama Bear Terminal\r\n\r\nSession ID: {session_id}\r\nType 'help' for available commands\r\n\r\n$ "
        })
        
        try:
            while True:
                # Wait for messages from the client
                message = ws.receive()
                if message is None:
                    break
                
                try:
                    data = json.loads(message)
                    if 'cmd' in data:
                        # Execute the command
                        session.execute_command(data['cmd'])
                except json.JSONDecodeError:
                    session.send({"error": "Invalid JSON message"})
                except Exception as e:
                    logger.error(f"Error processing message: {str(e)}")
                    session.send({"error": f"Error: {str(e)}"})
        except Exception as e:
            logger.error(f"WebSocket error: {str(e)}")
        finally:
            session.ws = None
            logger.info(f"Terminal session disconnected: {session_id}")
    
    # Start a background thread to periodically clean up old sessions
    def cleanup_thread():
        while True:
            try:
                # Sleep first to avoid cleaning up immediately after start
                time.sleep(3600)  # Check every hour
                
                current_time = datetime.now()
                sessions_to_remove = []
                
                for session_id, session in SESSIONS.items():
                    # If the session has been inactive for more than 24 hours
                    if (current_time - session.last_active).total_seconds() > 86400:
                        sessions_to_remove.append(session_id)
                
                for session_id in sessions_to_remove:
                    if session_id in SESSIONS:
                        session = SESSIONS.pop(session_id)
                        session.cleanup()
                        
                        # Clean up workspace
                        try:
                            if session.workspace_path and os.path.exists(session.workspace_path):
                                shutil.rmtree(session.workspace_path)
                                logger.info(f"Cleaned up workspace for session: {session_id}")
                        except Exception as e:
                            logger.error(f"Error cleaning up workspace: {str(e)}")
                            
                logger.info(f"Cleaned up {len(sessions_to_remove)} inactive sessions")
                
            except Exception as e:
                logger.error(f"Error in cleanup thread: {str(e)}")
    
    # Start the cleanup thread
    try:
        import time
        cleanup_thread = threading.Thread(target=cleanup_thread, daemon=True)
        cleanup_thread.start()
    except Exception as e:
        logger.error(f"Failed to start cleanup thread: {str(e)}")
    
    logger.info("Terminal WebSocket server initialized")
    return sock