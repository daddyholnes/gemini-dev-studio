# marketplace_panel.py
"""
Agent-driven, seamless marketplace/tool integration for Code Build
- No separate marketplace page
- Optional contextual panel for manual exploration
"""
from flask import Blueprint, jsonify, request
from mcp_client import get_mcp_catalog, run_mcp_tool

marketplace_bp = Blueprint('marketplace_bp', __name__)

@marketplace_bp.route('/api/agentic/marketplace', methods=['GET'])
def list_mcp_tools():
    tools = get_mcp_catalog()
    return jsonify({'tools': tools})

@marketplace_bp.route('/api/agentic/marketplace/run', methods=['POST'])
def launch_mcp_tool():
    data = request.get_json()
    image_name = data.get('image_name')
    args = data.get('args', [])
    env = data.get('env', {})
    result = run_mcp_tool(image_name, args=args, env=env)
    return jsonify(result)

