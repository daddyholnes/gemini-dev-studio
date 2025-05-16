/**
 * Podplay Build Sanctuary - Multimodal Integration Module
 * 
 * Provides utilities and helpers for multimodal interactions:
 * - Audio processing and transcription
 * - Image handling and processing
 * - Video management
 * 
 * Created by Mama Bear 🐻💜
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Multimodal support initialized!');
    
    // Define the MultiModal namespace
    window.MultiModal = {
        // Audio functionality
        audio: {
            // Convert audio blob to base64
            blobToBase64: function(blob) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = function() {
                        const base64data = reader.result.split(',')[1];
                        resolve(base64data);
                    };
                    reader.onerror = function(error) {
                        reject(error);
                    };
                    reader.readAsDataURL(blob);
                });
            },
            
            // Process audio for transcription
            processAudioForTranscription: function(audioBlob) {
                // Return a promise that resolves with the transcription
                return new Promise(function(resolve, reject) {
                    console.log('Processing audio for transcription', audioBlob.size);
                    
                    // Create form data
                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'recording.webm');
                    
                    // Send to backend
                    fetch('/api/transcribe', {
                        method: 'POST',
                        body: formData
                    })
                    .then(function(response) {
                        if (!response.ok) {
                            throw new Error('Server responded with ' + response.status);
                        }
                        return response.json();
                    })
                    .then(function(data) {
                        console.log('Transcription result:', data);
                        resolve(data);
                    })
                    .catch(function(error) {
                        console.error('Transcription error:', error);
                        reject(error);
                    });
                });
            }
        },
        
        // Image functionality
        image: {
            // Process clipboard paste event
            processClipboardPaste: function(e) {
                const clipboardData = e.clipboardData || window.clipboardData;
                if (!clipboardData) return null;
                
                let imageBlob = null;
                
                // Check for images in clipboard items
                if (clipboardData.items) {
                    for (let i = 0; i < clipboardData.items.length; i++) {
                        const item = clipboardData.items[i];
                        
                        if (item.type.indexOf('image') !== -1) {
                            imageBlob = item.getAsFile();
                            break;
                        }
                    }
                }
                
                // Try files if no image found in items
                if (!imageBlob && clipboardData.files && clipboardData.files.length > 0) {
                    const file = clipboardData.files[0];
                    if (file && file.type.indexOf('image') !== -1) {
                        imageBlob = file;
                    }
                }
                
                return imageBlob;
            },
            
            // Create an image preview element
            createPreviewElement: function(imageBlob, options = {}) {
                const previewContainer = document.createElement('div');
                previewContainer.className = options.containerClass || 'image-preview-container';
                previewContainer.style.cssText = 'max-width: 300px; margin: 10px 0; position: relative;';
                
                const preview = document.createElement('img');
                preview.className = options.previewClass || 'image-preview';
                preview.style.cssText = 'max-width: 100%; border-radius: 8px; display: block;';
                
                const removeBtn = document.createElement('button');
                removeBtn.className = options.removeBtnClass || 'image-remove-btn';
                removeBtn.innerHTML = '×';
                removeBtn.style.cssText = 'position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 16px;';
                
                // Create object URL
                const imageUrl = URL.createObjectURL(imageBlob);
                preview.src = imageUrl;
                
                // Add to container
                previewContainer.appendChild(preview);
                previewContainer.appendChild(removeBtn);
                
                // Add remove handler
                removeBtn.addEventListener('click', function() {
                    URL.revokeObjectURL(imageUrl);
                    if (previewContainer.parentNode) {
                        previewContainer.parentNode.removeChild(previewContainer);
                    }
                    if (options.onRemove) {
                        options.onRemove();
                    }
                });
                
                return { 
                    container: previewContainer,
                    preview: preview,
                    removeBtn: removeBtn,
                    imageUrl: imageUrl
                };
            }
        },
        
        // Helper utilities
        utils: {
            // Format file size in human-readable format
            formatFileSize: function(bytes) {
                if (bytes < 1024) return bytes + ' B';
                else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
                else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
                else return (bytes / 1073741824).toFixed(2) + ' GB';
            },
            
            // Generate a unique ID
            generateId: function() {
                return 'mm-' + Math.random().toString(36).substr(2, 9);
            }
        }
    };
    
    // API Shims for compatibility
    // Ensure all browsers have the necessary APIs for multimodal features
    if (!window.URL || !window.URL.createObjectURL) {
        console.warn('Browser does not support URL.createObjectURL, multimodal features may be limited');
    }
    
    if (!window.Promise) {
        console.warn('Browser does not support Promises, creating polyfill');
        window.Promise = function(executor) {
            var callbacks = [];
            var errbacks = [];
            var resolved = false;
            var rejected = false;
            var value = null;
            var error = null;
            
            this.then = function(callback) {
                if (resolved) {
                    callback(value);
                } else {
                    callbacks.push(callback);
                }
                return this;
            };
            
            this.catch = function(errback) {
                if (rejected) {
                    errback(error);
                } else {
                    errbacks.push(errback);
                }
                return this;
            };
            
            function resolve(val) {
                value = val;
                resolved = true;
                callbacks.forEach(function(callback) {
                    callback(value);
                });
            }
            
            function reject(err) {
                error = err;
                rejected = true;
                errbacks.forEach(function(errback) {
                    errback(error);
                });
            }
            
            try {
                executor(resolve, reject);
            } catch (e) {
                reject(e);
            }
        };
    }
});
