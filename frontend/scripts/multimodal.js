// multimodal.js - Enhanced chat capabilities for Mama Bear
document.addEventListener('DOMContentLoaded', () => {
    // Get UI elements
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    const modelSelector = document.getElementById('model-selector');
    
    // Add multimodal buttons
    const chatControls = document.querySelector('.chat-controls');
    if (chatControls) {
        const multimodalButtons = document.createElement('div');
        multimodalButtons.className = 'flex gap-2 items-center ml-2';
        multimodalButtons.innerHTML = `
            <button id="mic-btn" class="btn btn-circle btn-sm" title="Record Audio">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            </button>
            <button id="camera-btn" class="btn btn-circle btn-sm" title="Take Picture">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
            <button id="screen-btn" class="btn btn-circle btn-sm" title="Share Screen">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </button>
            <button id="file-btn" class="btn btn-circle btn-sm" title="Upload Files">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            </button>
        `;
        
        chatControls.appendChild(multimodalButtons);
    }
    
    // Set up file upload
    document.getElementById('file-btn')?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,audio/*,video/*,application/pdf,text/plain';
        input.multiple = true;
        
        input.onchange = async (e) => {
            const files = e.target.files;
            if (!files.length) return;
            
            // Show files in chat as being uploaded
            const messageDiv = document.createElement('div');
            messageDiv.className = 'chat-message user-message';
            
            let filesList = '<div class="file-uploads">';
            for (const file of files) {
                filesList += `<div class="file-item"><span class="file-name">${file.name}</span> (${(file.size / 1024).toFixed(1)} KB)</div>`;
            }
            filesList += '</div>';
            
            messageDiv.innerHTML = `
                <div class="sender">You</div>
                <div class="content">
                    ${filesList}
                    <div class="upload-status">Uploading...</div>
                </div>
                <div class="timestamp">${new Date().toLocaleTimeString()}</div>
            `;
            
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Create form data
            const formData = new FormData();
            formData.append('model_name', modelSelector ? modelSelector.value : 'mama-bear-2.5');
            
            for (const file of files) {
                formData.append('files', file);
            }
            
            // Add any text from the chat input
            const textInput = chatInput.value.trim();
            if (textInput) {
                formData.append('message', textInput);
                chatInput.value = '';
            }
            
            try {
                // Send to backend
                const response = await fetch('/api/agentic/chat', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                // Update upload status
                messageDiv.querySelector('.upload-status').textContent = 'Uploaded';
                
                // Add Mama Bear's response
                addMamaBearResponse(data.text || 'I received your files!');
            } catch (error) {
                console.error('Error uploading files:', error);
                messageDiv.querySelector('.upload-status').textContent = 'Error: ' + error.message;
            }
        };
        
        input.click();
    });
    
    // Set up audio recording
    let audioRecorder = null;
    let audioChunks = [];
    
    document.getElementById('mic-btn')?.addEventListener('click', async () => {
        // Already recording? Stop and send
        if (audioRecorder && audioRecorder.state === 'recording') {
            audioRecorder.stop();
            return;
        }
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Show recording indicator
            const micBtn = document.getElementById('mic-btn');
            micBtn.classList.add('recording');
            
            // Add visual feedback
            const style = document.createElement('style');
            style.textContent = `
                .recording {
                    animation: pulse 1.5s infinite;
                    border: 2px solid #ff3e3e;
                }
                
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(255, 62, 62, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(255, 62, 62, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 62, 62, 0); }
                }
            `;
            document.head.appendChild(style);
            
            // Set up recorder
            audioRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            audioRecorder.ondataavailable = (e) => {
                audioChunks.push(e.data);
            };
            
            audioRecorder.onstop = async () => {
                // Remove recording indicator
                micBtn.classList.remove('recording');
                
                // Prepare audio blob
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                
                // Show in chat
                const messageDiv = document.createElement('div');
                messageDiv.className = 'chat-message user-message';
                messageDiv.innerHTML = `
                    <div class="sender">You</div>
                    <div class="content">
                        <div class="audio-message">
                            🎤 Audio recording (${(audioBlob.size / 1024).toFixed(1)} KB)
                            <audio controls src="${URL.createObjectURL(audioBlob)}"></audio>
                        </div>
                        <div class="upload-status">Processing...</div>
                    </div>
                    <div class="timestamp">${new Date().toLocaleTimeString()}</div>
                `;
                
                chatMessages.appendChild(messageDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
                // Upload the audio
                const formData = new FormData();
                formData.append('model_name', modelSelector ? modelSelector.value : 'mama-bear-2.5');
                formData.append('audio', audioBlob, 'recording.webm');
                
                try {
                    const response = await fetch('/api/agentic/chat', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await response.json();
                    
                    // Update status
                    messageDiv.querySelector('.upload-status').textContent = 'Processed';
                    
                    // Add Mama Bear's response
                    addMamaBearResponse(data.text || 'I received your audio!');
                } catch (error) {
                    console.error('Error uploading audio:', error);
                    messageDiv.querySelector('.upload-status').textContent = 'Error: ' + error.message;
                }
                
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };
            
            // Start recording
            audioRecorder.start();
            
            // Auto-stop after 60 seconds
            setTimeout(() => {
                if (audioRecorder.state === 'recording') {
                    audioRecorder.stop();
                }
            }, 60000);
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone: ' + error.message);
        }
    });
    
    // Helper function to add Mama Bear's response
    function addMamaBearResponse(text) {
        const responseDiv = document.createElement('div');
        responseDiv.className = 'chat-message agent-message';
        responseDiv.innerHTML = `
            <div class="sender">Mama Bear</div>
            <div class="content">${text}</div>
            <div class="timestamp">${new Date().toLocaleTimeString()}</div>
        `;
        
        chatMessages.appendChild(responseDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Add drag-and-drop support for files
    const dragDropOverlay = document.createElement('div');
    dragDropOverlay.id = 'drag-drop-overlay';
    dragDropOverlay.className = 'hidden fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50';
    dragDropOverlay.innerHTML = `
        <div class="bg-gray-800 p-8 rounded-lg text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <h3 class="text-xl font-bold text-white mb-2">Drop Files to Share with Mama Bear</h3>
            <p class="text-gray-300">Release to upload your files</p>
        </div>
    `;
    document.body.appendChild(dragDropOverlay);
    
    // Handle drag and drop events
    document.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragDropOverlay.classList.remove('hidden');
    });
    
    document.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (e.relatedTarget === null || !document.body.contains(e.relatedTarget)) {
            dragDropOverlay.classList.add('hidden');
        }
    });
    
    dragDropOverlay.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragDropOverlay.classList.add('hidden');
    });
    
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        dragDropOverlay.classList.add('hidden');
        
        const files = e.dataTransfer.files;
        if (files.length === 0) return;
        
        // Handle dropped files similar to the file upload button
        const formData = new FormData();
        formData.append('model_name', modelSelector ? modelSelector.value : 'mama-bear-2.5');
        
        // Show files in chat
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message user-message';
        
        let filesList = '<div class="file-uploads">';
        for (const file of files) {
            filesList += `<div class="file-item"><span class="file-name">${file.name}</span> (${(file.size / 1024).toFixed(1)} KB)</div>`;
            formData.append('files', file);
        }
        filesList += '</div>';
        
        messageDiv.innerHTML = `
            <div class="sender">You</div>
            <div class="content">
                ${filesList}
                <div class="upload-status">Uploading...</div>
            </div>
            <div class="timestamp">${new Date().toLocaleTimeString()}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Send to backend
        fetch('/api/agentic/chat', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // Update upload status
            messageDiv.querySelector('.upload-status').textContent = 'Uploaded';
            
            // Add Mama Bear's response
            addMamaBearResponse(data.text || 'I received your files!');
        })
        .catch(error => {
            console.error('Error uploading dropped files:', error);
            messageDiv.querySelector('.upload-status').textContent = 'Error: ' + error.message;
        });
    });
});