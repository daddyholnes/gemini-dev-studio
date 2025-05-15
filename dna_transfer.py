#!/usr/bin/env python
"""
DNA Transfer Utility for Podplay Build

This utility allows you to:
1. Import conversations from a text file (like Mumma-Bear-Handle-With-Care.txt)
2. Directly paste in conversation text (like your conversation about UI improvements)
3. Export conversations from one model/project to another

It helps maintain the "organic calculations" by preserving conversation context
across different AI systems and sessions.
"""

import os
import sys
import re
import json
import argparse
import datetime
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore

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

def save_chat_history(user_id, project_id, model_id, chat_history):
    """Save chat history to Firestore."""
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
    """Load chat history from Firestore."""
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

def list_available_chats():
    """List all available chats in Firestore."""
    if not db:
        print("Firebase not initialized. Cannot list chats.")
        return []
    
    try:
        # Get all documents from the collection
        docs = db.collection('mama_bear_chats').stream()
        
        # List of chat details
        chats = []
        
        # Process each document
        for doc in docs:
            data = doc.to_dict()
            chats.append({
                'id': doc.id,
                'user_id': data.get('user_id'),
                'project_id': data.get('project_id'),
                'model_id': data.get('model_id'),
                'updated_at': data.get('updated_at'),
                'message_count': len(data.get('messages', []))
            })
        
        return chats
    
    except Exception as e:
        print(f"Error listing chats: {e}")
        return []

def parse_text_conversation(text):
    """Parse a conversation from text."""
    # Simple pattern for user/assistant messages
    messages = []
    
    # Try multiple patterns
    
    # Pattern 1: User: ... Assistant: ...
    pattern1 = r'(?:User|You):\s*(.*?)(?:\n(?:Assistant|Mama Bear|Lead Developer Agent):\s*(.*?)(?=\n(?:User|You):|$))'
    matches1 = re.findall(pattern1, text, re.DOTALL)
    
    if matches1:
        for user_msg, assistant_msg in matches1:
            # Add user message
            messages.append({
                'sender': 'user',
                'content': user_msg.strip(),
                'timestamp': datetime.datetime.now().isoformat()
            })
            
            # Add assistant message
            messages.append({
                'sender': 'agent',
                'content': assistant_msg.strip(),
                'timestamp': datetime.datetime.now().isoformat()
            })
    else:
        # Pattern 2: "user:" ... "model:" ...
        pattern2 = r'user:\s*"""(.*?)""".*?model:\s*"""(.*?)"""'
        matches2 = re.findall(pattern2, text, re.DOTALL)
        
        if matches2:
            for user_msg, assistant_msg in matches2:
                # Add user message
                messages.append({
                    'sender': 'user',
                    'content': user_msg.strip(),
                    'timestamp': datetime.datetime.now().isoformat()
                })
                
                # Add assistant message
                messages.append({
                    'sender': 'agent',
                    'content': assistant_msg.strip(),
                    'timestamp': datetime.datetime.now().isoformat()
                })
        else:
            # Pattern 3: Just split by prompts like "User:" and "Assistant:"
            parts = re.split(r'(User:|You:|Assistant:|Mama Bear:|Lead Developer Agent:)', text)
            
            if len(parts) > 2:
                current_role = None
                current_message = ""
                
                for part in parts:
                    if part in ["User:", "You:"]:
                        if current_role and current_message.strip():
                            messages.append({
                                'sender': 'agent' if current_role in ["Assistant:", "Mama Bear:", "Lead Developer Agent:"] else 'user',
                                'content': current_message.strip(),
                                'timestamp': datetime.datetime.now().isoformat()
                            })
                        current_role = "User:"
                        current_message = ""
                    elif part in ["Assistant:", "Mama Bear:", "Lead Developer Agent:"]:
                        if current_role and current_message.strip():
                            messages.append({
                                'sender': 'agent' if current_role in ["Assistant:", "Mama Bear:", "Lead Developer Agent:"] else 'user',
                                'content': current_message.strip(),
                                'timestamp': datetime.datetime.now().isoformat()
                            })
                        current_role = "Assistant:"
                        current_message = ""
                    else:
                        current_message += part
                
                # Add the last message
                if current_role and current_message.strip():
                    messages.append({
                        'sender': 'agent' if current_role in ["Assistant:", "Mama Bear:", "Lead Developer Agent:"] else 'user',
                        'content': current_message.strip(),
                        'timestamp': datetime.datetime.now().isoformat()
                    })
    
    print(f"Extracted {len(messages)} messages from text")
    return messages

def import_from_file():
    """Import a conversation from a file."""
    # Get file path
    file_path = input("Enter the file path: ")
    
    # Check if file exists
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    # Read file
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Parse conversation
    messages = parse_text_conversation(text)
    
    if not messages:
        print("Could not parse any messages from the file.")
        return
    
    # Get target project and model
    project_id = input("Enter project ID (e.g., 'mama_bear_prototype'): ")
    model_id = input("Enter model ID (e.g., 'gemini-1.5-pro-latest'): ")
    
    # Save to Firestore
    user_id = "nathan"  # Default user ID
    success = save_chat_history(user_id, project_id, model_id, messages)
    
    if success:
        print(f"Successfully imported {len(messages)} messages to {project_id}/{model_id}")

def import_from_text():
    """Import a conversation from pasted text."""
    print("Paste your conversation below (press Ctrl+Z on a new line when done):")
    lines = []
    
    try:
        while True:
            line = input()
            lines.append(line)
    except EOFError:
        pass
    
    text = "\n".join(lines)
    
    # Parse conversation
    messages = parse_text_conversation(text)
    
    if not messages:
        print("Could not parse any messages from the text.")
        return
    
    # Get target project and model
    project_id = input("Enter project ID (e.g., 'mama_bear_prototype'): ")
    model_id = input("Enter model ID (e.g., 'gemini-1.5-pro-latest'): ")
    
    # Save to Firestore
    user_id = "nathan"  # Default user ID
    success = save_chat_history(user_id, project_id, model_id, messages)
    
    if success:
        print(f"Successfully imported {len(messages)} messages to {project_id}/{model_id}")

def import_mama_bear_file():
    """Import from the Mumma-Bear-Handle-With-Care.txt file."""
    mama_bear_file = os.path.join(os.path.dirname(__file__), "Mumma-Bear-Handle-With-Care.txt")
    
    if not os.path.exists(mama_bear_file):
        print(f"Mama Bear file not found: {mama_bear_file}")
        return
    
    # Read file
    with open(mama_bear_file, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Parse conversation
    messages = parse_text_conversation(text)
    
    if not messages:
        print("Could not parse any messages from the Mama Bear file.")
        print("Creating a starter conversation...")
        
        messages = [
            {
                'sender': 'user',
                'content': "Hi Mama Bear, I'd like to continue our conversation about the Podplay Build sanctuary.",
                'timestamp': datetime.datetime.now().isoformat()
            },
            {
                'sender': 'agent',
                'content': "Hello Nathan! I'm here as your Lead Developer Agent. I've been carefully designed to understand your needs for Podplay Build, including your vision for a calming, supportive environment. I'm ready to work alongside you on any aspect of the project. What would you like to focus on today?",
                'timestamp': datetime.datetime.now().isoformat()
            }
        ]
    
    # Get target project and model
    project_id = input("Enter project ID (e.g., 'mama_bear_prototype'): ")
    model_id = input("Enter model ID (e.g., 'gemini-1.5-pro-latest'): ")
    
    # Save to Firestore
    user_id = "nathan"  # Default user ID
    success = save_chat_history(user_id, project_id, model_id, messages)
    
    if success:
        print(f"Successfully imported {len(messages)} messages from Mama Bear file to {project_id}/{model_id}")

def transfer_between_models():
    """Transfer a conversation from one model to another."""
    # List available chats
    print("Available chats:")
    chats = list_available_chats()
    
    if not chats:
        print("No chats found.")
        return
    
    for i, chat in enumerate(chats):
        print(f"{i+1}. {chat['project_id']} / {chat['model_id']} ({chat['message_count']} messages)")
    
    # Select source chat
    source_idx = int(input("Select source chat number: ")) - 1
    
    if source_idx < 0 or source_idx >= len(chats):
        print("Invalid selection.")
        return
    
    source_chat = chats[source_idx]
    
    # Load source chat history
    source_history = load_chat_history(source_chat['user_id'], source_chat['project_id'], source_chat['model_id'])
    
    if not source_history:
        print("Source chat history is empty.")
        return
    
    # Get target project and model
    target_project_id = input("Enter target project ID: ")
    target_model_id = input("Enter target model ID: ")
    
    # Save to target
    success = save_chat_history(source_chat['user_id'], target_project_id, target_model_id, source_history)
    
    if success:
        print(f"Successfully transferred {len(source_history)} messages from {source_chat['project_id']}/{source_chat['model_id']} to {target_project_id}/{target_model_id}")

def export_to_file():
    """Export a conversation to a file."""
    # List available chats
    print("Available chats:")
    chats = list_available_chats()
    
    if not chats:
        print("No chats found.")
        return
    
    for i, chat in enumerate(chats):
        print(f"{i+1}. {chat['project_id']} / {chat['model_id']} ({chat['message_count']} messages)")
    
    # Select chat
    chat_idx = int(input("Select chat number to export: ")) - 1
    
    if chat_idx < 0 or chat_idx >= len(chats):
        print("Invalid selection.")
        return
    
    selected_chat = chats[chat_idx]
    
    # Load chat history
    history = load_chat_history(selected_chat['user_id'], selected_chat['project_id'], selected_chat['model_id'])
    
    if not history:
        print("Chat history is empty.")
        return
    
    # Get output file path
    output_file = input("Enter output file path (or press Enter for default): ")
    
    if not output_file:
        output_file = f"export_{selected_chat['project_id']}_{selected_chat['model_id']}.txt"
    
    # Format and write to file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"# Chat Export: {selected_chat['project_id']} / {selected_chat['model_id']}\n")
        f.write(f"# Exported on: {datetime.datetime.now().isoformat()}\n\n")
        
        for msg in history:
            sender = "You" if msg['sender'] == 'user' else "Mama Bear"
            f.write(f"{sender}: {msg['content']}\n\n")
    
    print(f"Successfully exported chat to {output_file}")

def main():
    print("\n🧬 DNA Transfer Utility for Podplay Build 🧬")
    print("This utility helps you transfer conversation 'DNA' between systems")
    print("------------------------------------------------------------")
    
    while True:
        print("\nOptions:")
        print("1. Import from Mumma-Bear-Handle-With-Care.txt file")
        print("2. Import from another text file")
        print("3. Import from pasted text")
        print("4. Transfer between models/projects")
        print("5. Export to file")
        print("6. List available chats")
        print("0. Exit")
        
        choice = input("\nEnter choice: ")
        
        if choice == "1":
            import_mama_bear_file()
        elif choice == "2":
            import_from_file()
        elif choice == "3":
            import_from_text()
        elif choice == "4":
            transfer_between_models()
        elif choice == "5":
            export_to_file()
        elif choice == "6":
            chats = list_available_chats()
            print("\nAvailable chats:")
            for i, chat in enumerate(chats):
                print(f"{i+1}. {chat['project_id']} / {chat['model_id']} ({chat['message_count']} messages)")
        elif choice == "0":
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()