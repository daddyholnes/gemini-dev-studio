/**
 * Podplay Build Sanctuary - Chat Module
 * 
 * A clean, robust implementation of chat functionality for Podplay Build.
 * Handles message sending, receiving, and MCP tool integration.
 * 
 * Created by Mama Bear 🐻💜
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('MamaBear: Initializing chat system...');
    
    // Element references
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const modelSelector = document.getElementById('model-selector');
    
    // Log detected elements
    console.log('MamaBear: Found elements', {
        chatForm: !!chatForm,
        chatInput: !!chatInput,
        sendButton: !!sendButton,
        chatMessages: !!chatMessages,
        modelSelector: !!modelSelector
    });
    
    // Add textarea auto-expand feature
    if (chatInput) {
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
    
    /**
     * Main function for sending chat messages
     * Handles all aspects of the chat process
     */
    function sendChatMessage() {
        // Get fresh references to ensure we're using current DOM elements
        const input = document.getElementById('chat-input');
        const messages = document.getElementById('chat-messages');
        const model = document.getElementById('model-selector');
        
        // Validate essential elements exist
        if (!input || !messages) {
            console.error('MamaBear: Critical chat elements missing');
            return;
        }
        
        // Get message content
        const message = input.value.trim();
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
        messages.appendChild(userMessageDiv);
        
        // Clear input after sending
        input.value = '';
        input.focus();
        
        // Scroll chat to bottom
        messages.scrollTop = messages.scrollHeight;
        
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
        messages.appendChild(thinkingDiv);
        messages.scrollTop = messages.scrollHeight;
        
        // Prepare request data
        const formData = new FormData();
        formData.append('model_name', model ? model.value : 'mama-bear-2.5');
        formData.append('message', message);
        formData.append('mode', 'Build');
        formData.append('project_id', 'Personal Website');
        
        // Send to backend with timeout protection
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        fetch('/api/agentic/chat', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        })
        .then(response => {
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('MamaBear: Received response:', data);
            
            // Remove thinking indicator
            if (messages.contains(thinkingDiv)) {
                messages.removeChild(thinkingDiv);
            }
            
            // Format and display response
            const agentMessageDiv = document.createElement('div');
            agentMessageDiv.className = 'chat-message agent-message';
            
            // Format response text (basic markdown support)
            let formattedResponse = data.response || data.text || "I'm sorry, I don't have a response for that.";
            
            // Replace code blocks
            formattedResponse = formattedResponse.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
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
            messages.appendChild(agentMessageDiv);
            messages.scrollTop = messages.scrollHeight;
        })
        .catch(error => {
            console.error('MamaBear: Error sending/receiving message:', error);
            
            // Remove thinking indicator if it exists
            if (messages.contains(thinkingDiv)) {
                messages.removeChild(thinkingDiv);
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
            messages.appendChild(errorDiv);
            messages.scrollTop = messages.scrollHeight;
        });
    }
    
    /**
     * Handle MCP tool button clicks
     * Pre-fills chat input with appropriate prompt text
     */
    function useMCPTool(toolName) {
        console.log(`MamaBear: Using MCP tool: ${toolName}`);
        
        const input = document.getElementById('chat-input');
        if (!input) {
            console.error('MamaBear: Cannot find chat input');
            return;
        }
        
        // Select appropriate prompt text
        let message = '';
        switch (toolName) {
            case 'web-search':
                message = 'Please search the web for information about ';
                break;
            case 'code-search':
                message = 'Please help me search through the codebase for ';
                break;
            case 'package-manager':
                message = 'Please help me manage packages for my project. I need to ';
                break;
            case 'filesystem':
                message = 'Please help me with file operations. I need to ';
                break;
            default:
                message = `Please use the ${toolName} MCP tool to help me with my current task.`;
        }
        
        // Update input and focus
        input.value = message;
        input.focus();
        
        // Position cursor at end of text
        input.selectionStart = input.selectionEnd = input.value.length;
    }
    
    // Set up form submit handler
    if (chatForm) {
        chatForm.onsubmit = function(e) {
            e.preventDefault();
            sendChatMessage();
            return false;
        };
    }
    
    // Set up send button click handler
    if (sendButton) {
        sendButton.addEventListener('click', function(e) {
            e.preventDefault();
            sendChatMessage();
            return false;
        });
    }
    
    // Set up Enter key handler
    if (chatInput) {
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
                return false;
            }
        });
    }
    
    // Set up MCP tool buttons
    document.querySelectorAll('.mcp-tool-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const tool = this.getAttribute('data-tool');
            useMCPTool(tool);
            return false;
        });
    });
    
    // Global functions (make available to window object)
    window.sendChatMessage = sendChatMessage;
    window.useMCPTool = useMCPTool;
    
    console.log('MamaBear: Chat system initialization complete!');
});
