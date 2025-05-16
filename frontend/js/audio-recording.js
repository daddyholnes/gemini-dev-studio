/**
 * Podplay Build Sanctuary - Audio Recording Module
 * 
 * Features:
 * - Record audio from microphone
 * - Show visual feedback during recording
 * - Transcribe audio to text
 * - Send audio along with messages
 * 
 * Created by Mama Bear 🐻💜
 */

// Audio recording variables
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingTimer = null;
let recordingSeconds = 0;
let visualizationActive = false;

// DOM elements references
let chatInput = null;
let recordButton = null;
let recordingIndicator = null;
let audioVisualizer = null;
let transcribeButton = null;

/**
 * Initialize audio recording functionality
 * @param {Object} options - Configuration options
 */
function initAudioRecording(options = {}) {
    // Store references to DOM elements
    chatInput = document.getElementById(options.chatInputId || 'chat-input');
    recordButton = document.getElementById(options.recordButtonId || 'voice-btn');
    
    console.log('🎙️ Audio recording: Initializing with elements', {
        chatInput: !!chatInput,
        recordButton: !!recordButton
    });
    
    // Create audio recording UI elements
    createAudioUI();
    
    // Set up event listeners
    if (recordButton) {
        recordButton.addEventListener('click', toggleRecording);
        console.log('🎙️ Added click listener to record button');
    }
    
    if (transcribeButton) {
        transcribeButton.addEventListener('click', startTranscription);
    }
}

/**
 * Create necessary UI elements for audio recording
 */
function createAudioUI() {
    // Create recording indicator
    recordingIndicator = document.createElement('div');
    recordingIndicator.id = 'recording-indicator';
    recordingIndicator.className = 'recording-indicator';
    recordingIndicator.innerHTML = 'Recording audio...';
    recordingIndicator.style.display = 'none';
    
    // Create audio visualizer
    audioVisualizer = document.createElement('div');
    audioVisualizer.id = 'audio-visualizer';
    audioVisualizer.className = 'audio-visualizer';
    audioVisualizer.style.display = 'none';
    
    // Create transcribe button
    transcribeButton = document.createElement('button');
    transcribeButton.id = 'transcribe-btn';
    transcribeButton.className = 'transcribe-btn';
    transcribeButton.innerHTML = '<span class="material-icons">translate</span>';
    transcribeButton.title = 'Transcribe audio to text';
    transcribeButton.style.display = 'none';
    
    // Add elements to the DOM
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        // Add recording indicator near the top of the form
        chatForm.parentNode.insertBefore(recordingIndicator, chatForm);
        
        // Add visualizer before the input
        if (chatInput) {
            chatInput.parentNode.insertBefore(audioVisualizer, chatInput);
        }
        
        // Add transcribe button near the voice button
        if (recordButton && recordButton.parentNode) {
            recordButton.parentNode.insertBefore(transcribeButton, recordButton.nextSibling);
        }
    } else {
        // Fallback: add to body
        document.body.appendChild(recordingIndicator);
        document.body.appendChild(audioVisualizer);
        document.body.appendChild(transcribeButton);
    }
    
    // Add CSS for audio recording UI
    const style = document.createElement('style');
    style.textContent = `
        .recording-indicator {
            color: #e74c3c;
            font-weight: bold;
            padding: 4px 8px;
            border-radius: 4px;
            background-color: rgba(231, 76, 60, 0.1);
            margin-bottom: 8px;
            text-align: center;
            animation: pulse 1.5s infinite;
        }
        
        .audio-visualizer {
            height: 30px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        
        .audio-visualizer .bar {
            width: 3px;
            background-color: #3498db;
            border-radius: 1px;
            height: 5px;
            margin: 0 1px;
        }
        
        .transcribe-btn {
            border: none;
            background: none;
            color: #7f8c8d;
            cursor: pointer;
            margin-left: 8px;
            padding: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        
        .transcribe-btn:hover {
            color: #3498db;
        }
        
        #voice-btn.recording {
            color: #e74c3c;
            animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Toggle recording state (start/stop)
 */
function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

/**
 * Start recording audio from the microphone
 */
function startRecording() {
    if (isRecording) return;
    
    console.log('🎙️ Audio recording: Starting recording');
    
    // Request microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            isRecording = true;
            audioChunks = [];
            
            // Show recording UI
            if (recordingIndicator) {
                recordingIndicator.style.display = 'block';
            }
            if (recordButton) {
                recordButton.classList.add('recording');
            }
            
            // Hide transcribe button while recording
            if (transcribeButton) {
                transcribeButton.style.display = 'none';
            }
            
            // Create media recorder
            mediaRecorder = new MediaRecorder(stream);
            
            // Handle data available event
            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };
            
            // Start the recording
            mediaRecorder.start(100); // Collect data in 100ms chunks
            
            // Setup audio visualization
            setupAudioVisualizer(stream);
            
            // Setup recording timer
            recordingSeconds = 0;
            recordingTimer = setInterval(() => {
                recordingSeconds++;
                
                // Auto-stop after 2 minutes to prevent very large audio files
                if (recordingSeconds >= 120) {
                    stopRecording();
                }
            }, 1000);
        })
        .catch(error => {
            console.error('🎙️ Error accessing microphone:', error);
            alert(`Could not access your microphone: ${error.message}. Please check your browser permissions.`);
        });
}

/**
 * Set up audio visualization
 * @param {MediaStream} stream - Media stream from getUserMedia
 */
function setupAudioVisualizer(stream) {
    // Skip if we don't have an audio visualizer element
    if (!audioVisualizer) return;
    
    // Clear existing bars
    audioVisualizer.innerHTML = '';
    audioVisualizer.style.display = 'flex';
    
    // Create audio context and analyzer
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Connect the audio to the analyzer
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    // Create bars for visualization
    for (let i = 0; i < 32; i++) {
        const bar = document.createElement('div');
        bar.className = 'bar';
        audioVisualizer.appendChild(bar);
    }
    
    // Start visualization loop
    visualizationActive = true;
    visualize();
    
    function visualize() {
        if (!visualizationActive) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        const bars = audioVisualizer.querySelectorAll('.bar');
        for (let i = 0; i < bars.length; i++) {
            const barHeight = Math.max(5, dataArray[i * 2] / 3);
            bars[i].style.height = barHeight + 'px';
        }
        
        requestAnimationFrame(visualize);
    }
}

/**
 * Stop recording audio
 */
function stopRecording() {
    if (!isRecording || !mediaRecorder) return;
    
    console.log('🎙️ Audio recording: Stopping recording');
    
    isRecording = false;
    visualizationActive = false;
    
    // Hide recording UI
    if (recordingIndicator) {
        recordingIndicator.style.display = 'none';
    }
    if (audioVisualizer) {
        audioVisualizer.style.display = 'none';
    }
    if (recordButton) {
        recordButton.classList.remove('recording');
    }
    
    // Stop the timer
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    
    // Stop the media recorder
    if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        
        // Process the recorded audio
        mediaRecorder.onstop = () => {
            // Stop all audio tracks
            if (mediaRecorder.stream) {
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
            
            console.log('🎙️ Audio recording stopped, chunks:', audioChunks.length);
            
            if (audioChunks.length === 0) return;
            
            // Show the transcribe button
            if (transcribeButton) {
                transcribeButton.style.display = 'inline-block';
            }
        };
    }
}

/**
 * Start transcription of recorded audio
 */
function startTranscription() {
    if (audioChunks.length === 0) {
        console.warn('🎙️ No audio data to transcribe');
        return;
    }
    
    console.log('🎙️ Starting transcription with', audioChunks.length, 'chunks');
    
    // Hide transcribe button during processing
    if (transcribeButton) {
        transcribeButton.style.display = 'none';
    }
    
    // Show loading in chat input
    if (chatInput) {
        const originalPlaceholder = chatInput.placeholder;
        chatInput.placeholder = 'Transcribing audio...';
        
        // Create audio blob
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        // Create form data for upload
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        // Send to backend
        fetch('/api/transcribe', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('🎙️ Transcription result:', data);
            
            // Update chat input with transcription
            if (chatInput && data.text) {
                chatInput.value = data.text;
                chatInput.focus();
                
                // Trigger input event to resize input if needed
                const event = new Event('input', { bubbles: true });
                chatInput.dispatchEvent(event);
            }
        })
        .catch(error => {
            console.error('🎙️ Transcription error:', error);
            alert(`Error transcribing audio: ${error.message}`);
        })
        .finally(() => {
            // Restore chat input
            if (chatInput) {
                chatInput.placeholder = originalPlaceholder;
            }
        });
    }
}

// Export functions for use in main chat module
window.AudioRecording = {
    init: initAudioRecording,
    start: startRecording,
    stop: stopRecording,
    toggle: toggleRecording,
    transcribe: startTranscription
};
