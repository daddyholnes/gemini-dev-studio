# Gemini Developer Studio - MCP Engine (SDK-based)
import os
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from mcp_tools import ToolRegistry, get_boot_tools

try:
    import google.genai as genai
    from google.genai import types, errors
except ImportError:
    raise ImportError("google-genai SDK not installed. Please run: pip install google-genai")

app = Flask(__name__)
CORS(app)

# --- Dynamic Gemini/Vertex Client Initialization ---
def get_genai_client():
    # Prefer env config for Vertex AI if set
    if os.environ.get('GOOGLE_GENAI_USE_VERTEXAI', '').lower() == 'true':
        return genai.Client()
    # Else fallback to Gemini Developer API
    api_key = os.environ.get('GOOGLE_API_KEY') or os.environ.get('GEMINI_API_KEY')
    if not api_key:
        raise RuntimeError('Missing GOOGLE_API_KEY or GEMINI_API_KEY for Gemini API')
    return genai.Client(api_key=api_key)

# --- MCP Tool Registry ---
def get_tool_registry(project_id=None):
    # For now, always load boot tools; later, load per-project toolset
    return ToolRegistry(get_boot_tools())

# --- Chat & Streaming Endpoints ---
@app.route('/api/gemini/chat', methods=['POST'])
def chat():
    data = request.json
    messages = data.get('messages', [])
    project_id = data.get('project_id')
    config = data.get('config', {})
    try:
        client = get_genai_client()
        tool_registry = get_tool_registry(project_id)
        response = client.models.generate_content(
            model=config.get('model', 'gemini-1.5-pro-latest'),
            contents=messages,
            config=types.GenerateContentConfig(**config) if config else None,
        )
        return jsonify({'response': response.text})
    except errors.APIError as e:
        return jsonify({'error': str(e), 'code': getattr(e, 'code', None)}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/gemini/chat/stream', methods=['POST'])
def chat_stream():
    data = request.json
    messages = data.get('messages', [])
    project_id = data.get('project_id')
    config = data.get('config', {})
    try:
        client = get_genai_client()
        tool_registry = get_tool_registry(project_id)
        def generate():
            for chunk in client.models.generate_content_stream(
                model=config.get('model', 'gemini-1.5-pro-latest'),
                contents=messages,
                config=types.GenerateContentConfig(**config) if config else None,
            ):
                yield chunk.text
        return Response(generate(), mimetype='text/event-stream')
    except errors.APIError as e:
        return jsonify({'error': str(e), 'code': getattr(e, 'code', None)}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- Health Check Endpoint ---
@app.route('/api/gemini/health', methods=['GET'])
def health():
    try:
        client = get_genai_client()
        models = list(client.models.list())
        return jsonify({'status': 'ok', 'models': [m.name for m in models]})
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
