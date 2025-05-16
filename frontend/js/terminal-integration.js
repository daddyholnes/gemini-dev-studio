/**
 * Podplay Build Terminal Integration
 * 
 * This script integrates the terminal with the main Podplay Build UI,
 * allowing Mama Bear to execute commands and manage the development environment.
 */

// Initialize terminal UI once the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Create the terminal container if it doesn't exist
  if (!document.getElementById('podplay-terminal-container')) {
    createTerminalUI();
  }
  
  // Check if terminal server is available
  checkTerminalServerStatus().then(available => {
    if (available) {
      initializeTerminal();
    }
  });
  
  // Setup UI events for terminal toggle
  setupTerminalToggleEvents();
  
  // Connect with tab system
  connectWithTabSystem();
});

// Create the terminal UI elements
function createTerminalUI() {
  // Create the terminal UI button in the sidebar
  createTerminalToggleButton();
  
  // Create the terminal container
  const container = document.createElement('div');
  container.id = 'podplay-terminal-container';
  container.classList.add('podplay-terminal-container');
  container.style.display = 'none';
  
  // Terminal header with controls
  const header = document.createElement('div');
  header.classList.add('podplay-terminal-header');
  header.innerHTML = `
    <div class="terminal-title">🐻 Mama Bear Terminal</div>
    <div class="terminal-controls">
      <button id="terminal-maximize-btn" title="Maximize">↕️</button>
      <button id="terminal-clear-btn" title="Clear">🗑️</button>
      <button id="terminal-close-btn" title="Close">✖️</button>
    </div>
  `;
  
  // Terminal content area
  const content = document.createElement('div');
  content.id = 'podplay-terminal';
  content.classList.add('podplay-terminal-content');
  
  // Assemble and add to document
  container.appendChild(header);
  container.appendChild(content);
  document.body.appendChild(container);
  
  // Style the terminal
  addTerminalStyles();
}

// Create the terminal toggle button in the sidebar
function createTerminalToggleButton() {
  // Find the sidebar tools section - look for a variety of possible container elements
  const toolsContainer = document.querySelector('.sidebar-tools, .tools-container, .tool-buttons, .sidebar-actions');
  
  if (!toolsContainer) {
    console.warn('Could not find sidebar tools container. Creating floating button instead.');
    createFloatingTerminalButton();
    return;
  }
  
  // Create the terminal button
  const button = document.createElement('button');
  button.id = 'terminal-toggle-btn';
  button.classList.add('terminal-toggle-btn');
  button.setAttribute('title', 'Toggle Terminal');
  button.innerHTML = '🖥️ Terminal';
  
  // Add to the sidebar
  toolsContainer.appendChild(button);
}

// Create a floating terminal button if sidebar can't be found
function createFloatingTerminalButton() {
  const button = document.createElement('button');
  button.id = 'terminal-toggle-btn';
  button.classList.add('terminal-toggle-btn');
  button.classList.add('floating');
  button.setAttribute('title', 'Toggle Terminal');
  button.innerHTML = '🖥️';
  
  // Style the floating button
  Object.assign(button.style, {
    position: 'fixed',
    right: '20px',
    bottom: '20px',
    zIndex: '1000',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    border: 'none',
    backgroundColor: '#a277ff',
    color: 'white',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
    cursor: 'pointer',
    fontSize: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });
  
  document.body.appendChild(button);
}

// Add terminal-specific styles
function addTerminalStyles() {
  // Check if styles already exist
  if (document.getElementById('podplay-terminal-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'podplay-terminal-styles';
  style.textContent = `
    .podplay-terminal-container {
      position: fixed;
      left: 0;
      bottom: 0;
      width: 100%;
      height: 300px;
      background-color: #121212;
      color: #f8f8f8;
      border-top: 1px solid #333;
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      font-family: Menlo, Monaco, "Courier New", monospace;
    }
    
    .podplay-terminal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background-color: #1f1f1f;
      border-bottom: 1px solid #333;
    }
    
    .terminal-title {
      font-weight: bold;
    }
    
    .terminal-controls button {
      background-color: transparent;
      border: none;
      color: #ccc;
      cursor: pointer;
      font-size: 16px;
      margin-left: 10px;
    }
    
    .terminal-controls button:hover {
      color: #fff;
    }
    
    .podplay-terminal-content {
      flex: 1;
      overflow: hidden;
    }
    
    .terminal-toggle-btn {
      display: block;
      width: 100%;
      padding: 8px 12px;
      margin: 8px 0;
      background-color: #333;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      text-align: left;
    }
    
    .terminal-toggle-btn:hover {
      background-color: #a277ff;
    }
    
    .terminal-maximize {
      height: 80vh !important;
    }
    
    /* Fix for light mode if needed */
    .light-theme .podplay-terminal-container {
      background-color: #1a1a1a;
      color: #f8f8f8;
    }
  `;
  
  document.head.appendChild(style);
}

// Check if the terminal server is available
async function checkTerminalServerStatus() {
  try {
    const response = await fetch('/api/terminal/status');
    const data = await response.json();
    
    if (data.available) {
      console.log('Terminal server is available:', data.message);
      return true;
    } else {
      console.warn('Terminal server is not available:', data.message);
      
      // Show a message if the terminal button is clicked
      const terminalBtn = document.getElementById('terminal-toggle-btn');
      if (terminalBtn) {
        terminalBtn.addEventListener('click', () => {
          alert('Terminal server is not available. Please make sure the server is running with the required dependencies.');
        });
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error checking terminal server status:', error);
    return false;
  }
}

// Initialize the terminal with xterm.js
async function initializeTerminal() {
  // Dynamically load terminal.js if needed
  if (typeof PodplayTerminal === 'undefined') {
    await loadScript('/js/terminal/terminal.js');
  }
  
  // Create the terminal object
  const terminal = new PodplayTerminal('podplay-terminal');
  window.podplayTerminal = terminal; // Save for global access
  
  // Initialize the terminal
  await terminal.init();
  
  // Connect to WebSocket
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}/terminal`;
  
  const connected = terminal.connectToWebSocket(wsUrl);
  if (!connected) {
    console.error('Failed to connect to terminal WebSocket server');
    terminal.writeLine('\r\n❌ Failed to connect to terminal server. Make sure the server is running.');
  }
  
  // Register Mama Bear specific commands
  registerMamaBearCommands(terminal);
  
  // Handle WebSocket preview events
  window.addEventListener('terminal:preview', (event) => {
    updatePreview(event.detail.content);
  });
  
  console.log('Terminal initialized successfully!');
}

// Register Mama Bear specific terminal commands
function registerMamaBearCommands(terminal) {
  // Command to send a message to Mama Bear
  terminal.registerCommand('ask', (args, terminal) => {
    if (!args.length) {
      terminal.writeLine('Usage: ask <question>');
      return;
    }
    
    const question = args.join(' ');
    terminal.writeLine(`Asking Mama Bear: ${question}`);
    
    // Find the chat input element
    const chatInput = document.querySelector('input[type="text"], textarea:not([readonly])');
    if (chatInput) {
      // Set the input value
      chatInput.value = question;
      
      // Find and click the send button
      const sendButton = document.querySelector('button[type="submit"], button.submit, button.send');
      if (sendButton) {
        sendButton.click();
        terminal.writeLine('Message sent to Mama Bear! Check the chat for the response.');
      } else {
        // Try to dispatch an enter key event
        chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        terminal.writeLine('Message sent to Mama Bear! Check the chat for the response.');
      }
    } else {
      terminal.writeLine('Could not find the chat input. Please type your question directly to Mama Bear.');
    }
  });
  
  // Command to create a new project
  terminal.registerCommand('new-project', (args, terminal) => {
    if (!args.length) {
      terminal.writeLine('Usage: new-project <project-type> [project-name]');
      terminal.writeLine('Available project types: react, vue, angular, html, node');
      return;
    }
    
    const projectType = args[0].toLowerCase();
    const projectName = args[1] || projectType + '-project';
    
    terminal.writeLine(`Creating new ${projectType} project: ${projectName}`);
    
    // Send a message to Mama Bear
    const message = `Please create a new ${projectType} project called ${projectName} in the terminal environment.`;
    
    // Find the chat input element
    const chatInput = document.querySelector('input[type="text"], textarea:not([readonly])');
    if (chatInput) {
      // Set the input value
      chatInput.value = message;
      
      // Find and click the send button
      const sendButton = document.querySelector('button[type="submit"], button.submit, button.send');
      if (sendButton) {
        sendButton.click();
      } else {
        // Try to dispatch an enter key event
        chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      }
    }
  });
}

// Update the preview panel with content
function updatePreview(content) {
  // Check if preview panel exists, create if not
  let previewPanel = document.getElementById('podplay-preview-container');
  if (!previewPanel) {
    createPreviewPanel();
    previewPanel = document.getElementById('podplay-preview-container');
  }
  
  // Update the iframe content
  const iframe = document.getElementById('podplay-preview-iframe');
  if (iframe) {
    iframe.srcdoc = content;
    
    // Show the preview
    previewPanel.style.display = 'block';
  }
}

// Create the preview panel
function createPreviewPanel() {
  // Create container
  const container = document.createElement('div');
  container.id = 'podplay-preview-container';
  container.classList.add('podplay-preview-container');
  
  // Style the preview panel
  Object.assign(container.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    height: '80%',
    backgroundColor: 'white',
    boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
    borderRadius: '8px',
    zIndex: '2000',
    display: 'none',
    flexDirection: 'column',
    overflow: 'hidden'
  });
  
  // Create header
  const header = document.createElement('div');
  header.classList.add('preview-header');
  Object.assign(header.style, {
    padding: '12px',
    backgroundColor: '#1f1f1f',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px'
  });
  
  header.innerHTML = `
    <div class="preview-title">🌐 Mama Bear Preview</div>
    <div class="preview-controls">
      <button id="preview-close-btn" title="Close">✖️</button>
    </div>
  `;
  
  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'podplay-preview-iframe';
  iframe.classList.add('podplay-preview-iframe');
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  
  // Style the iframe
  Object.assign(iframe.style, {
    flex: '1',
    border: 'none',
    width: '100%',
    backgroundColor: 'white'
  });
  
  // Assemble and add to document
  container.appendChild(header);
  container.appendChild(iframe);
  document.body.appendChild(container);
  
  // Close button functionality
  const closeBtn = document.getElementById('preview-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      container.style.display = 'none';
    });
    
    // Style the close button
    Object.assign(closeBtn.style, {
      background: 'transparent',
      border: 'none',
      color: 'white',
      cursor: 'pointer',
      fontSize: '16px'
    });
  }
}

// Setup events for terminal toggle
function setupTerminalToggleEvents() {
  // Wait for the DOM to be fully loaded
  const waitForElement = (selector, callback) => {
    if (document.querySelector(selector)) {
      callback();
    } else {
      setTimeout(() => waitForElement(selector, callback), 500);
    }
  };
  
  waitForElement('#terminal-toggle-btn', () => {
    const toggleBtn = document.getElementById('terminal-toggle-btn');
    toggleBtn.addEventListener('click', toggleTerminal);
  });
  
  waitForElement('#terminal-close-btn', () => {
    const closeBtn = document.getElementById('terminal-close-btn');
    closeBtn.addEventListener('click', hideTerminal);
  });
  
  waitForElement('#terminal-maximize-btn', () => {
    const maxBtn = document.getElementById('terminal-maximize-btn');
    maxBtn.addEventListener('click', maximizeTerminal);
  });
  
  waitForElement('#terminal-clear-btn', () => {
    const clearBtn = document.getElementById('terminal-clear-btn');
    clearBtn.addEventListener('click', clearTerminal);
  });
  
  // Add keyboard shortcut (Ctrl+`) to toggle terminal
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === '`') {
      e.preventDefault();
      toggleTerminal();
    }
  });
}

// Toggle terminal visibility
function toggleTerminal() {
  const terminal = document.getElementById('podplay-terminal-container');
  if (terminal) {
    if (terminal.style.display === 'none' || !terminal.style.display) {
      terminal.style.display = 'flex';
      
      // Ensure terminal is properly sized
      if (window.podplayTerminal && window.podplayTerminal.fitAddon) {
        setTimeout(() => {
          window.podplayTerminal.fitAddon.fit();
        }, 100);
      }
    } else {
      terminal.style.display = 'none';
    }
  }
}

// Hide terminal
function hideTerminal() {
  const terminal = document.getElementById('podplay-terminal-container');
  if (terminal) {
    terminal.style.display = 'none';
  }
}

// Maximize terminal
function maximizeTerminal() {
  const terminal = document.getElementById('podplay-terminal-container');
  if (terminal) {
    terminal.classList.toggle('terminal-maximize');
    
    // Ensure terminal is properly sized
    if (window.podplayTerminal && window.podplayTerminal.fitAddon) {
      setTimeout(() => {
        window.podplayTerminal.fitAddon.fit();
      }, 100);
    }
  }
}

// Clear terminal
function clearTerminal() {
  if (window.terminal) {
    window.terminal.clear();
    window.terminal.writeln('Terminal cleared');
  }
}

/**
 * Connect terminal with tab system
 */
function connectWithTabSystem() {
  // Find terminal tab button
  const terminalBtn = document.getElementById('terminal-btn');
  if (terminalBtn) {
    // Already handled by interface-fix.js, but add any terminal-specific behavior
    terminalBtn.addEventListener('click', function() {
      // Initialize or focus terminal when tab is activated
      setTimeout(() => {
        if (window.terminal && typeof window.terminal.focus === 'function') {
          window.terminal.focus();
        }
        
        // If the terminal is in a panel that's now visible, make sure it fits properly
        if (window.terminal && typeof window.terminal.fit === 'function') {
          window.terminal.fit();
        }
      }, 100);
    });
  }
  
  // Connect terminal panel with the terminal instance
  const terminalPanel = document.getElementById('terminal-panel');
  const terminalElement = document.getElementById('terminal');
  
  if (terminalPanel && terminalElement && !terminalElement.querySelector('.xterm')) {
    // Initialize xterm.js if not already done
    if (window.xterm && !window.terminal) {
      window.terminal = new window.xterm.Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'monospace',
        theme: {
          background: '#0f172a',
          foreground: '#e2e8f0',
          cursor: '#8b5cf6'
        }
      });
      
      // Open terminal in the terminal element
      window.terminal.open(terminalElement);
      window.terminal.writeln('Podplay Build Terminal 🐻💜');
      window.terminal.writeln('Type commands to interact with your environment!');
      
      // Set up keyboard input
      window.terminal.onData(data => {
        // In a real implementation, this would send the data to a backend shell
        if (data === '\r') { // Enter key
          const command = currentCommand.trim();
          window.terminal.writeln('');
          handleCommand(command);
          currentCommand = '';
          window.terminal.write('\r\n$ ');
        } else if (data === '\u007F') { // Backspace
          if (currentCommand.length > 0) {
            currentCommand = currentCommand.substr(0, currentCommand.length - 1);
            window.terminal.write('\b \b');
          }
        } else {
          currentCommand += data;
          window.terminal.write(data);
        }
      });
      
      // Initialize with prompt
      let currentCommand = '';
      window.terminal.write('$ ');
    }
  }
}

/**
 * Handle a terminal command
 */
function handleCommand(command) {
  if (!command) return;
  
  if (command === 'clear') {
    clearTerminal();
  } else if (command === 'help') {
    window.terminal.writeln('Available commands:');
    window.terminal.writeln('  help - Show this help');
    window.terminal.writeln('  clear - Clear terminal');
    window.terminal.writeln('  ls - List files');
    window.terminal.writeln('  echo [text] - Print text');
    window.terminal.writeln('  buildmode - Toggle Build Mode');
  } else if (command === 'ls') {
    window.terminal.writeln('index.html');
    window.terminal.writeln('js/');
    window.terminal.writeln('css/');
    window.terminal.writeln('assets/');
  } else if (command.startsWith('echo ')) {
    const text = command.substring(5);
    window.terminal.writeln(text);
  } else if (command === 'buildmode') {
    window.terminal.writeln('Toggling Build Mode...');
    if (window.buildMode) {
      window.buildMode.toggleBuildMode();
    } else {
      window.terminal.writeln('Build Mode not initialized!');
    }
  } else {
    window.terminal.writeln(`Command not found: ${command}`);
    window.terminal.writeln('Type "help" for available commands');
  }
}

// Helper function to load a script
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}