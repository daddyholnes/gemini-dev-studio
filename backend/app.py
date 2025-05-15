from flask import Flask, send_from_directory, abort, request, jsonify
from flask_cors import CORS
import os
import datetime
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import Firebase setup
try:
    from firebase_setup import (
        initialize_firebase,
        save_chat_history,
        load_chat_history,
        convert_to_gemini_format,
        convert_from_gemini_format
    )
    firebase_available = True
except ImportError:
    print("[WARNING] Firebase modules not available. Chat history will not be persistent.")
    firebase_available = False

# Google Gemini/Vertex AI SDK import
try:
    import google.generativeai as genai
except ImportError:
    genai = None
    print("[WARNING] google-generativeai SDK not installed. Gemini functionality will be limited.")

app = Flask(__name__, static_folder=None)
CORS(app)

# Initialize Firebase if available
if firebase_available:
    db = initialize_firebase()
    if db:
        print("[INFO] Firebase initialized successfully. Chat history will be persistent.")
    else:
        print("[WARNING] Firebase initialization failed. Chat history will not be persistent.")
        firebase_available = False # Ensure flag is false if db init fails

# Dynamically resolve frontend directory
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../frontend'))
USER_ID = "nathan" # Default user ID - in production would come from auth

@app.route('/')
def root():
    index_path = os.path.join(FRONTEND_DIR, 'index.html')
    if not os.path.exists(index_path):
        print(f"[ERROR] index.html not found at: {index_path}")
        abort(404)
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/frontend/<path:filename>')
def serve_frontend_static(filename):
    file_path = os.path.join(FRONTEND_DIR, filename)
    if not os.path.exists(file_path):
        print(f"[ERROR] Static file not found: {file_path}")
        abort(404)
    return send_from_directory(FRONTEND_DIR, filename)

@app.route('/<path:filename>')
def serve_root_static(filename):
    file_path = os.path.join(FRONTEND_DIR, filename)
    if not os.path.exists(file_path):
        print(f"[ERROR] Static file not found at root: {file_path}")
        abort(404)
    return send_from_directory(FRONTEND_DIR, filename)

# --- List all available Gemini/Vertex models ---
@app.route('/api/agentic/models', methods=['GET'])
def list_models():
    if not genai:
        return jsonify({'error': 'google-generativeai not installed'}), 500
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return jsonify({'error': 'GEMINI_API_KEY not set'}), 500
    
    # Set the API key
    try:
        genai.api_key = api_key
    except Exception as e:
        return jsonify({'error': f'Failed to set Gemini API key: {str(e)}'}), 500
    
    # Return a fixed set of models without trying to list from the API
    fixed_models = [
        {
            'id': 'gemini-1.5-flash', 
            'description': 'Fast, efficient model for most tasks'
        },
        {
            'id': 'gemini-1.5-pro', 
            'description': 'Most powerful model for complex tasks'
        },
        {
            'id': 'mama-bear-2.5', 
            'description': 'The Lead Developer Agent (Mama Bear) with full capabilities'
        }
    ]
    return jsonify({'models': fixed_models})

# --- Multimodal Chat Endpoint ---
@app.route('/api/agentic/chat', methods=['POST'])
def agentic_chat():
    model_name = request.form.get('model_name', 'gemini-1.5-flash')
    message = request.form.get('message', '')
    mode = request.form.get('mode', 'Build')
    project_id = request.form.get('project_id', 'Personal Website')
    files = request.files.getlist('files')
    audio = request.files.get('audio')
    video = request.files.get('video')
    
    # For Mama Bear mode specifically
    if model_name == 'mama-bear-2.5':
        # Use gemini-1.5-pro for Mama Bear
        model_name = 'gemini-1.5-pro'
    
    # --- REAL GEMINI/GENAI API CALL ---
    if genai:
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            return jsonify({'text': "[ERROR] Gemini API key not set on server."})
        
        # Set the API key
        genai.api_key = api_key
        
        try:
            # Load chat history from Firestore if available
            chat_history = []
            if firebase_available:
                print(f"[INFO] Loading chat history for user={USER_ID}, project={project_id}, model={model_name}")
                chat_history = load_chat_history(USER_ID, project_id, model_name)
                
            # Normalize model name - remove 'models/' prefix if present
            if model_name.startswith('models/'):
                model_name = model_name[7:]  # Remove 'models/' prefix
                
            # Create the model
            model = genai.GenerativeModel(model_name)
            
            # Create a chat session with special prompt for Mama Bear
            # Instead of using system_instruction as a parameter, we'll use a first message approach
            
            # Start the chat without system instruction
            chat = model.start_chat(history=[])
            
            # Add Mama Bear context as first message if history is empty
            if not chat_history:
                mama_bear_context = "You are Nathan's Lead Developer Agent, also called 'Mama Bear'. You help him build and improve his Podplay Build studio. Be supportive, calming, and technically precise."
                # Send the context as a system message
                # Note: some versions use user/model roles, others use human/ai
                try:
                    chat.history.append({"role": "user", "parts": ["SYSTEM: " + mama_bear_context]})
                    chat.history.append({"role": "model", "parts": ["I understand my role. I am Mama Bear, Nathan's Lead Developer Agent for Podplay Build. I'm here to support him with technical expertise and a calming presence."]})
                except Exception as e:
                    print(f"[WARNING] Could not set system context using chat.history.append: {e}")
                    # Try alternate format if that failed
                    try:
                        chat.send_message("SYSTEM: " + mama_bear_context)
                    except Exception as e2:
                        print(f"[WARNING] Could not set system context using send_message either: {e2}")
            
            # Add previous messages to chat history
            if firebase_available and chat_history:
                for msg in chat_history:
                    role = msg['sender']
                    content = msg['content']
                    if role == 'user':
                        try:
                            chat.history.append({"role": "user", "parts": [content]})
                        except:
                            pass  # Silently fail and continue with chat
                    else:
                        try:
                            chat.history.append({"role": "model", "parts": [content]})
                        except:
                            pass  # Silently fail and continue with chat
                
                print(f"[INFO] Loaded {len(chat_history)} previous messages")
            
            # Generate response
            response = chat.send_message(message)
            response_text = response.text
            
            # Save updated chat history to Firestore
            if firebase_available:
                # Add current message to history
                chat_history.append({
                    'sender': 'user',
                    'content': message,
                    'timestamp': datetime.datetime.now().isoformat()
                })
                
                # Add agent response to history
                chat_history.append({
                    'sender': 'agent',
                    'content': response_text,
                    'timestamp': datetime.datetime.now().isoformat()
                })
                
                # Save to Firestore
                save_chat_history(USER_ID, project_id, model_name, chat_history)
                print(f"[INFO] Saved {len(chat_history)} messages to Firestore")
            
            return jsonify({'text': response_text})
            
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"[ERROR] Gemini API error: {e}\n{error_details}")
            return jsonify({'text': f"[Gemini API Error] {str(e)}"})
    
    # Fallback: Friendly agentic response
    if not message.strip():
        return jsonify({'text': "I'm here and ready to help! What would you like to do next?"})
    if 'name' in message.lower():
        return jsonify({'text': "Of course I remember you, Nathan! 😊 How can I support you today in " + mode + " mode?"})
    if 'gem' in message.lower() or 'mama' in message.lower():
        return jsonify({'text': "Mama Bear Gem is always here for you, Nathan. What do you need help with right now?"})
    return jsonify({'text': "I'm here, Nathan. Let's work together! (Mode: " + mode + ")"})

if __name__ == '__main__':
    print(f"[INFO] Serving frontend from: {FRONTEND_DIR}")
    app.run(host='0.0.0.0', port=5000, debug=True)