/**
 * Podplay Build Sanctuary - Chat Module
 * 
 * A clean, robust implementation of chat functionality for Podplay Build.
 * Features:
 * - Reliable message sending
 * - Audio recording and sending
 * - Image paste from clipboard
 * - MCP tool integration
 * 
 * Created by Mama Bear 🐻💜
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('MamaBear: DOM loaded, initializing chat system');
    
    // Get DOM elements
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const modelSelector = document.getElementById('model-selector');
    const voiceButton = document.getElementById('voice-btn');
    
    // Audio recording variables
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    
    // Image pasting variables
    let pastedImage = null;
    
    // Log what elements we found
    console.log('MamaBear: Chat elements found:', {
        chatForm: !!chatForm,
        chatInput: !!chatInput,
        sendButton: !!sendButton,
        chatMessages: !!chatMessages,
        modelSelector: !!modelSelector,
        voiceButton: !!voiceButton
    });
    
    // Main send function
    function sendChatMessage() {
        console.log('MamaBear: sendChatMessage called');
        
        // Ensure we have the essential elements
        if (!chatInput || !chatMessages) {
            console.error('MamaBear ERROR: Cannot find critical chat elements');
            alert('Chat system error: Missing UI elements. Please refresh the page.');
            return;
        }
        
        // Get message text
        const message = chatInput.value.trim();
        if (!message) {
            console.log('MamaBear: Empty message, not sending');
            return;
        }
        
        console.log('MamaBear: Sending message:', message);
        
        // Add user message to UI
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'chat-message user-message';
        userMessageDiv.innerHTML = `
            <div class="sender">You</div>
            <div class="content">${message}</div>
            <div class="timestamp">${new Date().toLocaleTimeString()}</div>
        `;
        chatMessages.appendChild(userMessageDiv);
        
        // Clear input and focus it for next message
        chatInput.value = '';
        chatInput.focus();
        
        // Scroll chat to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Add thinking indicator
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'chat-message agent-message thinking';
        thinkingDiv.innerHTML = `
            <div class="sender">Mama Bear</div>
            <div class="content thinking-dots">
                <p>Thinking<span>.</span><span>.</span><span>.</span></p>
            </div>
            <div class="timestamp">${new Date().toLocaleTimeString()}</div>
        `;
        chatMessages.appendChild(thinkingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Prepare request data
        const formData = new FormData();
        
        // Use the model orchestrator to select the best model
        let selectedModel = 'mama-bear-2.5';
        let taskContext = null;
        
        // Check if we have the model orchestrator
        if (window.modelOrchestrator) {
            // Determine if message includes images
            const includesImage = Array.from(chatMessages.querySelectorAll('.chat-message.user-message:last-child img')).length > 0;
            
            // Route the request through the orchestrator
            const routingInfo = window.modelOrchestrator.routeRequest({
                message,
                mode: 'Build', // Default to Build mode
                includesImage
            });
            
            // Get the selected model
            selectedModel = routingInfo.model;
            taskContext = routingInfo.context;
            
            console.log(`🚀 Chat: Using model ${selectedModel} for this request`);
        } else if (window.modelSelector) {
            // Fall back to model selector if orchestrator not available
            selectedModel = window.modelSelector.getCurrentModel ? 
                window.modelSelector.getCurrentModel().id : 
                window.modelSelector.value || 'mama-bear-2.5';
        }
        
        // Append the selected model to the form data
        formData.append('model_name', selectedModel);
        formData.append('message', message);
        formData.append('mode', 'Build');
        formData.append('project_id', 'podplay-sanctuary');
        
        // Add context if available
        if (taskContext) {
            formData.append('context', JSON.stringify(taskContext));
        }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
        // Send to backend with timeout protection
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        
        console.log('MamaBear: Sending fetch request to /api/agentic/chat');
        
        fetch('/api/agentic/chat', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        })
        .then(response => {
            clearTimeout(timeoutId);
            console.log('MamaBear: Response received, status:', response.status);
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('MamaBear: Received data:', data);
            
            // Remove thinking indicator
            if (chatMessages.contains(thinkingDiv)) {
                chatMessages.removeChild(thinkingDiv);
            }
            
            // Format and display response
            const agentMessageDiv = document.createElement('div');
            agentMessageDiv.className = 'chat-message agent-message';
            
            // Format response text (basic markdown support)
            let formattedResponse = data.response || data.text || "I'm sorry, I don't have a response for that.";
            
            // Replace code blocks with styled versions
            formattedResponse = formattedResponse.replace(/```(\w*)\n([\s\S]*?)```/g, function(match, lang, code) {
                return `<pre><code class="language-${lang || 'text'}">${code}</code></pre>`;
            });
            
            // Replace inline code
            formattedResponse = formattedResponse.replace(/`([^`]+)`/g, '<code>$1</code>');
            
            // Convert newlines to breaks
            formattedResponse = formattedResponse.replace(/\n/g, '<br>');
            
            // Add to chat
            agentMessageDiv.innerHTML = `
                <div class="sender">Mama Bear</div>
                <div class="content">${formattedResponse}</div>
                <div class="timestamp">${new Date().toLocaleTimeString()}</div>
            `;
            chatMessages.appendChild(agentMessageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        })
        .catch(error => {
            console.error('MamaBear: Error sending/receiving message:', error);
            
            // Remove thinking indicator if it exists
            if (chatMessages.contains(thinkingDiv)) {
                chatMessages.removeChild(thinkingDiv);
            }
            
            // Show error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'chat-message agent-message error';
            errorDiv.innerHTML = `
                <div class="sender">System</div>
                <div class="content">
                    <p>Error: ${error.message || 'Unknown error'}</p>
                    <p>Please try again or refresh the page.</p>
                </div>
                <div class="timestamp">${new Date().toLocaleTimeString()}</div>
            `;
            chatMessages.appendChild(errorDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }
    
    // Define a function that can be called directly from HTML
    window.sendMessageDirectly = function() {
        console.log('MamaBear: sendMessageDirectly called (for HTML onclick compatibility)');
        sendChatMessage();
    };
    
    // Set up the event listeners
    if (chatForm) {
        chatForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('MamaBear: Form submitted');
            sendChatMessage();
            return false;
        });
    }
    
    if (sendButton) {
        sendButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('MamaBear: Send button clicked');
            sendChatMessage();
            return false;
        });
    }
    
    if (chatInput) {
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                console.log('MamaBear: Enter key pressed');
                sendChatMessage();
                return false;
            }
        });
        
        // Add auto-resize functionality
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            console.log('MamaBear: Resized input height to', this.style.height);
        });
    }
    
    // Set up MCP tool buttons
    document.querySelectorAll('.mcp-tool-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const tool = this.getAttribute('data-tool');
            console.log('MamaBear: MCP tool clicked:', tool);
            
            if (chatInput) {
                let prompt = '';
                switch(tool) {
                    case 'web-search':
                        prompt = 'Please search the web for information about ';
                        break;
                    case 'code-search':
                        prompt = 'Please search my codebase for ';
                        break;
                    case 'docker-brave':
                    case 'docker-filesystem':
                    case 'docker-github':
                    case 'docker-time':
                        prompt = `Please use the ${tool} MCP tool to `;
                        break;
                    default:
                        prompt = `Please use the ${tool} MCP tool to help me with my current task: `;
                }
                
                chatInput.value = prompt;
                chatInput.focus();
                chatInput.selectionStart = chatInput.selectionEnd = chatInput.value.length;
            }
            
            return false;
        });
    });
    
    console.log('MamaBear: Chat system initialization complete! 🐻💜');
});
