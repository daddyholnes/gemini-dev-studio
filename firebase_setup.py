import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# Initialize Firebase
def initialize_firebase():
    """Initialize Firebase if not already initialized."""
    if not firebase_admin._apps:
        # Use the specific service account file
        service_account_path = os.path.join(os.path.dirname(__file__), 
                                          "camera-calibration-beta-firebase-adminsdk-fbsvc-91a80b4148.json")
        
        if not os.path.exists(service_account_path):
            print(f"Firebase service account file not found at: {service_account_path}")
            return None
        
        try:
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            print(f"Firebase initialized successfully using {service_account_path}")
            return firestore.client()
        except Exception as e:
            print(f"Error initializing Firebase: {e}")
            return None
    
    return firestore.client()

# Get Firestore database
db = initialize_firebase()

# Chat History Functions
def save_chat_history(user_id, project_id, model_id, chat_history):
    """
    Save chat history to Firestore.
    
    Args:
        user_id (str): User identifier
        project_id (str): Project identifier
        model_id (str): Model identifier (e.g., 'gemini-1.5-pro')
        chat_history (list): List of message dictionaries with sender, content, timestamp
    """
    if not db:
        print("Firebase not initialized. Cannot save chat history.")
        return False
    
    try:
        # Create a document reference for this chat
        doc_ref = db.collection('mama_bear_chats').document(f"{user_id}_{project_id}_{model_id}")
        
        # Add timestamp for when this was last updated
        data = {
            'user_id': user_id,
            'project_id': project_id,
            'model_id': model_id,
            'updated_at': firestore.SERVER_TIMESTAMP,
            'messages': chat_history
        }
        
        # Set the document
        doc_ref.set(data)
        print(f"Chat history saved for {user_id}/{project_id}/{model_id}")
        return True
    
    except Exception as e:
        print(f"Error saving chat history: {e}")
        return False

def load_chat_history(user_id, project_id, model_id):
    """
    Load chat history from Firestore.
    
    Args:
        user_id (str): User identifier
        project_id (str): Project identifier
        model_id (str): Model identifier
        
    Returns:
        list: List of message dictionaries with sender, content, timestamp
    """
    if not db:
        print("Firebase not initialized. Cannot load chat history.")
        return []
    
    try:
        # Get the document reference
        doc_ref = db.collection('mama_bear_chats').document(f"{user_id}_{project_id}_{model_id}")
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            return data.get('messages', [])
        else:
            print(f"No chat history found for {user_id}/{project_id}/{model_id}")
            return []
    
    except Exception as e:
        print(f"Error loading chat history: {e}")
        return []

def convert_to_gemini_format(chat_history):
    """
    Convert chat history to Gemini API format.
    
    Args:
        chat_history (list): List of message dictionaries
        
    Returns:
        list: List in Gemini Content format
    """
    from google.genai import types
    
    gemini_messages = []
    
    for msg in chat_history:
        role = "user" if msg['sender'] == 'user' else "model"
        content = msg['content']
        
        gemini_messages.append(
            types.Content(
                role=role,
                parts=[types.Part.from_text(text=content)]
            )
        )
    
    return gemini_messages

# Helper function to convert Gemini message history to simple format for storage
def convert_from_gemini_format(gemini_messages):
    """
    Convert from Gemini API format to simple storage format.
    
    Args:
        gemini_messages (list): List of Gemini Content objects
        
    Returns:
        list: List of message dictionaries
    """
    simple_messages = []
    
    for msg in gemini_messages:
        sender = 'user' if msg.role == 'user' else 'agent'
        content = msg.parts[0].text if hasattr(msg.parts[0], 'text') else str(msg.parts[0])
        
        simple_messages.append({
            'sender': sender,
            'content': content,
            'timestamp': datetime.now().isoformat()
        })
    
    return simple_messages

# Import Mama Bear conversation from Mumma-Bear-Handle-With-Care.txt file
def import_mama_bear_content():
    """
    Import the conversation from Mumma-Bear-Handle-With-Care.txt.
    This allows us to transfer the 'soul' of the conversation into Firestore.
    
    Returns:
        list: List of message dictionaries
    """
    try:
        filepath = os.path.join(os.path.dirname(__file__), "Mumma-Bear-Handle-With-Care.txt")
        if not os.path.exists(filepath):
            print(f"Mama Bear file not found at: {filepath}")
            return []
            
        with open(filepath, 'r', encoding='utf-8') as file:
            content = file.read()
            
        # Find the conversation part
        # This is a simplified extraction, we're looking for content between USER and ASSISTANT sections
        messages = []
        import re
        
        # Extract user and assistant messages
        pattern = r'user:\s*"""(.*?)""".*?model:\s*"""(.*?)"""'
        matches = re.findall(pattern, content, re.DOTALL)
        
        for i, (user_msg, assistant_msg) in enumerate(matches):
            # Add user message
            messages.append({
                'sender': 'user',
                'content': user_msg.strip(),
                'timestamp': (datetime.now() - datetime.timedelta(minutes=30-i*5)).isoformat()
            })
            
            # Add assistant message
            messages.append({
                'sender': 'agent',
                'content': assistant_msg.strip(),
                'timestamp': (datetime.now() - datetime.timedelta(minutes=30-i*5-2)).isoformat()
            })
        
        print(f"Extracted {len(messages)} messages from Mama Bear file")
        return messages
        
    except Exception as e:
        print(f"Error importing Mama Bear content: {e}")
        return []

# For testing/demonstration
if __name__ == "__main__":
    # Initialize Firebase
    db = initialize_firebase()
    
    if db:
        print("Firebase connection successful!")
        
        # Try to import Mama Bear conversation
        mama_bear_history = import_mama_bear_content()
        if mama_bear_history:
            print(f"Imported {len(mama_bear_history)} messages from Mama Bear file")
            
            # Save to Firestore
            save_chat_history('nathan', 'mama_bear_prototype', 'gemini-2.5-pro', mama_bear_history)
            print("Mama Bear content saved to Firestore!")
        
        # Test with simple history
        test_history = [
            {'sender': 'user', 'content': 'Hello, Mama Bear!', 'timestamp': datetime.now().isoformat()},
            {'sender': 'agent', 'content': 'Hi Nathan! I\'m here to help with your Podplay Build. What would you like to work on today?', 'timestamp': datetime.now().isoformat()}
        ]
        
        # Save test history
        save_chat_history('nathan', 'personal_website', 'gemini-1.5-pro', test_history)
        
        # Load test history
        loaded_history = load_chat_history('nathan', 'personal_website', 'gemini-1.5-pro')
        print(f"Loaded {len(loaded_history)} messages")