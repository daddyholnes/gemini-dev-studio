/**
 * Podplay Build Sanctuary - Audio Chat Integration
 * 
 * A simplified, reliable audio recording and playback system
 * for the Podplay Build chat interface.
 * 
 * Created by Mama Bear 🐻💜
 */

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎙️ Audio Chat: Initializing');
    
    // Audio recording state
    const audioChat = {
        isRecording: false,
        mediaRecorder: null,
        audioChunks: [],
        recordingTimer: null,
        recordingSeconds: 0,
        
        // DOM elements (will be populated on init)
        elements: {
            recordButton: null,
            recordingIndicator: null,
            chatInput: null
        },
        
        // Initialize the audio chat functionality
        init: function() {
            // Find DOM elements
            this.elements.recordButton = document.getElementById('mic-btn');
            this.elements.chatInput = document.getElementById('chat-input');
            
            // Create recording indicator if it doesn't exist
            this.createRecordingIndicator();
            
            // Set up event listeners
            if (this.elements.recordButton) {
                this.elements.recordButton.addEventListener('click', this.toggleRecording.bind(this));
                console.log('🎙️ Audio Chat: Record button event listener added');
            } else {
                console.warn('🎙️ Audio Chat: Record button not found');
            }
            
            // Add keyboard shortcut (Alt+R) for recording
            document.addEventListener('keydown', function(e) {
                if (e.altKey && e.key === 'r') {
                    audioChat.toggleRecording();
                    e.preventDefault();
                }
            });
        },
        
        // Create recording indicator element
        createRecordingIndicator: function() {
            // Remove any existing indicator
            const existingIndicator = document.getElementById('recording-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            
            // Create new indicator
            const indicator = document.createElement('div');
            indicator.id = 'recording-indicator';
            indicator.className = 'recording-indicator';
            indicator.textContent = 'Recording audio...';
            indicator.style.display = 'none';
            
            // Style the indicator
            indicator.style.position = 'fixed';
            indicator.style.top = '20px';
            indicator.style.left = '50%';
            indicator.style.transform = 'translateX(-50%)';
            indicator.style.backgroundColor = 'rgba(231, 76, 60, 0.9)';
            indicator.style.color = 'white';
            indicator.style.padding = '8px 16px';
            indicator.style.borderRadius = '4px';
            indicator.style.zIndex = '9999';
            indicator.style.fontWeight = 'bold';
            indicator.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
            
            // Add animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes pulse {
                    0% { opacity: 0.7; }
                    50% { opacity: 1; }
                    100% { opacity: 0.7; }
                }
                .recording-indicator {
                    animation: pulse 1.5s infinite ease-in-out;
                }
            `;
            document.head.appendChild(style);
            
            // Add to DOM
            document.body.appendChild(indicator);
            this.elements.recordingIndicator = indicator;
        },
        
        // Toggle recording state
        toggleRecording: function() {
            if (this.isRecording) {
                this.stopRecording();
            } else {
                this.startRecording();
            }
        },
        
        // Start audio recording
        startRecording: function() {
            console.log('🎙️ Audio Chat: Starting recording');
            
            // Check if already recording
            if (this.isRecording) return;
            
            // Request microphone access
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then((stream) => {
                    this.isRecording = true;
                    this.audioChunks = [];
                    
                    // Show recording UI
                    if (this.elements.recordButton) {
                        this.elements.recordButton.classList.add('recording');
                        this.elements.recordButton.style.color = '#e74c3c';
                    }
                    
                    if (this.elements.recordingIndicator) {
                        this.elements.recordingIndicator.style.display = 'block';
                    }
                    
                    // Create and start media recorder
                    this.mediaRecorder = new MediaRecorder(stream);
                    this.mediaRecorder.start(100); // Collect 100ms chunks
                    
                    // Handle data available
                    this.mediaRecorder.ondataavailable = (e) => {
                        if (e.data.size > 0) {
                            this.audioChunks.push(e.data);
                        }
                    };
                    
                    // Handle recording stop
                    this.mediaRecorder.onstop = () => {
                        // Stop all tracks
                        stream.getTracks().forEach(track => track.stop());
                        
                        // Process the recording
                        this.processRecording();
                    };
                    
                    // Set up recording timer
                    this.recordingSeconds = 0;
                    this.recordingTimer = setInterval(() => {
                        this.recordingSeconds++;
                        
                        // Update recording indicator with time
                        if (this.elements.recordingIndicator) {
                            const minutes = Math.floor(this.recordingSeconds / 60);
                            const seconds = this.recordingSeconds % 60;
                            this.elements.recordingIndicator.textContent = 
                                `Recording audio... ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
                        }
                        
                        // Auto-stop after 2 minutes
                        if (this.recordingSeconds >= 120) {
                            this.stopRecording();
                        }
                    }, 1000);
                })
                .catch((error) => {
                    console.error('🎙️ Audio Chat: Error accessing microphone:', error);
                    alert('Could not access your microphone. Please check your permissions and try again.');
                });
        },
        
        // Stop audio recording
        stopRecording: function() {
            console.log('🎙️ Audio Chat: Stopping recording');
            
            // Check if recording
            if (!this.isRecording || !this.mediaRecorder) return;
            
            this.isRecording = false;
            
            // Hide recording UI
            if (this.elements.recordButton) {
                this.elements.recordButton.classList.remove('recording');
                this.elements.recordButton.style.color = '';
            }
            
            if (this.elements.recordingIndicator) {
                this.elements.recordingIndicator.style.display = 'none';
            }
            
            // Stop the timer
            if (this.recordingTimer) {
                clearInterval(this.recordingTimer);
                this.recordingTimer = null;
            }
            
            // Stop the recorder
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }
        },
        
        // Process the recorded audio
        processRecording: function() {
            console.log('🎙️ Audio Chat: Processing recording', this.audioChunks.length, 'chunks');
            
            // Check if we have any audio data
            if (this.audioChunks.length === 0) {
                console.warn('🎙️ Audio Chat: No audio data recorded');
                return;
            }
            
            // Create audio blob
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            
            // Show loading message in chat input
            const originalPlaceholder = this.elements.chatInput.placeholder;
            this.elements.chatInput.placeholder = 'Transcribing audio...';
            
            // Convert to base64 for easier handling
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
                const base64data = reader.result.split(',')[1];
                
                // Send for transcription
                this.transcribeAudio(base64data, audioBlob)
                    .then(text => {
                        // Update chat input with transcription
                        if (text) {
                            this.elements.chatInput.value = text;
                            this.elements.chatInput.focus();
                            
                            // Trigger input event to resize input if needed
                            const event = new Event('input', { bubbles: true });
                            this.elements.chatInput.dispatchEvent(event);
                        }
                    })
                    .catch(error => {
                        console.error('🎙️ Audio Chat: Transcription error:', error);
                        alert('Could not transcribe audio. Please try again or type your message.');
                    })
                    .finally(() => {
                        // Restore placeholder
                        this.elements.chatInput.placeholder = originalPlaceholder;
                    });
            };
        },
        
        // Transcribe audio to text
        transcribeAudio: function(base64Audio, audioBlob) {
            return new Promise((resolve, reject) => {
                console.log('🎙️ Audio Chat: Sending transcription request');
                
                // Create form data
                const formData = new FormData();
                formData.append('audio', audioBlob, 'recording.webm');
                
                // Send to backend
                fetch('/api/transcribe', {
                    method: 'POST',
                    body: formData
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Server error: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('🎙️ Audio Chat: Transcription result:', data);
                    
                    if (data.status === 'success' && data.text) {
                        resolve(data.text);
                    } else {
                        reject(new Error(data.message || 'Unknown transcription error'));
                    }
                })
                .catch(error => {
                    console.error('🎙️ Audio Chat: Transcription request failed:', error);
                    reject(error);
                });
            });
        }
    };
    
    // Initialize audio chat
    audioChat.init();
    
    // Make it globally available
    window.AudioChat = audioChat;
});
