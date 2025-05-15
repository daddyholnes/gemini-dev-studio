"""
Agent Bridge API

Provides endpoints for the AI agent (Mama Bear) to control the development environment programmatically.
This allows the agent to execute terminal commands, manipulate files, control the editor, and manage previews.
"""

import os
import sys
import json
import uuid
import logging
import tempfile
from pathlib import Path
from flask import request, jsonify, Blueprint
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("agent_bridge")

# Import terminal session for command execution
try:
    from terminal.terminal_server import TerminalSession, SESSIONS
    terminal_available = True
except ImportError:
    terminal_available = False
    logger.warning("Terminal module not available. Some agent bridge functions will be limited.")

class AgentBridgeAPI:
    """API class for the agent bridge."""
    
    def __init__(self, app=None):
        self.app = app
        self.blueprint = Blueprint('agent_bridge', __name__)
        self.setup_routes()
        
        # Dict to store active terminal sessions by user
        self.user_sessions = {}
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the agent bridge with a Flask app."""
        self.app = app
        app.register_blueprint(self.blueprint, url_prefix='/api/agent')
        logger.info("Agent Bridge API initialized")
    
    def setup_routes(self):
        """Set up the API routes."""
        # Terminal control endpoints
        self.blueprint.route('/terminal/execute', methods=['POST'])(self.execute_terminal_command)
        self.blueprint.route('/terminal/status', methods=['GET'])(self.get_terminal_status)
        
        # File system endpoints
        self.blueprint.route('/files/list', methods=['GET'])(self.list_files)
        self.blueprint.route('/files/read', methods=['GET'])(self.read_file)
        self.blueprint.route('/files/write', methods=['POST'])(self.write_file)
        self.blueprint.route('/files/create', methods=['POST'])(self.create_file)
        self.blueprint.route('/files/delete', methods=['DELETE'])(self.delete_file)
        
        # Editor control endpoints
        self.blueprint.route('/editor/open', methods=['POST'])(self.open_in_editor)
        self.blueprint.route('/editor/content', methods=['POST'])(self.set_editor_content)
        
        # Preview control endpoints
        self.blueprint.route('/preview/show', methods=['POST'])(self.show_preview)
        
        # Environment control endpoints
        self.blueprint.route('/environment/open', methods=['POST'])(self.open_environment)
        self.blueprint.route('/environment/status', methods=['GET'])(self.get_environment_status)
    
    def _get_or_create_session(self, user_id='default'):
        """Get or create a terminal session for the specified user."""
        if not terminal_available:
            return None
        
        # Check if user already has a session
        if user_id in self.user_sessions:
            session_id = self.user_sessions[user_id]
            if session_id in SESSIONS:
                return SESSIONS[session_id]
        
        # Create a new session
        session = TerminalSession(user_id=user_id)
        SESSIONS[session.session_id] = session
        self.user_sessions[user_id] = session.session_id
        
        return session
    
    def execute_terminal_command(self):
        """Execute a command in the terminal."""
        if not terminal_available:
            return jsonify({'error': 'Terminal functionality not available'}), 500
        
        try:
            data = request.json
            if not data or 'command' not in data:
                return jsonify({'error': 'Command is required'}), 400
            
            command = data['command']
            user_id = data.get('user_id', 'default')
            
            # Get or create a terminal session
            session = self._get_or_create_session(user_id)
            if not session:
                return jsonify({'error': 'Failed to create terminal session'}), 500
            
            # Store the command output
            output_buffer = []
            
            # Override session's send method to capture output
            original_send = session.send
            
            def capture_send(data):
                if isinstance(data, dict):
                    output_buffer.append(data)
                elif isinstance(data, str):
                    output_buffer.append({"output": data})
                else:
                    output_buffer.append({"output": str(data)})
                
                # Call the original send method
                original_send(data)
            
            # Replace send method with our capturing version
            session.send = capture_send
            
            # Execute the command
            session.execute_command(command)
            
            # Restore original send method
            session.send = original_send
            
            return jsonify({
                'success': True,
                'command': command,
                'output': output_buffer,
                'session_id': session.session_id
            })
            
        except Exception as e:
            logger.error(f"Error executing terminal command: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    def get_terminal_status(self):
        """Get the status of the terminal service."""
        return jsonify({
            'available': terminal_available,
            'sessions': list(self.user_sessions.keys()) if terminal_available else []
        })
    
    def list_files(self):
        """List files in a directory."""
        try:
            directory = request.args.get('directory', '/')
            user_id = request.args.get('user_id', 'default')
            
            # Get terminal session to access workspace
            session = self._get_or_create_session(user_id)
            if not session:
                return jsonify({'error': 'Failed to create terminal session'}), 500
            
            # Resolve directory path
            if directory.startswith('/'):
                full_path = os.path.normpath(os.path.join(session.workspace_path, directory.lstrip('/')))
            else:
                full_path = os.path.normpath(os.path.join(session.current_dir, directory))
            
            # Ensure path is within workspace
            if not full_path.startswith(session.workspace_path):
                return jsonify({'error': 'Path is outside of workspace'}), 403
            
            # Check if path exists
            if not os.path.exists(full_path):
                return jsonify({'error': 'Directory not found'}), 404
            
            # List contents
            files = []
            try:
                for item in os.listdir(full_path):
                    item_path = os.path.join(full_path, item)
                    files.append({
                        'name': item,
                        'type': 'directory' if os.path.isdir(item_path) else 'file',
                        'size': os.path.getsize(item_path) if os.path.isfile(item_path) else None,
                        'modified': datetime.fromtimestamp(os.path.getmtime(item_path)).isoformat()
                    })
            except PermissionError:
                return jsonify({'error': 'Permission denied'}), 403
            
            return jsonify({
                'success': True,
                'directory': directory,
                'files': files
            })
            
        except Exception as e:
            logger.error(f"Error listing files: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    def read_file(self):
        """Read the contents of a file."""
        try:
            filepath = request.args.get('filepath')
            user_id = request.args.get('user_id', 'default')
            
            if not filepath:
                return jsonify({'error': 'Filepath is required'}), 400
            
            # Get terminal session to access workspace
            session = self._get_or_create_session(user_id)
            if not session:
                return jsonify({'error': 'Failed to create terminal session'}), 500
            
            # Resolve file path
            if filepath.startswith('/'):
                full_path = os.path.normpath(os.path.join(session.workspace_path, filepath.lstrip('/')))
            else:
                full_path = os.path.normpath(os.path.join(session.current_dir, filepath))
            
            # Ensure path is within workspace
            if not full_path.startswith(session.workspace_path):
                return jsonify({'error': 'Path is outside of workspace'}), 403
            
            # Check if file exists
            if not os.path.exists(full_path):
                return jsonify({'error': 'File not found'}), 404
            
            if not os.path.isfile(full_path):
                return jsonify({'error': 'Not a file'}), 400
            
            # Read file content
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except UnicodeDecodeError:
                # Try binary mode for non-text files
                return jsonify({'error': 'File is not a text file'}), 400
            
            # Get file extension for language detection
            ext = os.path.splitext(filepath)[1].lower().lstrip('.')
            
            # Map extension to language
            language_map = {
                'js': 'javascript',
                'ts': 'typescript',
                'py': 'python',
                'html': 'html',
                'css': 'css',
                'json': 'json',
                'md': 'markdown'
            }
            
            language = language_map.get(ext, 'plaintext')
            
            return jsonify({
                'success': True,
                'filepath': filepath,
                'content': content,
                'language': language,
                'size': os.path.getsize(full_path),
                'modified': datetime.fromtimestamp(os.path.getmtime(full_path)).isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error reading file: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    def write_file(self):
        """Write content to an existing file."""
        try:
            data = request.json
            if not data or 'filepath' not in data or 'content' not in data:
                return jsonify({'error': 'Filepath and content are required'}), 400
            
            filepath = data['filepath']
            content = data['content']
            user_id = data.get('user_id', 'default')
            
            # Get terminal session to access workspace
            session = self._get_or_create_session(user_id)
            if not session:
                return jsonify({'error': 'Failed to create terminal session'}), 500
            
            # Resolve file path
            if filepath.startswith('/'):
                full_path = os.path.normpath(os.path.join(session.workspace_path, filepath.lstrip('/')))
            else:
                full_path = os.path.normpath(os.path.join(session.current_dir, filepath))
            
            # Ensure path is within workspace
            if not full_path.startswith(session.workspace_path):
                return jsonify({'error': 'Path is outside of workspace'}), 403
            
            # Check if file exists
            if not os.path.exists(full_path):
                return jsonify({'error': 'File not found. Use create_file to create a new file.'}), 404
            
            if not os.path.isfile(full_path):
                return jsonify({'error': 'Not a file'}), 400
            
            # Write content to file
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # If it's an HTML file, send a preview event
            if filepath.endswith(('.html', '.htm')):
                # This would be handled by the frontend
                pass
            
            return jsonify({
                'success': True,
                'filepath': filepath,
                'size': os.path.getsize(full_path),
                'modified': datetime.fromtimestamp(os.path.getmtime(full_path)).isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error writing file: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    def create_file(self):
        """Create a new file."""
        try:
            data = request.json
            if not data or 'filepath' not in data:
                return jsonify({'error': 'Filepath is required'}), 400
            
            filepath = data['filepath']
            content = data.get('content', '')
            user_id = data.get('user_id', 'default')
            
            # Get terminal session to access workspace
            session = self._get_or_create_session(user_id)
            if not session:
                return jsonify({'error': 'Failed to create terminal session'}), 500
            
            # Resolve file path
            if filepath.startswith('/'):
                full_path = os.path.normpath(os.path.join(session.workspace_path, filepath.lstrip('/')))
            else:
                full_path = os.path.normpath(os.path.join(session.current_dir, filepath))
            
            # Ensure path is within workspace
            if not full_path.startswith(session.workspace_path):
                return jsonify({'error': 'Path is outside of workspace'}), 403
            
            # Create parent directories if they don't exist
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            # Check if file already exists
            if os.path.exists(full_path):
                return jsonify({'error': 'File already exists. Use write_file to update.'}), 409
            
            # Create the file
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return jsonify({
                'success': True,
                'filepath': filepath,
                'size': os.path.getsize(full_path),
                'modified': datetime.fromtimestamp(os.path.getmtime(full_path)).isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error creating file: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    def delete_file(self):
        """Delete a file or directory."""
        try:
            data = request.json
            if not data or 'filepath' not in data:
                return jsonify({'error': 'Filepath is required'}), 400
            
            filepath = data['filepath']
            recursive = data.get('recursive', False)
            user_id = data.get('user_id', 'default')
            
            # Get terminal session to access workspace
            session = self._get_or_create_session(user_id)
            if not session:
                return jsonify({'error': 'Failed to create terminal session'}), 500
            
            # Resolve file path
            if filepath.startswith('/'):
                full_path = os.path.normpath(os.path.join(session.workspace_path, filepath.lstrip('/')))
            else:
                full_path = os.path.normpath(os.path.join(session.current_dir, filepath))
            
            # Ensure path is within workspace
            if not full_path.startswith(session.workspace_path):
                return jsonify({'error': 'Path is outside of workspace'}), 403
            
            # Check if file exists
            if not os.path.exists(full_path):
                return jsonify({'error': 'File or directory not found'}), 404
            
            # Delete file or directory
            if os.path.isfile(full_path):
                os.remove(full_path)
            elif os.path.isdir(full_path):
                if recursive:
                    import shutil
                    shutil.rmtree(full_path)
                else:
                    os.rmdir(full_path)
            
            return jsonify({
                'success': True,
                'filepath': filepath,
                'type': 'file' if os.path.isfile(full_path) else 'directory'
            })
            
        except Exception as e:
            logger.error(f"Error deleting file: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    def open_in_editor(self):
        """Open a file in the editor by sending a message to the frontend."""
        try:
            data = request.json
            if not data or 'filepath' not in data:
                return jsonify({'error': 'Filepath is required'}), 400
            
            filepath = data['filepath']
            
            # This endpoint will trigger a message to the frontend to open a file
            # The actual implementation is handled by the frontend WebSocket
            
            return jsonify({
                'success': True,
                'message': f"Opening {filepath} in editor",
                'action': 'open_editor',
                'filepath': filepath
            })
            
        except Exception as e:
            logger.error(f"Error opening in editor: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    def set_editor_content(self):
        """Set the content of the editor."""
        try:
            data = request.json
            if not data or 'content' not in data:
                return jsonify({'error': 'Content is required'}), 400
            
            content = data['content']
            language = data.get('language', 'javascript')
            
            # This endpoint will trigger a message to the frontend to set editor content
            # The actual implementation is handled by the frontend WebSocket
            
            return jsonify({
                'success': True,
                'message': f"Setting editor content",
                'action': 'set_editor_content',
                'language': language
            })
            
        except Exception as e:
            logger.error(f"Error setting editor content: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    def show_preview(self):
        """Show content in the preview panel."""
        try:
            data = request.json
            if not data or 'content' not in data:
                return jsonify({'error': 'Content is required'}), 400
            
            content = data['content']
            
            # This endpoint will trigger a message to the frontend to show preview
            # The actual implementation is handled by the frontend WebSocket
            
            return jsonify({
                'success': True,
                'message': "Updating preview panel",
                'action': 'show_preview'
            })
            
        except Exception as e:
            logger.error(f"Error showing preview: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    def open_environment(self):
        """Open the development environment."""
        try:
            # This endpoint will trigger a message to the frontend to open the dev environment
            # The actual implementation is handled by the frontend WebSocket
            
            return jsonify({
                'success': True,
                'message': "Opening development environment",
                'action': 'open_environment'
            })
            
        except Exception as e:
            logger.error(f"Error opening environment: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    def get_environment_status(self):
        """Get the status of the development environment."""
        return jsonify({
            'terminal_available': terminal_available,
            'agent_bridge_available': True
        })

def init_agent_bridge(app):
    """Initialize the agent bridge with a Flask app."""
    bridge = AgentBridgeAPI()
    bridge.init_app(app)
    return bridge