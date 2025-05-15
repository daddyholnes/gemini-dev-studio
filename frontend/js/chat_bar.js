// chat_bar.js
// Multimodal, multi-model chat bar logic for Podplay Build (DARK THEME READY)

let currentModel = "";
let currentMode = "Build";
let modelCapabilities = {};

// Capability icons
const CAP_ICONS = {
  text: '💬',
  image: '🖼️',
  video: '🎬',
  audio: '🎤',
  file: '📎',
  code: '💻'
};

function parseCapabilities(desc) {
  // Simple keyword mapping
  const caps = [];
  if (!desc) return caps;
  const d = desc.toLowerCase();
  if (d.includes('text')) caps.push('text');
  if (d.includes('image')) caps.push('image');
  if (d.includes('video')) caps.push('video');
  if (d.includes('audio')) caps.push('audio');
  if (d.includes('file')) caps.push('file');
  if (d.includes('code')) caps.push('code');
  return caps;
}

function updateChatBarForModel(model) {
  // Future: update controls based on model
}

function populateModelDropdown(models) {
  const select = document.getElementById('model-select');
  select.innerHTML = '';
  models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    // Show just the model name
    opt.textContent = m.id.replace(/^models\//, '');
    // Tooltip: icons + description/capabilities
    let caps = parseCapabilities(m.description);
    modelCapabilities[m.id] = caps;
    let tip = '';
    if (caps.length > 0) {
      tip += caps.map(c => CAP_ICONS[c] || '').join(' ') + ' ';
    }
    if (m.description) tip += m.description;
    opt.title = tip.trim();
    select.appendChild(opt);
  });
  if (models.length > 0) {
    currentModel = models[0].id;
    updateChatBarForModel(currentModel);
  }
}

function chatHistoryKey() {
  return `podplay_history_${getCurrent('project')}_${currentModel}`;
}

function getCurrent(type) {
  if (type === 'project') {
    const active = document.querySelector('.project-item.active');
    return active ? active.textContent.trim() : 'Personal Website';
  }
  return '';
}

function loadChatHistory() {
  try {
    return JSON.parse(localStorage.getItem(chatHistoryKey())) || [];
  } catch {
    return [];
  }
}

function saveChatHistory(history) {
  localStorage.setItem(chatHistoryKey(), JSON.stringify(history));
}

function addMessage(sender, content) {
  // Add to visual chat
  renderChatMessage(sender, content);
  
  // Save to history
  let history = loadChatHistory();
  history.push({ sender, content, timestamp: new Date().toISOString() });
  saveChatHistory(history);
}

function showThinking(show) {
  const indicator = document.getElementById('thinking-indicator');
  if (indicator) {
    indicator.style.display = show ? 'flex' : 'none';
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // Fetch models from backend
  fetch('/api/agentic/models')
    .then(resp => resp.json())
    .then(data => {
      if (data.models) {
        populateModelDropdown(data.models);
        renderChatHistory(); // Load chat history after model loaded
      }
    });

  document.getElementById('model-select').addEventListener('change', (e) => {
    currentModel = e.target.value;
    updateChatBarForModel(currentModel);
    renderChatHistory(); // Load chat history for new model
  });

  // Mode selector sync
  const modeBtns = document.querySelectorAll('#mode-selector .mode-btn');
  modeBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      currentMode = btn.dataset.mode;
    });
  });

  // Send text and attachments
  function sendChat() {
    const messageInput = document.getElementById('chat-input');
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Clear input immediately
    messageInput.value = '';
    
    // Add user message to chat and to history
    addMessage('user', message);
    
    // Show thinking indicator
    showThinking(true);
    
    // Prepare form data
    const formData = new FormData();
    formData.append('model_name', currentModel);
    formData.append('mode', currentMode);
    formData.append('message', message);
    
    // File
    const files = document.getElementById('file-upload').files;
    for (const file of files) {
      formData.append('files', file);
    }
    
    // Audio
    if (window.latestAudioBlob) {
      formData.append('audio', window.latestAudioBlob, 'recording.wav');
      window.latestAudioBlob = null;
    }
    
    // Video
    if (window.latestVideoBlob) {
      formData.append('video', window.latestVideoBlob, 'recording.webm');
      window.latestVideoBlob = null;
    }
    
    // Screen
    if (window.latestScreenBlob) {
      formData.append('video', window.latestScreenBlob, 'screen.webm');
      window.latestScreenBlob = null;
    }
    
    // Send to server
    fetch('/api/agentic/chat', { method: 'POST', body: formData })
      .then(resp => resp.json())
      .then(data => {
        // Hide thinking indicator
        showThinking(false);
        
        // Add agent response to chat and history
        addMessage('agent', data.text);
        
        // Reset file input
        document.getElementById('file-upload').value = '';
      })
      .catch(error => {
        showThinking(false);
        addMessage('agent', 'Sorry, I encountered an error while processing your request.');
        console.error('Chat error:', error);
      });
  }

  document.getElementById('send-btn').onclick = sendChat;

  // ENTER key to send
  document.getElementById('chat-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });

  // Audio recording
  let mediaRecorder, audioChunks = [];
  document.getElementById('audio-record').onclick = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();
      audioChunks = [];
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        window.latestAudioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        // Optionally show a preview
      };
      setTimeout(() => mediaRecorder.stop(), 5000); // Record for 5 seconds
    } catch (err) {
      console.error('Audio recording error:', err);
    }
  };

  // Video recording
  let videoRecorder, videoChunks = [];
  document.getElementById('video-record').onclick = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoRecorder = new MediaRecorder(stream);
      videoRecorder.start();
      videoChunks = [];
      videoRecorder.ondataavailable = e => videoChunks.push(e.data);
      videoRecorder.onstop = () => {
        window.latestVideoBlob = new Blob(videoChunks, { type: 'video/webm' });
        // Optionally show a preview
      };
      setTimeout(() => videoRecorder.stop(), 5000); // Record for 5 seconds
    } catch (err) {
      console.error('Video recording error:', err);
    }
  };

  // Screen sharing
  document.getElementById('screen-share').onclick = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const recorder = new MediaRecorder(stream);
      let chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        window.latestScreenBlob = new Blob(chunks, { type: 'video/webm' });
        // Optionally show a preview
      };
      recorder.start();
      setTimeout(() => recorder.stop(), 5000); // Record for 5 seconds
    } catch (err) {
      console.error('Screen sharing error:', err);
    }
  };

  // Add a welcome message if history is empty
  setTimeout(() => {
    const history = loadChatHistory();
    if (history.length === 0) {
      addMessage('agent', "Hi Nathan! I'm your Lead Developer Agent. What would you like to build today?");
    }
  }, 500);
});

function renderChatHistory() {
  const chatHistory = document.getElementById('chat-history');
  if (!chatHistory) return;
  chatHistory.innerHTML = '';
  const history = loadChatHistory();
  history.forEach(msg => renderChatMessage(msg.sender, msg.content));
}

function renderChatMessage(sender, content) {
  const chatHistory = document.getElementById('chat-history');
  if (!chatHistory) return;
  
  const bubble = document.createElement('div');
  bubble.className = sender === 'user' ? 'chat chat-end' : 'chat chat-start';
  
  // Different styling/labels based on sender
  const senderLabel = sender === 'user' ? 'You' : 'Mama Bear';
  
  // Process the content for better formatting
  let formattedContent = processMessageContent(content);
  
  bubble.innerHTML = `
    <div class="chat-bubble">
      <div class="sender-label" style="font-weight: 600; margin-bottom: 8px; ${sender === 'user' ? 'text-align: right;' : ''}">${senderLabel}:</div>
      <div class="chat-content">${formattedContent}</div>
    </div>
  `;
  
  chatHistory.appendChild(bubble);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

/**
 * Process message content to handle newlines and basic Markdown formatting
 * @param {string} content - The raw message content
 * @returns {string} - Formatted HTML content
 */
function processMessageContent(content) {
  if (!content) return '';
  
  // Handle code blocks (```)
  content = content.replace(/```([\s\S]*?)```/g, (match, code) => {
    return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
  });
  
  // Handle inline code (`)
  content = content.replace(/`([^`]+)`/g, (match, code) => {
    return `<code>${escapeHtml(code)}</code>`;
  });
  
  // Handle bold (**)
  content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Handle italic (*)
  content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Handle lists
  let inList = false;
  let listType = '';
  
  // Process content line by line for paragraphs and lists
  const lines = content.split('\n');
  let processedLines = [];
  let currentParagraph = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for list items
    if (line.match(/^\d+\. /)) {
      // Ordered list item
      if (currentParagraph.length > 0) {
        processedLines.push(`<p>${currentParagraph.join(' ')}</p>`);
        currentParagraph = [];
      }
      
      if (listType !== 'ol') {
        if (inList) processedLines.push('</ul>');
        processedLines.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      
      processedLines.push(`<li>${line.replace(/^\d+\. /, '')}</li>`);
    } else if (line.match(/^- /)) {
      // Unordered list item
      if (currentParagraph.length > 0) {
        processedLines.push(`<p>${currentParagraph.join(' ')}</p>`);
        currentParagraph = [];
      }
      
      if (listType !== 'ul') {
        if (inList) processedLines.push('</ol>');
        processedLines.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      
      processedLines.push(`<li>${line.substring(2)}</li>`);
    } else if (line === '') {
      // Empty line - end paragraph and list if we're in one
      if (inList) {
        processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
        listType = '';
      }
      
      if (currentParagraph.length > 0) {
        processedLines.push(`<p>${currentParagraph.join(' ')}</p>`);
        currentParagraph = [];
      }
    } else {
      // Regular line - add to current paragraph
      if (inList) {
        processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
        listType = '';
      }
      
      // Check for headers
      if (line.startsWith('# ')) {
        if (currentParagraph.length > 0) {
          processedLines.push(`<p>${currentParagraph.join(' ')}</p>`);
          currentParagraph = [];
        }
        processedLines.push(`<h1>${line.substring(2)}</h1>`);
      } else if (line.startsWith('## ')) {
        if (currentParagraph.length > 0) {
          processedLines.push(`<p>${currentParagraph.join(' ')}</p>`);
          currentParagraph = [];
        }
        processedLines.push(`<h2>${line.substring(3)}</h2>`);
      } else if (line.startsWith('### ')) {
        if (currentParagraph.length > 0) {
          processedLines.push(`<p>${currentParagraph.join(' ')}</p>`);
          currentParagraph = [];
        }
        processedLines.push(`<h3>${line.substring(4)}</h3>`);
      } else {
        // Normal paragraph text - preserve individual lines
        if (currentParagraph.length > 0 && line) {
          currentParagraph.push(line);
        } else if (line) {
          currentParagraph = [line];
        }
      }
    }
  }
  
  // Close any open list
  if (inList) {
    processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
  }
  
  // Process any remaining paragraph
  if (currentParagraph.length > 0) {
    processedLines.push(`<p>${currentParagraph.join(' ')}</p>`);
  }
  
  return processedLines.join('\n');
}

/**
 * Escape HTML special characters
 * @param {string} html - Content to escape
 * @returns {string} - Escaped content
 */
function escapeHtml(html) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}