"""
Flask API endpoints for WebAssembly code execution
"""
import os
import json
import time
import logging
from typing import Dict, Any

from flask import Blueprint, request, jsonify, current_app
from .wasmer_integration import get_wasmer_runtime

# Configure logging
logger = logging.getLogger("wasm_api")

# Create Blueprint for WebAssembly endpoints
wasm_bp = Blueprint('wasm', __name__, url_prefix='/api/wasm')

@wasm_bp.route('/status', methods=['GET'])
def get_wasm_status():
    """Get the current status of the WebAssembly runtime"""
    runtime = get_wasmer_runtime()
    return jsonify({
        "initialized": runtime.initialized,
        "wasmer_path": runtime.wasmer_path,
        "supported_languages": ["javascript", "python", "node"]
    })

@wasm_bp.route('/install', methods=['POST'])
def install_wasmer():
    """Install Wasmer if not already installed"""
    runtime = get_wasmer_runtime()
    
    if runtime.initialized:
        return jsonify({
            "success": True,
            "message": "Wasmer is already installed and initialized."
        })
    
    success = runtime.install_wasmer()
    
    if success:
        return jsonify({
            "success": True,
            "message": "Wasmer installed successfully."
        })
    else:
        return jsonify({
            "success": False,
            "message": "Failed to install Wasmer. Check server logs for details."
        }), 500

@wasm_bp.route('/execute', methods=['POST'])
def execute_code():
    """Execute code in the WebAssembly runtime"""
    data = request.json
    
    if not data or "code" not in data:
        return jsonify({
            "success": False,
            "error": "Missing required parameter: code"
        }), 400
    
    code = data.get("code", "")
    language = data.get("language", "python").lower()
    timeout = data.get("timeout", 10)
    
    runtime = get_wasmer_runtime()
    
    if not runtime.initialized:
        return jsonify({
            "success": False,
            "error": "WebAssembly runtime not initialized. Install Wasmer first."
        }), 500
    
    # Execute code based on language
    if language == "python":
        result = runtime.execute_python(code, timeout)
    elif language in ["javascript", "js", "node"]:
        result = runtime.execute_javascript(code, timeout)
    else:
        return jsonify({
            "success": False,
            "error": f"Unsupported language: {language}"
        }), 400
    
    return jsonify(result)

@wasm_bp.route('/initialized', methods=['POST'])
def client_initialized():
    """Receive notification that the client WebAssembly runtime has initialized"""
    data = request.json
    status = data.get("status", "unknown")
    
    logger.info(f"Client WebAssembly runtime status: {status}")
    
    # Store client status in app config for coordination
    current_app.config["WASM_CLIENT_STATUS"] = status
    current_app.config["WASM_CLIENT_INITIALIZED_AT"] = time.time()
    
    return jsonify({
        "success": True,
        "message": "Status received."
    })

def init_app(app):
    """Initialize WebAssembly runtime in the Flask app"""
    app.register_blueprint(wasm_bp)
    
    # Mark as initialized in config
    app.config["WASM_ENABLED"] = True
    
    # Initialize runtime
    runtime = get_wasmer_runtime()
    if not runtime.initialized:
        logger.warning("WebAssembly runtime not fully initialized. Code execution capabilities will be limited.")
    else:
        logger.info("WebAssembly runtime initialized successfully.")
        
    return app