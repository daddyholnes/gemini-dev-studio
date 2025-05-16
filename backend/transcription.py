"""
Podplay Build Sanctuary - Audio Transcription Module

Provides functionality to transcribe audio files to text.
Uses a mock implementation that always returns a friendly response.
Can be replaced with real transcription services in the future.

Created by Mama Bear 🐻💜
"""

import os
import logging
import time
import random
from typing import Dict, Any, Union, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TranscriptionService:
    """Simple mock transcription service for Podplay Build"""
    
    def __init__(self):
        """Initialize the transcription service"""
        logger.info("Initializing Podplay Build transcription service")
        self.sample_responses = [
            "I would like to test the audio recording feature in Podplay Build.",
            "Can you help me implement the multimodal chat functionality?",
            "I'm having issues with the Docker MCP integration and need your help.",
            "The audio recording and transcription are now working perfectly.",
            "Mama Bear, thank you for helping me with my Podplay Build sanctuary.",
            "I need to add image pasting functionality to my chat interface.",
            "Can we integrate the Brave Search MCP with our current setup?",
            "Please explain how the audio transcription process works in detail.",
            "I'd like to extend the chat system with more advanced features.",
            "This is a test of the audio recording and transcription functionality."
        ]
    
    def transcribe_audio_file(self, file_path: str) -> dict:
        """Simple mock implementation that returns a friendly response"""
        try:
            logger.info(f"Processing audio file at {file_path}")
            
            # Get file size to estimate audio length
            file_size = os.path.getsize(file_path)
            logger.info(f"Audio file size: {file_size} bytes")
            
            # Add a small delay to simulate processing
            time.sleep(0.5)
            
            # Pick a response based on the timestamp (to vary responses)
            timestamp_seed = int(time.time() * 1000) % len(self.sample_responses)
            response_text = self.sample_responses[timestamp_seed]
            
            # If file is very small, treat as empty/noise
            if file_size < 1000:  # Less than 1KB
                return {
                    "text": "",
                    "status": "success",
                    "message": "Audio was too short or contained only background noise"
                }
                
            # Success response
            return {
                "text": response_text,
                "status": "success",
                "confidence": 0.98,
                "duration_seconds": file_size / 16000  # Rough estimate
            }
            
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            return {
                "text": "",
                "status": "error",
                "error": str(e),
                "message": "Failed to process audio file"
            }
    
    def transcribe_audio(self, audio_data: bytes, format_hint: str = "webm") -> dict:
        """Transcribe raw audio data"""
        try:
            logger.info(f"Processing {len(audio_data)} bytes of {format_hint} audio data")
            
            # Pick a response based on data size and current time
            size_factor = len(audio_data) % 5
            time_factor = int(time.time()) % 5
            index = (size_factor + time_factor) % len(self.sample_responses)
            response_text = self.sample_responses[index]
            
            # If data is very small, treat as empty/noise
            if len(audio_data) < 1000:  # Less than 1KB
                return {
                    "text": "",
                    "status": "success",
                    "message": "Audio was too short or contained only background noise"
                }
            
            # Success response
            return {
                "text": response_text,
                "status": "success",
                "confidence": 0.95
            }
            
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            return {
                "text": "",
                "status": "error",
                "error": str(e)
            }

# Create a singleton instance
transcription_service = TranscriptionService()
