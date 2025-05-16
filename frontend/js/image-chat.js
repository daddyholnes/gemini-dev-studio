/**
 * Podplay Build Sanctuary - Image Chat Integration
 * 
 * A simplified, reliable image pasting system for the Podplay Build chat interface.
 * 
 * Created by Mama Bear 🐻💜
 */

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🖼️ Image Chat: Initializing');
    
    // Image chat state
    const imageChat = {
        pastedImage: null,
        pastedImageBlob: null,
        
        // DOM elements (will be populated on init)
        elements: {
            chatInput: null,
            previewContainer: null
        },
        
        // Initialize image chat functionality
        init: function() {
            // Find DOM elements
            this.elements.chatInput = document.getElementById('chat-input');
            
            // Create image preview container
            this.createPreviewContainer();
            
            // Set up paste event listeners
            if (this.elements.chatInput) {
                this.elements.chatInput.addEventListener('paste', this.handlePaste.bind(this));
                console.log('🖼️ Image Chat: Paste event listener added to chat input');
            } else {
                console.warn('🖼️ Image Chat: Chat input not found');
            }
            
            // Add global paste event listener (for when chat input isn't focused)
            document.addEventListener('paste', (e) => {
                // Only handle global pastes if chat input isn't the active element
                if (document.activeElement !== this.elements.chatInput) {
                    this.handlePaste(e);
                }
            });
        },
        
        // Create the image preview container
        createPreviewContainer: function() {
            // Remove existing container if any
            const existingContainer = document.getElementById('image-preview-container');
            if (existingContainer) {
                existingContainer.remove();
            }
            
            // Create new container
            const container = document.createElement('div');
            container.id = 'image-preview-container';
            container.className = 'image-preview-container';
            container.style.display = 'none';
            
            // Style the container
            container.style.maxWidth = '300px';
            container.style.marginBottom = '10px';
            container.style.position = 'relative';
            container.style.borderRadius = '8px';
            container.style.overflow = 'hidden';
            container.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
            
            // Create image element
            const image = document.createElement('img');
            image.id = 'image-preview';
            image.className = 'image-preview';
            image.style.maxWidth = '100%';
            image.style.display = 'block';
            
            // Create remove button
            const removeButton = document.createElement('button');
            removeButton.id = 'image-remove-btn';
            removeButton.className = 'image-remove-btn';
            removeButton.innerHTML = '<span class="material-icons">close</span>';
            removeButton.title = 'Remove image';
            
            // Style the remove button
            removeButton.style.position = 'absolute';
            removeButton.style.top = '5px';
            removeButton.style.right = '5px';
            removeButton.style.width = '30px';
            removeButton.style.height = '30px';
            removeButton.style.backgroundColor = 'rgba(0,0,0,0.6)';
            removeButton.style.color = 'white';
            removeButton.style.border = 'none';
            removeButton.style.borderRadius = '50%';
            removeButton.style.cursor = 'pointer';
            removeButton.style.display = 'flex';
            removeButton.style.alignItems = 'center';
            removeButton.style.justifyContent = 'center';
            removeButton.style.padding = '0';
            
            // Add remove button event listener
            removeButton.addEventListener('click', this.removeImage.bind(this));
            
            // Assemble the container
            container.appendChild(image);
            container.appendChild(removeButton);
            
            // Find a good place to add the container in the DOM
            const chatForm = document.getElementById('chat-form');
            if (chatForm) {
                chatForm.insertBefore(container, chatForm.firstChild);
            } else if (this.elements.chatInput && this.elements.chatInput.parentElement) {
                this.elements.chatInput.parentElement.insertBefore(container, this.elements.chatInput);
            } else {
                document.body.appendChild(container);
            }
            
            // Store reference
            this.elements.previewContainer = container;
        },
        
        // Handle paste event
        handlePaste: function(e) {
            console.log('🖼️ Image Chat: Paste event detected');
            
            // Get clipboard data
            const clipboardData = e.clipboardData || window.clipboardData;
            if (!clipboardData) {
                console.warn('🖼️ Image Chat: No clipboard data available');
                return;
            }
            
            // Check for images in clipboard
            let foundImage = false;
            
            // Check for items in clipboard (modern browsers)
            if (clipboardData.items) {
                for (let i = 0; i < clipboardData.items.length; i++) {
                    const item = clipboardData.items[i];
                    
                    if (item.type.indexOf('image') !== -1) {
                        console.log('🖼️ Image Chat: Found image in clipboard items:', item.type);
                        
                        const blob = item.getAsFile();
                        if (blob) {
                            this.processImage(blob);
                            foundImage = true;
                            
                            // Stop further handling to prevent text paste
                            e.preventDefault();
                            break;
                        }
                    }
                }
            }
            
            // Fall back to files (some browsers)
            if (!foundImage && clipboardData.files && clipboardData.files.length > 0) {
                const file = clipboardData.files[0];
                if (file && file.type.indexOf('image') !== -1) {
                    console.log('🖼️ Image Chat: Found image in clipboard files:', file.type);
                    this.processImage(file);
                    foundImage = true;
                    e.preventDefault();
                }
            }
            
            if (!foundImage) {
                console.log('🖼️ Image Chat: No image found in clipboard data');
            }
        },
        
        // Process the pasted image
        processImage: function(blob) {
            console.log('🖼️ Image Chat: Processing image', blob.size, 'bytes,', blob.type);
            
            // Store the image data
            this.pastedImageBlob = blob;
            
            // Create object URL for preview
            if (this.pastedImage) {
                URL.revokeObjectURL(this.pastedImage);
            }
            this.pastedImage = URL.createObjectURL(blob);
            
            // Update image preview
            const previewImage = document.getElementById('image-preview');
            if (previewImage) {
                previewImage.src = this.pastedImage;
                this.elements.previewContainer.style.display = 'block';
            }
            
            // Re-focus chat input
            if (this.elements.chatInput) {
                this.elements.chatInput.focus();
            }
        },
        
        // Remove the pasted image
        removeImage: function() {
            console.log('🖼️ Image Chat: Removing image');
            
            // Clear image data
            if (this.pastedImage) {
                URL.revokeObjectURL(this.pastedImage);
                this.pastedImage = null;
            }
            this.pastedImageBlob = null;
            
            // Hide preview container
            if (this.elements.previewContainer) {
                this.elements.previewContainer.style.display = 'none';
            }
            
            // Re-focus chat input
            if (this.elements.chatInput) {
                this.elements.chatInput.focus();
            }
        },
        
        // Check if there's a pasted image
        hasImage: function() {
            return !!this.pastedImageBlob;
        },
        
        // Get the image blob
        getImageBlob: function() {
            return this.pastedImageBlob;
        },
        
        // Add image to a FormData object for sending
        addToFormData: function(formData) {
            if (!this.pastedImageBlob) {
                return false;
            }
            
            formData.append('image', this.pastedImageBlob, 'pasted-image.png');
            
            // Clear the image after adding it to form data
            this.removeImage();
            
            return true;
        }
    };
    
    // Initialize image chat
    imageChat.init();
    
    // Make it globally available
    window.ImageChat = imageChat;
});
