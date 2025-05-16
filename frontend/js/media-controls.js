/**
 * Podplay Build Sanctuary - Media Controls Module
 * 
 * Handles all media functionality including:
 * - Audio recording with transcription
 * - File uploads (images, documents)
 * - Screen sharing
 * - Video chat
 * 
 * Created by Mama Bear 🐻💜
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎛️ Media Controls: Initializing');
    
    // Get media control buttons
    const micButton = document.getElementById('mic-btn');
    const fileButton = document.getElementById('file-btn');
    const screenShareButton = document.getElementById('screenshare-btn');
    const videoButton = document.getElementById('video-btn');
    
    // Initialize audio recording functionality
    if (micButton) {
        micButton.addEventListener('click', function() {
            toggleAudioRecording();
        });
    }
    
    // Initialize file upload
    if (fileButton) {
        // Create hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'hidden-file-input';
        fileInput.accept = 'image/*,audio/*,video/*,application/pdf';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        // Set up file button to trigger file input
        fileButton.addEventListener('click', function() {
            fileInput.click();
        });
        
        // Handle file selection
        fileInput.addEventListener('change', function(event) {
            if (event.target.files && event.target.files[0]) {
                const file = event.target.files[0];
                
                // Visual feedback
                fileButton.classList.add('active');
                setTimeout(() => fileButton.classList.remove('active'), 1000);
                
                // Process based on file type
                if (file.type.startsWith('image/')) {
                    handleImageUpload(file);
                } else if (file.type.startsWith('audio/')) {
                    handleAudioUpload(file);
                } else if (file.type.startsWith('video/')) {
                    handleVideoUpload(file);
                } else {
                    handleDocumentUpload(file);
                }
            }
        });
    }
    
    // Initialize screen sharing
    if (screenShareButton) {
        screenShareButton.addEventListener('click', function() {
            toggleScreenSharing();
        });
    }
    
    // Initialize video chat
    if (videoButton) {
        videoButton.addEventListener('click', function() {
            toggleVideoChat();
        });
    }
    
    /**
     * Toggle audio recording
     */
    function toggleAudioRecording() {
        console.log('🎙️ Toggling audio recording');
        // Use the existing AudioRecording module if available
        if (window.AudioRecording && typeof window.AudioRecording.toggle === 'function') {
            window.AudioRecording.toggle();
        } else {
            console.warn('🎙️ Audio recording module not available');
            micButton.classList.add('active');
            setTimeout(() => micButton.classList.remove('active'), 1000);
        }
    }
    
    /**
     * Handle image uploads
     */
    function handleImageUpload(file) {
        console.log('🖼️ Processing image upload:', file.name);
        // Create preview if available
        const imageUrl = URL.createObjectURL(file);
        
        // Show preview if available
        if (window.ImagePasting && typeof window.ImagePasting.displayPreview === 'function') {
            window.ImagePasting.displayPreview(imageUrl);
        } else {
            console.warn('🖼️ Image preview module not available');
            
            // Create simple preview
            let previewContainer = document.getElementById('image-preview-container');
            if (!previewContainer) {
                previewContainer = document.createElement('div');
                previewContainer.id = 'image-preview-container';
                previewContainer.style.maxWidth = '300px';
                previewContainer.style.margin = '10px 0';
                previewContainer.style.position = 'relative';
                
                // Add to chat form
                const chatForm = document.getElementById('chat-form');
                if (chatForm) {
                    chatForm.insertBefore(previewContainer, chatForm.firstChild);
                }
            }
            
            // Clear previous previews
            previewContainer.innerHTML = '';
            
            // Create image element
            const img = document.createElement('img');
            img.src = imageUrl;
            img.style.maxWidth = '100%';
            img.style.borderRadius = '8px';
            previewContainer.appendChild(img);
            
            // Add remove button
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '❌';
            removeBtn.style.position = 'absolute';
            removeBtn.style.top = '5px';
            removeBtn.style.right = '5px';
            removeBtn.style.backgroundColor = 'rgba(0,0,0,0.6)';
            removeBtn.style.color = 'white';
            removeBtn.style.border = 'none';
            removeBtn.style.borderRadius = '50%';
            removeBtn.style.width = '30px';
            removeBtn.style.height = '30px';
            removeBtn.style.cursor = 'pointer';
            removeBtn.onclick = function() {
                previewContainer.innerHTML = '';
                previewContainer.style.display = 'none';
            };
            previewContainer.appendChild(removeBtn);
            
            // Show container
            previewContainer.style.display = 'block';
        }
    }
    
    /**
     * Handle audio uploads
     */
    function handleAudioUpload(file) {
        console.log('🎵 Processing audio upload:', file.name);
        
        // Create audio player
        const audioPlayer = document.createElement('audio');
        audioPlayer.controls = true;
        audioPlayer.src = URL.createObjectURL(file);
        audioPlayer.style.width = '100%';
        audioPlayer.style.marginBottom = '10px';
        
        // Add to chat input area
        const chatInput = document.getElementById('chat-input');
        if (chatInput && chatInput.parentNode) {
            chatInput.parentNode.insertBefore(audioPlayer, chatInput);
        }
    }
    
    /**
     * Handle video uploads
     */
    function handleVideoUpload(file) {
        console.log('🎬 Processing video upload:', file.name);
        
        // Create video player
        const videoPlayer = document.createElement('video');
        videoPlayer.controls = true;
        videoPlayer.src = URL.createObjectURL(file);
        videoPlayer.style.width = '100%';
        videoPlayer.style.maxHeight = '200px';
        videoPlayer.style.marginBottom = '10px';
        
        // Add to chat input area
        const chatInput = document.getElementById('chat-input');
        if (chatInput && chatInput.parentNode) {
            chatInput.parentNode.insertBefore(videoPlayer, chatInput);
        }
    }
    
    /**
     * Handle document uploads
     */
    function handleDocumentUpload(file) {
        console.log('📄 Processing document upload:', file.name);
        
        // Show document info
        const docInfo = document.createElement('div');
        docInfo.className = 'document-preview';
        docInfo.innerHTML = `
            <div style="display: flex; align-items: center; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                <div style="margin-right: 10px; font-size: 24px;">📄</div>
                <div>
                    <div style="font-weight: bold;">${file.name}</div>
                    <div style="font-size: 12px; opacity: 0.7;">${(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <button id="remove-doc-btn" style="margin-left: auto; background: none; border: none; color: white; cursor: pointer;">❌</button>
            </div>
        `;
        
        // Add to chat input area
        const chatInput = document.getElementById('chat-input');
        if (chatInput && chatInput.parentNode) {
            chatInput.parentNode.insertBefore(docInfo, chatInput);
            
            // Add remove functionality
            document.getElementById('remove-doc-btn').addEventListener('click', function() {
                docInfo.remove();
            });
        }
    }
    
    /**
     * Toggle screen sharing
     */
    function toggleScreenSharing() {
        console.log('🖥️ Toggling screen sharing');
        
        // Visual feedback
        screenShareButton.classList.toggle('active');
        
        // Check if we already have screen sharing module
        if (window.MediaSharing && typeof window.MediaSharing.toggleScreenShare === 'function') {
            window.MediaSharing.toggleScreenShare();
        } else {
            // Fallback implementation
            if (screenShareButton.classList.contains('active')) {
                startScreenCapture();
            } else {
                stopScreenCapture();
            }
        }
    }
    
    // Screen sharing variables
    let screenStream = null;
    let screenVideo = null;
    
    /**
     * Start screen capture
     */
    async function startScreenCapture() {
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false
            });
            
            // Create video element for display
            screenVideo = document.createElement('video');
            screenVideo.id = 'screen-share-video';
            screenVideo.autoplay = true;
            screenVideo.style.width = '100%';
            screenVideo.style.maxHeight = '300px';
            screenVideo.style.backgroundColor = '#000';
            screenVideo.style.borderRadius = '8px';
            screenVideo.style.marginBottom = '16px';
            
            // Set source
            screenVideo.srcObject = screenStream;
            
            // Add to chat messages container
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) {
                chatMessages.parentNode.insertBefore(screenVideo, chatMessages);
            }
            
            // Handle user stopping via browser UI
            screenStream.getVideoTracks()[0].onended = function() {
                stopScreenCapture();
                screenShareButton.classList.remove('active');
            };
            
        } catch (err) {
            console.error('Screen sharing error:', err);
            screenShareButton.classList.remove('active');
        }
    }
    
    /**
     * Stop screen capture
     */
    function stopScreenCapture() {
        if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
            screenStream = null;
        }
        
        if (screenVideo) {
            screenVideo.remove();
            screenVideo = null;
        }
    }
    
    /**
     * Toggle video chat
     */
    function toggleVideoChat() {
        console.log('📹 Toggling video chat');
        
        // Visual feedback
        videoButton.classList.toggle('active');
        
        // Check if we already have video module
        if (window.MediaSharing && typeof window.MediaSharing.toggleVideo === 'function') {
            window.MediaSharing.toggleVideo();
        } else {
            // Fallback implementation
            if (videoButton.classList.contains('active')) {
                startVideoCapture();
            } else {
                stopVideoCapture();
            }
        }
    }
    
    // Video chat variables
    let videoStream = null;
    let videoElement = null;
    
    /**
     * Start video capture
     */
    async function startVideoCapture() {
        try {
            videoStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });
            
            // Create video element for display
            videoElement = document.createElement('video');
            videoElement.id = 'user-video';
            videoElement.autoplay = true;
            videoElement.muted = true; // Prevent feedback
            videoElement.style.width = '100%';
            videoElement.style.maxHeight = '200px';
            videoElement.style.backgroundColor = '#000';
            videoElement.style.borderRadius = '8px';
            videoElement.style.marginBottom = '16px';
            
            // Set source
            videoElement.srcObject = videoStream;
            
            // Add to chat messages container
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) {
                chatMessages.parentNode.insertBefore(videoElement, chatMessages);
            }
            
        } catch (err) {
            console.error('Video chat error:', err);
            videoButton.classList.remove('active');
        }
    }
    
    /**
     * Stop video capture
     */
    function stopVideoCapture() {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }
        
        if (videoElement) {
            videoElement.remove();
            videoElement = null;
        }
    }
});
