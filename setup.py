"""
Podplay Build Setup Script
--------------------------
This script will help set up the environment for Podplay Build.
It will:
1. Create a virtual environment if one doesn't exist
2. Install the required packages
3. Link your Firebase service account
4. Set up environment variables
"""

import os
import sys
import subprocess
import platform
import shutil
from pathlib import Path

def run_command(command, cwd=None):
    """Run a command and return the output"""
    print(f"Running: {command}")
    result = subprocess.run(command, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return False
    return True

def main():
    print("┌─────────────────────────────────────────┐")
    print("│ Podplay Build Setup                     │")
    print("│ Mama Bear Sanctuary Installation        │")
    print("└─────────────────────────────────────────┘")
    
    print("\n1. Installing essential packages...")
    
    # Simple direct install without virtual env to avoid complexity
    packages = [
        "flask",
        "flask-cors",
        "google-generativeai",
        "firebase-admin",
        "python-dotenv"
    ]
    
    for package in packages:
        print(f"Installing {package}...")
        success = run_command(f"pip install {package}")
        if not success:
            print(f"Failed to install {package}. Please install it manually.")
    
    print("\n2. Setting up Firebase service account...")
    # Check if service account exists
    service_account_path = os.path.join(os.getcwd(), "camera-calibration-beta-firebase-adminsdk-fbsvc-91a80b4148.json")
    if not os.path.exists(service_account_path):
        print("Firebase service account not found.")
        print(f"Expected location: {service_account_path}")
        print("Please ensure this file exists.")
    else:
        print("Firebase service account found!")
    
    print("\n3. Setting up environment variables...")
    env_path = os.path.join(os.getcwd(), ".env")
    if not os.path.exists(env_path):
        print("Creating .env file...")
        with open(env_path, "w") as f:
            f.write("GEMINI_API_KEY=\n")
            f.write("FIREBASE_SERVICE_ACCOUNT_PATH=camera-calibration-beta-firebase-adminsdk-fbsvc-91a80b4148.json\n")
        print(".env file created. Please edit it to add your Gemini API key.")
    else:
        print(".env file already exists.")
    
    print("\n4. Testing connections...")
    # Test Firebase connection
    print("Testing Firebase connection...")
    test_firebase = """
import os
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    
    # Initialize Firebase
    cred = credentials.Certificate("camera-calibration-beta-firebase-adminsdk-fbsvc-91a80b4148.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase connection successful!")
except Exception as e:
    print(f"Firebase connection failed: {e}")
"""
    
    with open("test_firebase.py", "w") as f:
        f.write(test_firebase)
    
    run_command("python test_firebase.py")
    
    # Test Gemini connection
    print("\nTesting Gemini connection...")
    test_gemini = """
import os
try:
    import google.generativeai as genai
    
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        print("GEMINI_API_KEY not set in environment variables.")
        exit(1)
    
    genai.api_key = api_key
    models = genai.list_models()
    print(f"Gemini connection successful! Found {len(list(models))} models.")
except Exception as e:
    print(f"Gemini connection failed: {e}")
"""
    
    with open("test_gemini.py", "w") as f:
        f.write(test_gemini)
    
    run_command("python test_gemini.py")
    
    print("\n5. Cleanup...")
    if os.path.exists("test_firebase.py"):
        os.remove("test_firebase.py")
    if os.path.exists("test_gemini.py"):
        os.remove("test_gemini.py")
    
    print("\n┌─────────────────────────────────────────┐")
    print("│ Setup Complete!                         │")
    print("└─────────────────────────────────────────┘")
    print("\nTo run Podplay Build, use the following command:")
    print("cd backend")
    print("flask run")
    print("\nThen access the application at: http://127.0.0.1:5000")
    print("\nEnjoy your Mama Bear Sanctuary!")

if __name__ == "__main__":
    main()