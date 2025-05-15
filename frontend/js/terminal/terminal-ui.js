/**
 * Podplay Terminal UI Component
 * Creates a beautiful, toggleable terminal interface in the Podplay Build sanctuary
 */

class TerminalUI {
  constructor(options = {}) {
    this.options = {
      containerId: 'podplay-terminal-container',
      terminalId: 'podplay-terminal',
      title: 'Mama Bear Terminal',
      position: 'bottom',  // 'bottom', 'right', 'panel'
      height: '300px',
      width: '100%',
      zIndex: 1000,
      wsUrl: `ws://${window.location.host}/terminal`,
      ...options
    };
    
    this.terminal = null;
    this.container = null;
    this.isVisible = false;
    this.isInitialized = false;
    this.resizeObserver = null;
  }
  
  async init() {
    if (this.isInitialized) return this;
    
    // Create UI elements
    this.createElements();
    
    // Initialize terminal
    this.terminal = new PodplayTerminal(this.options.terminalId);
    await this.terminal.init();
    
    // Connect to WebSocket if specified
    if (this.options.wsUrl) {
      this.terminal.connectToWebSocket(this.options.wsUrl);
    }
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Add custom terminal commands
    this.registerCustomCommands();
    
    // Mark as initialized
    this.isInitialized = true;
    
    return this;
  }
  
  createElements() {
    // Check if container already exists
    const existingContainer = document.getElementById(this.options.containerId);
    if (existingContainer) {
      this.container = existingContainer;
      return;
    }
    
    // Create container
    this.container = document.createElement('div');
    this.container.id = this.options.containerId;
    this.container.className = 'podplay-terminal-container';
    
    // Apply styles based on position
    Object.assign(this.container.style, {
      position: 'fixed',
      zIndex: this.options.zIndex,
      backgroundColor: '#121212',
      color: '#f8f8f8',
      borderTop: '1px solid #333',
      boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.3)',
      transition: 'transform 0.3s ease-in-out, height 0.3s ease-in-out',
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      display: 'flex',
      flexDirection: 'column'
    });
    
    if (this.options.position === 'bottom') {
      Object.assign(this.container.style, {
        left: '0',
        bottom: '0',
        width: '100%',
        height: this.options.height,
        transform: 'translateY(100%)'  // Start hidden
      });
    } else if (this.options.position === 'right') {
      Object.assign(this.container.style, {
        right: '0',
        top: '0',
        width: this.options.width,
        height: '100%',
        transform: 'translateX(100%)'  // Start hidden
      });
    }
    
    // Create header
    const header = document.createElement('div');
    header.className = 'podplay-terminal-header';
    Object.assign(header.style, {
      padding: '8px 12px',
      backgroundColor: '#1f1f1f',
      borderBottom: '1px solid #333',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    });
    
    // Create title
    const title = document.createElement('div');
    title.textContent = this.options.title;
    title.style.fontWeight = 'bold';
    
    // Create buttons container
    const buttons = document.createElement('div');
    buttons.className = 'podplay-terminal-buttons';
    
    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'podplay-terminal-toggle';
    toggleBtn.textContent = 'Hide';
    toggleBtn.style.marginRight = '8px';
    toggleBtn.onclick = () => this.toggle();
    
    // Create maximize button
    const maximizeBtn = document.createElement('button');
    maximizeBtn.className = 'podplay-terminal-maximize';
    maximizeBtn.textContent = 'Max';
    maximizeBtn.style.marginRight = '8px';
    maximizeBtn.onclick = () => this.maximize();
    
    // Create clear button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'podplay-terminal-clear';
    clearBtn.textContent = 'Clear';
    clearBtn.onclick = () => this.terminal.terminal.clear();
    
    // Style buttons
    [toggleBtn, maximizeBtn, clearBtn].forEach(btn => {
      Object.assign(btn.style, {
        backgroundColor: '#333',
        color: '#fff',
        border: 'none',
        borderRadius: '3px',
        padding: '4px 8px',
        cursor: 'pointer',
        fontSize: '12px'
      });
    });
    
    // Add buttons to container
    buttons.appendChild(toggleBtn);
    buttons.appendChild(maximizeBtn);
    buttons.appendChild(clearBtn);
    
    // Add title and buttons to header
    header.appendChild(title);
    header.appendChild(buttons);
    
    // Create terminal content area
    const terminalArea = document.createElement('div');
    terminalArea.id = this.options.terminalId;
    terminalArea.style.flex = '1';
    terminalArea.style.overflow = 'hidden';
    
    // Assemble container
    this.container.appendChild(header);
    this.container.appendChild(terminalArea);
    
    // Add to body
    document.body.appendChild(this.container);
  }
  
  setupEventListeners() {
    // Handle resize to ensure terminal fits properly
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.target === this.container) {
          setTimeout(() => {
            if (this.terminal && this.terminal.fitAddon) {
              this.terminal.fitAddon.fit();
            }
          }, 10);
        }
      }
    });
    
    this.resizeObserver.observe(this.container);
    
    // Add keyboard shortcut (Ctrl+`) to toggle terminal
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        this.toggle();
      }
    });
  }
  
  registerCustomCommands() {
    // Add custom command to create new files in the editor
    this.terminal.registerCommand('edit', (args, terminal) => {
      if (!args.length) {
        terminal.writeLine('Usage: edit <filename>');
        return;
      }
      
      const filename = args[0];
      terminal.writeLine(`Opening ${filename} in editor...`);
      
      // Dispatch a custom event that the editor can listen for
      const event = new CustomEvent('terminal:edit', {
        detail: { filename }
      });
      window.dispatchEvent(event);
    });
    
    // Add custom command to run the preview
    this.terminal.registerCommand('preview', (args, terminal) => {
      terminal.writeLine('Launching preview...');
      
      // Dispatch event for preview panel
      const event = new CustomEvent('terminal:showPreview', {
        detail: { show: true }
      });
      window.dispatchEvent(event);
    });
    
    // Add custom command for MCP direct access
    this.terminal.registerCommand('mcp', (args, terminal) => {
      if (args.length < 2) {
        terminal.writeLine('Usage: mcp <tool> <query>');
        terminal.writeLine('Available MCP tools: web-search, code-search, npm');
        return;
      }
      
      const tool = args[0];
      const query = args.slice(1).join(' ');
      
      terminal.writeLine(`Executing MCP ${tool} with query: ${query}`);
      
      // Create an MCP event
      const event = new CustomEvent('terminal:mcp', {
        detail: { tool, query }
      });
      window.dispatchEvent(event);
    });
  }
  
  show() {
    if (!this.container) return;
    
    if (this.options.position === 'bottom') {
      this.container.style.transform = 'translateY(0)';
    } else if (this.options.position === 'right') {
      this.container.style.transform = 'translateX(0)';
    }
    
    this.isVisible = true;
    
    // Ensure terminal size updates
    setTimeout(() => {
      if (this.terminal && this.terminal.fitAddon) {
        this.terminal.fitAddon.fit();
      }
    }, 300);
  }
  
  hide() {
    if (!this.container) return;
    
    if (this.options.position === 'bottom') {
      this.container.style.transform = 'translateY(100%)';
    } else if (this.options.position === 'right') {
      this.container.style.transform = 'translateX(100%)';
    }
    
    this.isVisible = false;
  }
  
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  maximize() {
    if (!this.container) return;
    
    // Toggle between normal and maximized height
    if (this.container.style.height === this.options.height) {
      this.container.style.height = '80vh';
    } else {
      this.container.style.height = this.options.height;
    }
    
    // Ensure terminal size updates
    setTimeout(() => {
      if (this.terminal && this.terminal.fitAddon) {
        this.terminal.fitAddon.fit();
      }
    }, 300);
  }
  
  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    if (this.terminal) {
      this.terminal.destroy();
    }
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TerminalUI;
} else {
  window.TerminalUI = TerminalUI;
}