/**
 * Podplay Build Sanctuary - Media Sharing Module
 * 
 * Features:
 * - Screen sharing functionality
 * - Video chat capabilities
 * 
 * Created by Mama Bear 🐻💜
 */

// Media sharing state
const mediaSharing = {
    isScreenSharing: false,
    isVideoActive: false,
    videoStream: null,
    screenStream: null,
    
    // DOM elements (will be populated on init)
    elements: {
        screenShareButton: null,
        videoButton: null,
        mediaContainer: null
    },
    
    // Initialize media sharing functionality
    init: function() {
        console.log('📺 Media Sharing: Initializing');
        
        // Find DOM elements
        this.elements.screenShareButton = document.getElementById('screenshare-btn');
        this.elements.videoButton = document.getElementById('video-btn');
        
        // Create media container if needed
        this.createMediaContainer();
        
        // Set up event listeners
        if (this.elements.screenShareButton) {
            this.elements.screenShareButton.addEventListener('click', this.toggleScreenShare.bind(this));
            console.log('📺 Media Sharing: Screen share button connected');
        }
        
        if (this.elements.videoButton) {
            this.elements.videoButton.addEventListener('click', this.toggleVideo.bind(this));
            console.log('📺 Media Sharing: Video button connected');
        }
    },
    
    // Create container for media displays
    createMediaContainer: function() {
        // Check if container already exists
        let container = document.getElementById('media-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'media-container';
            container.className = 'media-container';
            container.style.display = 'none';
            
            // Add to the DOM in the chat messages area
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) {
                chatMessages.parentNode.insertBefore(container, chatMessages);
            } else {
                document.body.appendChild(container);
            }
            
            // Add CSS
            const style = document.createElement('style');
            style.textContent = `
                .media-container {
                    width: 100%;
                    max-height: 300px;
                    background-color: #1a1a1a;
                    border-radius: 8px;
                    overflow: hidden;
                    margin-bottom: 16px;
                }
                
                .media-container video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                .media-container.active {
                    display: block !important;
                }
            `;
            document.head.appendChild(style);
        }
        
        this.elements.mediaContainer = container;
    },
    
    // Toggle screen sharing
    toggleScreenShare: async function() {
        try {
            if (this.isScreenSharing) {
                // Stop screen sharing
                if (this.screenStream) {
                    this.screenStream.getTracks().forEach(track => track.stop());
                    this.screenStream = null;
                }
                
                // Update UI
                this.elements.screenShareButton.classList.remove('active');
                console.log('📺 Media Sharing: Screen sharing stopped');
                
                // Hide container if no media is active
                if (!this.isVideoActive) {
                    this.elements.mediaContainer.style.display = 'none';
                    this.elements.mediaContainer.classList.remove('active');
                    this.removeVideo('screen-video');
                }
                
                this.isScreenSharing = false;
                
            } else {
                // Start screen sharing
                try {
                    this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                        video: true,
                        audio: false
                    });
                    
                    // Create video element for screen
                    const video = document.createElement('video');
                    video.id = 'screen-video';
                    video.autoplay = true;
                    video.srcObject = this.screenStream;
                    
                    // Show in container
                    this.elements.mediaContainer.style.display = 'block';
                    this.elements.mediaContainer.classList.add('active');
                    this.elements.mediaContainer.appendChild(video);
                    
                    // Update UI
                    this.elements.screenShareButton.classList.add('active');
                    
                    // Handle when user stops sharing via browser UI
                    this.screenStream.getVideoTracks()[0].onended = () => {
                        this.toggleScreenShare();
                    };
                    
                    console.log('📺 Media Sharing: Screen sharing started');
                    this.isScreenSharing = true;
                    
                } catch (err) {
                    console.warn('📺 Media Sharing: Screen sharing error:', err);
                    alert('Could not start screen sharing: ' + err.message);
                }
            }
        } catch (err) {
            console.error('📺 Media Sharing: Toggle screen error:', err);
        }
    },
    
    // Toggle video
    toggleVideo: async function() {
        try {
            if (this.isVideoActive) {
                // Stop video
                if (this.videoStream) {
                    this.videoStream.getTracks().forEach(track => track.stop());
                    this.videoStream = null;
                }
                
                // Update UI
                this.elements.videoButton.classList.remove('active');
                console.log('📺 Media Sharing: Video stopped');
                
                // Hide container if no media is active
                if (!this.isScreenSharing) {
                    this.elements.mediaContainer.style.display = 'none';
                    this.elements.mediaContainer.classList.remove('active');
                    this.removeVideo('user-video');
                }
                
                this.isVideoActive = false;
                
            } else {
                // Start video
                try {
                    this.videoStream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: false
                    });
                    
                    // Create video element for user
                    const video = document.createElement('video');
                    video.id = 'user-video';
                    video.autoplay = true;
                    video.muted = true; // Mute to prevent feedback
                    video.srcObject = this.videoStream;
                    
                    // Show in container
                    this.elements.mediaContainer.style.display = 'block';
                    this.elements.mediaContainer.classList.add('active');
                    this.elements.mediaContainer.appendChild(video);
                    
                    // Update UI
                    this.elements.videoButton.classList.add('active');
                    console.log('📺 Media Sharing: Video started');
                    this.isVideoActive = true;
                    
                } catch (err) {
                    console.warn('📺 Media Sharing: Video error:', err);
                    alert('Could not start video: ' + err.message);
                }
            }
        } catch (err) {
            console.error('📺 Media Sharing: Toggle video error:', err);
        }
    },
    
    // Remove video element
    removeVideo: function(id) {
        const video = document.getElementById(id);
        if (video) {
            video.srcObject = null;
            video.remove();
        }
    }
};

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    mediaSharing.init();
});

// Export functions for use in main chat module
window.MediaSharing = {
    init: function() {
        mediaSharing.init();
    },
    toggleScreenShare: function() {
        mediaSharing.toggleScreenShare();
    },
    toggleVideo: function() {
        mediaSharing.toggleVideo();
    }
};
