/**
 * Podplay Build Sanctuary - Image Pasting Module
 * 
 * Features:
 * - Paste images from clipboard
 * - Display image preview
 * - Send images along with messages
 * 
 * Created by Mama Bear 🐻💜
 */

// Image pasting variables
let pastedImage = null;
let pastedImageBlob = null;

// DOM elements references
let chatInput = null;
let imagePreviewContainer = null;
let imagePreviewElement = null;

/**
 * Initialize image pasting functionality
 * @param {Object} options - Configuration options
 */
function initImagePasting(options = {}) {
    // Store references to DOM elements
    chatInput = document.getElementById(options.chatInputId || 'chat-input');
    
    console.log('🖼️ Image pasting: Initializing with elements', {
        chatInput: !!chatInput
    });
    
    // Create image pasting UI elements
    createImageUI();
    
    // Setup event listeners for paste events
    if (chatInput) {
        chatInput.addEventListener('paste', handlePaste);
        console.log('🖼️ Added paste listener to chat input');
    }
    
    // Add global paste event listener as well
    document.addEventListener('paste', handlePaste);
    console.log('🖼️ Added global paste listener');
    
    // Setup file upload button
    setupFileUploadButton();
}

/**
 * Create necessary UI elements for image pasting
 */
function createImageUI() {
    // Create image preview container
    imagePreviewContainer = document.createElement('div');
    imagePreviewContainer.id = 'image-preview-container';
    imagePreviewContainer.className = 'image-preview-container';
    imagePreviewContainer.style.display = 'none';
    
    // Create image preview element
    imagePreviewElement = document.createElement('img');
    imagePreviewElement.id = 'image-preview';
    imagePreviewElement.className = 'image-preview';
    
    // Create remove button
    const removeButton = document.createElement('button');
    removeButton.id = 'image-remove-btn';
    removeButton.className = 'image-remove-btn';
    removeButton.innerHTML = '<span class="material-icons">close</span>';
    removeButton.title = 'Remove image';
    removeButton.addEventListener('click', removeImage);
    
    // Assemble the elements
    imagePreviewContainer.appendChild(imagePreviewElement);
    imagePreviewContainer.appendChild(removeButton);
    
    // Add to the DOM
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        // If we have a form, insert before the input area
        chatForm.insertBefore(imagePreviewContainer, chatForm.firstChild);
    } else if (chatInput && chatInput.parentNode) {
        // Otherwise insert before the chat input
        chatInput.parentNode.insertBefore(imagePreviewContainer, chatInput);
    } else {
        // Last resort: add to body
        document.body.appendChild(imagePreviewContainer);
    }
    
    // Add CSS for image pasting UI
    const style = document.createElement('style');
    style.textContent = `
        .image-preview-container {
            max-width: 300px;
            max-height: 200px;
            margin-bottom: 10px;
            position: relative;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        
        .image-preview {
            max-width: 100%;
            max-height: 200px;
            display: block;
        }
        
        .image-remove-btn {
            position: absolute;
            top: 5px;
            right: 5px;
            width: 30px;
            height: 30px;
            background-color: rgba(0, 0, 0, 0.6);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            transition: background-color 0.2s;
        }
        
        .image-remove-btn:hover {
            background-color: rgba(231, 76, 60, 0.8);
        }
        
        .image-remove-btn .material-icons {
            font-size: 18px;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Handle paste events to detect and process images
 * @param {Event} e - Paste event
 */
function handlePaste(e) {
    // Check if we should handle this paste event
    // If focus is in a different input, don't handle
    if (document.activeElement !== chatInput && 
        (document.activeElement.tagName === 'INPUT' || 
         document.activeElement.tagName === 'TEXTAREA')) {
        return;
    }
    
    // Get clipboard data
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;
    
    // Check for images in clipboard items
    if (clipboardData.items) {
        for (let i = 0; i < clipboardData.items.length; i++) {
            const item = clipboardData.items[i];
            
            // Check if the item is an image
            if (item.type.indexOf('image') !== -1) {
                console.log('🖼️ Image found in clipboard:', item.type);
                
                // Get the image as a file blob
                const blob = item.getAsFile();
                if (blob) {
                    processImage(blob);
                    
                    // Prevent default paste behavior for text
                    e.preventDefault();
                    return;
                }
            }
        }
    }
    
    // Fallback: check files directly
    if (clipboardData.files && clipboardData.files.length > 0) {
        const file = clipboardData.files[0];
        if (file && file.type.indexOf('image') !== -1) {
            processImage(file);
            e.preventDefault();
            return;
        }
    }
}

/**
 * Process and display a pasted image
 * @param {Blob} blob - Image blob from clipboard
 */
function processImage(blob) {
    if (!blob) return;
    
    console.log('🖼️ Processing pasted image:', blob.size, 'bytes,', blob.type);
    
    // Store the image data
    pastedImageBlob = blob;
    
    // Create object URL for preview
    if (pastedImage) {
        URL.revokeObjectURL(pastedImage);
    }
    pastedImage = URL.createObjectURL(blob);
    
    // Update preview
    if (imagePreviewElement) {
        imagePreviewElement.src = pastedImage;
        imagePreviewContainer.style.display = 'block';
    }
    
    // Re-focus chat input
    if (chatInput) {
        chatInput.focus();
    }
}

/**
 * Remove the pasted image
 */
function removeImage() {
    console.log('🖼️ Removing pasted image');
    
    // Clear image data
    if (pastedImage) {
        URL.revokeObjectURL(pastedImage);
        pastedImage = null;
    }
    pastedImageBlob = null;
    
    // Hide preview
    if (imagePreviewContainer) {
        imagePreviewContainer.style.display = 'none';
    }
    
    // Re-focus chat input
    if (chatInput) {
        chatInput.focus();
    }
}

/**
 * Check if there's a pasted image
 * @returns {boolean} - Whether an image is available
 */
function hasImage() {
    return !!pastedImageBlob;
}

/**
 * Add the pasted image to a FormData object for upload
 * @param {FormData} formData - FormData object to add the image to
 * @returns {boolean} - Whether an image was added
 */
function addImageToFormData(formData) {
    if (!pastedImageBlob) return false;
    
    // Add the image to the form data
    formData.append('image', pastedImageBlob, 'pasted-image.png');
    
    // Clear the image after adding it
    removeImage();
    
    return true;
}

/**
 * Setup the file upload button functionality
 */
function setupFileUploadButton() {
    const fileButton = document.getElementById('file-btn');
    if (fileButton) {
        console.log('🖼️ Setting up file upload button');
        
        // Create hidden file input if it doesn't exist
        let fileInput = document.getElementById('hidden-file-input');
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'hidden-file-input';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
        }
        
        // Connect button to file input
        fileButton.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Handle file selection
        fileInput.addEventListener('change', (event) => {
            if (event.target.files && event.target.files[0]) {
                const file = event.target.files[0];
                if (file.type.startsWith('image/')) {
                    console.log('🖼️ File selected:', file.name);
                    
                    // Convert file to blob and display preview
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const imageBlob = new Blob([e.target.result], { type: file.type });
                        pastedImageBlob = imageBlob;
                        const imageUrl = URL.createObjectURL(imageBlob);
                        displayImagePreview(imageUrl);
                        
                        // Add visual feedback
                        fileButton.classList.add('active');
                        setTimeout(() => fileButton.classList.remove('active'), 1000);
                    };
                    reader.readAsArrayBuffer(file);
                }
            }
        });
    } else {
        console.warn('🖼️ File button not found');
    }
}

// Export functions for use in main chat module
window.ImagePasting = {
    init: initImagePasting,
    hasImage: hasImage,
    addImageToFormData: addImageToFormData,
    remove: removeImage
};
