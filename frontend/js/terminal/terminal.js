/**
 * Podplay Terminal - A powerful in-browser terminal component for Mama Bear
 * This provides a fully interactive terminal experience within the Podplay Build sanctuary
 */

class PodplayTerminal {
  constructor(elementId, options = {}) {
    this.elementId = elementId;
    this.options = {
      theme: {
        background: '#121212',
        foreground: '#f8f8f8',
        cursor: '#a277ff',
        selection: 'rgba(162, 119, 255, 0.3)',
        black: '#121212',
        blue: '#6b8eff',
        cyan: '#61ffca',
        green: '#61ffca',
        magenta: '#a277ff',
        red: '#ff6767',
        white: '#f8f8f8',
        yellow: '#ffca85',
      },
      cursorBlink: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      ...options
    };
    
    this.terminal = null;
    this.fitAddon = null;
    this.socket = null;
    this.commandHistory = [];
    this.historyIndex = -1;
    this.currentCommand = '';
    this.initialized = false;
    this.commandCallbacks = {};
  }

  async init() {
    if (this.initialized) return;
    
    const element = document.getElementById(this.elementId);
    if (!element) {
      console.error(`Terminal element with ID ${this.elementId} not found`);
      return;
    }
    
    // Dynamically load xterm.js and addons
    await this.loadDependencies();
    
    // Create terminal instance
    this.terminal = new Terminal(this.options);
    this.fitAddon = new FitAddon.FitAddon();
    
    // Load addons
    this.terminal.loadAddon(this.fitAddon);
    
    // Open terminal in container
    this.terminal.open(element);
    
    // Make terminal responsive
    this.fitAddon.fit();
    window.addEventListener('resize', () => {
      this.fitAddon.fit();
    });
    
    // Initialize with welcome message
    this.terminal.write('\r\n Welcome to Mama Bear Terminal! 🐻\r\n\r\n');
    this.terminal.write(' Type "help" for available commands\r\n\r\n');
    this.prompt();
    
    // Set up terminal input handling
    this.setupInputHandling();
    
    this.initialized = true;
    return this;
  }
  
  async loadDependencies() {
    // Load xterm.js and its addons dynamically
    if (typeof Terminal === 'undefined') {
      // Load xterm.js CSS
      const xtermCss = document.createElement('link');
      xtermCss.rel = 'stylesheet';
      xtermCss.href = 'https://cdn.jsdelivr.net/npm/xterm@5.1.0/css/xterm.min.css';
      document.head.appendChild(xtermCss);
      
      // Load xterm.js
      await this.loadScript('https://cdn.jsdelivr.net/npm/xterm@5.1.0/lib/xterm.min.js');
      
      // Load fit addon
      await this.loadScript('https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.7.0/lib/xterm-addon-fit.min.js');
    }
  }
  
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  setupInputHandling() {
    let currentLine = '';
    
    this.terminal.onData(data => {
      const code = data.charCodeAt(0);
      
      // Handle special keys
      if (code === 13) { // Enter key
        this.terminal.write('\r\n');
        this.processCommand(currentLine);
        currentLine = '';
      } else if (code === 127) { // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          this.terminal.write('\b \b');
        }
      } else if (code === 27) { // ESC or arrow keys
        // Handle arrow navigation
        if (data === '\u001b[A') { // Up arrow
          if (this.commandHistory.length > 0 && this.historyIndex > 0) {
            this.historyIndex--;
            this.setCommand(this.commandHistory[this.historyIndex]);
          }
        } else if (data === '\u001b[B') { // Down arrow
          if (this.historyIndex < this.commandHistory.length - 1) {
            this.historyIndex++;
            this.setCommand(this.commandHistory[this.historyIndex]);
          } else {
            this.setCommand('');
          }
        }
      } else if (code < 32) {
        // Ignore other control characters
        return;
      } else {
        // Regular character input
        currentLine += data;
        this.terminal.write(data);
      }
    });
  }
  
  setCommand(cmd) {
    // Clear current line
    this.terminal.write('\r\x1b[K');
    this.prompt();
    // Write new command
    this.terminal.write(cmd);
    // Update current line
    currentLine = cmd;
  }
  
  processCommand(command) {
    const trimmedCmd = command.trim();
    
    // Don't process empty commands
    if (!trimmedCmd) {
      this.prompt();
      return;
    }
    
    // Add to history
    this.commandHistory.push(trimmedCmd);
    this.historyIndex = this.commandHistory.length;
    
    // Parse command
    const parts = trimmedCmd.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    // Built-in commands
    switch (cmd) {
      case 'clear':
        this.terminal.clear();
        break;
      case 'help':
        this.showHelp();
        break;
      case 'echo':
        this.terminal.write(args.join(' ') + '\r\n');
        break;
      case 'mcp':
        // Special handling for MCP commands
        if (args.length >= 1) {
          const mcpServer = args[0];
          const mcpQuery = args.slice(1).join(' ');
          
          // Show user what's happening
          this.terminal.write(`Sending query to MCP server: ${mcpServer}\r\n`);
          
          // Handle Docker MCP servers
          if (mcpServer.startsWith('docker-')) {
            this.terminal.write(`Using Docker MCP: ${mcpServer}\r\n`);
            
            // Create the fetch request to send to our backend
            fetch('/api/mcp/docker/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ server: mcpServer, query: mcpQuery })
            })
            .then(response => response.json())
            .then(data => {
              // Display the response in the terminal
              this.terminal.write(JSON.stringify(data, null, 2) + '\r\n');
            })
            .catch(err => {
              this.terminal.write(`Error: ${err.message}\r\n`);
            });
            break;
          }
        }
        
        // If we fall through (not a Docker MCP command), send to WebSocket
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ cmd: trimmedCmd }));
        } else {
          this.terminal.write('MCP server not connected. Please check your connection.\r\n');
        }
        break;
      default:
        // Custom command handlers
        if (this.commandCallbacks[cmd]) {
          this.commandCallbacks[cmd](args, this);
        } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          // Send to server via WebSocket
          this.socket.send(JSON.stringify({ cmd: trimmedCmd }));
        } else {
          this.terminal.write(`Command not found: ${cmd}\r\n`);
        }
    }
    
    this.prompt();
  }
  
  prompt() {
    this.terminal.write('$ ');
  }
  
  write(text) {
    this.terminal.write(text);
  }
  
  writeLine(text) {
    this.terminal.write(text + '\r\n');
  }
  
  registerCommand(name, callback) {
  }
  
  connectToWebSocket(url) {
    try {
      // Close existing connection if any
      if (this.socket) {
        try {
          this.socket.close();
        } catch (err) {
          console.warn('Error closing existing socket:', err);
        }
      }
      
      // Reset connection state
      this.retryCount = 0;
      this.finalMessageShown = false;
      this.connectionFailed = false;
      
      // Determine WebSocket URL based on current location
      let wsUrl = url;
      if (!wsUrl) {
        // Handle Cascade preview proxy case
        const isSecure = window.location.protocol === 'https:';
        const wsProtocol = isSecure ? 'wss:' : 'ws:';
        const host = window.location.host;
        
        if (host.includes('127.0.0.1') && !host.includes('5000')) {
          // When in Cascade preview, use the proxy URL
          wsUrl = `${wsProtocol}//${host}/terminal`;
          console.log('Using proxy WebSocket URL:', wsUrl);
        } else if (host.includes('localhost')) {
          // Direct connection to Flask for localhost
          wsUrl = 'ws://localhost:5000/terminal';
        } else {
          // Relative URL for all other hosts
          wsUrl = `${wsProtocol}//${host}/terminal`;
        }
      }
      
      console.log('Connecting to WebSocket:', wsUrl);
      this.lastWsUrl = wsUrl; // Save for reconnection
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.output) {
            this.terminal.write(data.output);
          }
          if (data.error) {
            this.terminal.write(`\r\n Error: ${data.error}\r\n`);
            this.prompt();
          }
          if (data.preview) {
            // Trigger a preview update event
            const previewEvent = new CustomEvent('terminal:preview', { 
              detail: { content: data.preview } 
            });
            window.dispatchEvent(previewEvent);
          }
        } catch (e) {
          // Fallback for non-JSON messages
          this.terminal.write(event.data);
        }
      };
      
      this.socket.onopen = () => {
        this.retryCount = 0; // Reset retry counter on successful connection
        this.connectionFailed = false;
        this.writeLine('\r\n Connected to Mama Bear terminal service');
        console.log('WebSocket connection established successfully');
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (!this.connectionFailed) {
          this.connectionFailed = true;
          this.writeLine('\r\n WebSocket connection error');
        }
      };
      
      this.socket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        
        if (!this.connectionFailed) {
          this.writeLine('\r\n Disconnected from terminal service');
        }
        
        // Auto-reconnect on unexpected closure
        if (event.code !== 1000 && event.code !== 1001) {
          if (this.retryCount < 3) { // Max 3 retry attempts
            const delay = Math.min(1000 * Math.pow(2, this.retryCount), 5000);
            this.retryCount++;
            
            console.log(`Retry ${nextRetry}/${MAX_RETRIES}: Reconnecting in ${delay/1000} seconds...`);
            
            setTimeout(() => {
              this.connectWithRetry(url, nextRetry);
            }, delay);
          } else if (this.retryCount >= MAX_RETRIES && !this.finalMessageShown) {
            this.finalMessageShown = true;
            this.writeLine('\r\n❌ Could not connect to terminal service after multiple attempts');
            this.writeLine('\r\n   Please refresh the page to try again');
          }
        };
      } catch (e) {
        console.error('Error creating WebSocket:', e);
        if (this.retryCount < MAX_RETRIES) {
          setTimeout(() => {
            this.connectWithRetry(url, this.retryCount + 1);
          }, 2000);
        }
      }
    } catch (e) {
      console.error('Failed to connect WebSocket:', e);
    }
  }
  
  showHelp() {
    this.writeLine('\r\n🐻 Mama Bear Terminal Commands:');
    this.writeLine('---------------------------');
    this.writeLine('clear               Clear the terminal');
    this.writeLine('help                Show this help message');
    this.writeLine('echo <message>      Print a message');
    
    // List registered commands
    Object.keys(this.commandCallbacks).forEach(cmd => {
      this.writeLine(`${cmd.padEnd(20)} Custom command`);
    });
    
    // List server commands if socket connected
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.writeLine('\r\nFile System Commands:');
      this.writeLine('---------------------------');
      this.writeLine('ls                  List files in current directory');
      this.writeLine('cat <filename>      Display file contents');
      this.writeLine('touch <filename>    Create a new file');
      this.writeLine('mkdir <dirname>     Create a new directory');
      this.writeLine('rm <filename>       Remove a file');
      this.writeLine('cd <path>           Change directory');
      
      this.writeLine('\r\nMCP Commands:');
      this.writeLine('---------------------------');
      this.writeLine('mcp web-search <query>     Search the web using Brave');
      this.writeLine('mcp code-search <query>    Search for code samples on GitHub');
      this.writeLine('mcp npm install <package>  Install an npm package');
      this.writeLine('mcp run <script>           Run a project script');
    }
    
    this.writeLine('');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PodplayTerminal;
} else {
  window.PodplayTerminal = PodplayTerminal;
}