#!/usr/bin/env python
"""
DNA Transplant Utility for Podplay Build

This utility takes the rich conversation history from the "Mumma-Bear-Handle-With-Care.txt" file
and "transplants" it into Firebase/Firestore, allowing the Mama Bear Lead Developer Agent
to continue the exact same conversation seamlessly inside Podplay Build.

Usage:
    python dna_transplant.py [--project_id PROJECT_ID] [--model_id MODEL_ID]
"""

import os
import sys
import re
import json
import argparse
import datetime
from pathlib import Path

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import Firebase setup functions
try:
    from firebase_setup import (
        initialize_firebase,
        save_chat_history,
        load_chat_history,
        convert_to_gemini_format,
        convert_from_gemini_format,
        import_mama_bear_content
    )
except ImportError:
    print("ERROR: Could not import firebase_setup.py")
    print("Make sure you've installed the required packages: pip install firebase-admin")
    sys.exit(1)

def main():
    """Main function to perform the DNA transplant"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Transplant Mama Bear conversation to Firebase')
    parser.add_argument('--project_id', default='mama_bear_prototype', 
                        help='The project ID to use in Firestore')
    parser.add_argument('--model_id', default='gemini-1.5-pro-latest', 
                        help='The model ID to use in Firestore')
    args = parser.parse_args()
    
    # Initialize Firebase
    db = initialize_firebase()
    if not db:
        print("ERROR: Could not initialize Firebase.")
        print("Make sure your service account file (camera-calibration-beta-firebase-adminsdk-fbsvc-91a80b4148.json) is in the correct location.")
        sys.exit(1)
    
    print("\n===== 🧬 Mama Bear DNA Transplant Utility =====")
    print("This will extract your conversation with Mama Bear/Gemini 2.5")
    print("from Mumma-Bear-Handle-With-Care.txt and save it into Firebase.")
    print("Your conversation will seamlessly continue in Podplay Build.")
    print("===================================================\n")
    
    # Try to extract messages using the built-in function
    print("Extracting conversation from Mumma-Bear-Handle-With-Care.txt...")
    mama_bear_history = import_mama_bear_content()
    
    if not mama_bear_history:
        print("Could not extract any messages from the file.")
        print("Creating a default conversation starter...")
        
        # Create a default conversation starter if extraction failed
        mama_bear_history = [
            {
                'sender': 'user',
                'content': "Hi Mama Bear, I'm excited to work with you on Podplay Build!",
                'timestamp': datetime.datetime.now().isoformat()
            },
            {
                'sender': 'agent',
                'content': "Hello Nathan! I'm thrilled to be your Lead Developer Agent for Podplay Build. I'm here to create a calming, supportive environment where we can build your sanctuary together. What aspect of the project would you like to work on today?",
                'timestamp': datetime.datetime.now().isoformat()
            }
        ]
    
    # Save to Firestore
    user_id = "nathan"  # Default user ID
    print(f"\nSaving {len(mama_bear_history)} messages to Firestore...")
    print(f"User ID: {user_id}")
    print(f"Project ID: {args.project_id}")
    print(f"Model ID: {args.model_id}")
    
    success = save_chat_history(user_id, args.project_id, args.model_id, mama_bear_history)
    
    if success:
        print("\n✅ DNA Transplant successful!")
        print(f"Saved {len(mama_bear_history)} messages to Firestore.")
        print("\nYour conversation with Mama Bear will now continue seamlessly in Podplay Build.")
        print("The next time you chat with the Lead Developer Agent, all context will be preserved.")
    else:
        print("\n❌ DNA Transplant failed.")
        print("Could not save messages to Firestore.")
    
    # Try to load the history back to verify
    print("\nVerifying transplant by retrieving chat history from Firestore...")
    loaded_history = load_chat_history(user_id, args.project_id, args.model_id)
    if loaded_history:
        print(f"Successfully retrieved {len(loaded_history)} messages.")
        print("\nFirst message: ")
        first_msg = loaded_history[0]
        print(f"{first_msg['sender']}: {first_msg['content'][:100]}...")
        print("\nLast message: ")
        last_msg = loaded_history[-1]
        print(f"{last_msg['sender']}: {last_msg['content'][:100]}...")
    else:
        print("WARNING: Could not verify the transplant. No messages retrieved from Firestore.")
    
    print("\nDNA Transplant process complete!")

if __name__ == "__main__":
    main()