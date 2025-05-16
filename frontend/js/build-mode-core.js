/**
 * Podplay Build Sanctuary - Build Mode Core
 * 
 * Core functionality for the WebContainer-powered development environment
 * that runs directly in the browser via WebAssembly.
 * 
 * Created by Mama Bear 🐻💜
 */

// Build Mode singleton instance
let buildModeInstance = null;

// Build Mode class
class BuildMode {
  constructor() {
    this.isActive = false;
    this.webContainer = null;
    this.terminal = null;
    this.filesystem = null;
    
    // DOM elements
    this.buildModeBtn = document.getElementById('build-mode-btn');
    
    // Initialize
    this.init();
  }
  
  async init() {
    console.log('🛠️ Build Mode: Initializing core');
    
    // Add event listeners
    if (this.buildModeBtn) {
      this.buildModeBtn.addEventListener('click', () => this.toggleBuildMode());
    }
    
    // Load required scripts
    await this.loadDependencies();
  }
  
  async loadDependencies() {
    console.log('🛠️ Build Mode: Loading dependencies');
    // WebContainer API is the core dependency
    // We'll load it from CDN to avoid bundling issues
    
    return true;
  }
  
  async toggleBuildMode() {
    this.isActive = !this.isActive;
    
    if (this.isActive) {
      this.buildModeBtn.classList.add('active');
      await this.activate();
    } else {
      this.buildModeBtn.classList.remove('active');
      await this.deactivate();
    }
  }
  
  async activate() {
    console.log('🛠️ Build Mode: Activating');
    
    // Notify user via the chat interface
    this.addSystemMessage('Activating Build Mode...');
    
    // Trigger activation in UI components
    document.body.classList.add('build-mode-active');
    
    // Initialize WebContainer if not already done
    if (!this.webContainer && window.WebContainer) {
      try {
        this.webContainer = await window.WebContainer.boot();
        this.addSystemMessage('WebContainer environment ready!');
      } catch (error) {
        console.error('🛠️ Build Mode: WebContainer error', error);
        this.addSystemMessage(`Error initializing WebContainer: ${error.message}`);
      }
    }
    
    this.addSystemMessage('Build Mode is now active!');
  }
  
  async deactivate() {
    console.log('🛠️ Build Mode: Deactivating');
    
    // Notify user
    this.addSystemMessage('Deactivating Build Mode...');
    
    // Trigger deactivation in UI components
    document.body.classList.remove('build-mode-active');
    
    this.addSystemMessage('Build Mode has been deactivated.');
  }
  
  // Helper to add system messages to the chat
  addSystemMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message system-message';
    messageDiv.innerHTML = `
      <div class="sender">System</div>
      <div class="content">
        <p>🛠️ ${message}</p>
      </div>
      <div class="timestamp">Just now</div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Public API methods
  
  /**
   * Execute a command in the WebContainer environment
   * @param {string} command - Command to execute
   * @returns {Promise<string>} Command output
   */
  async executeCommand(command) {
    if (!this.webContainer) {
      throw new Error('WebContainer not initialized');
    }
    
    console.log(`🛠️ Build Mode: Executing command "${command}"`);
    
    try {
      // Split command into parts
      const parts = command.split(' ');
      const process = await this.webContainer.spawn(parts[0], parts.slice(1));
      
      // Collect output
      let output = '';
      const reader = process.output.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        output += value;
      }
      
      // Wait for process to exit
      const exitCode = await process.exit;
      
      return { output, exitCode };
    } catch (error) {
      console.error('🛠️ Build Mode: Command execution error', error);
      throw error;
    }
  }
  
  /**
   * Create or update a file in the WebContainer
   * @param {string} path - File path
   * @param {string} content - File content
   */
  async writeFile(path, content) {
    if (!this.webContainer) {
      throw new Error('WebContainer not initialized');
    }
    
    try {
      await this.webContainer.fs.writeFile(path, content);
      return true;
    } catch (error) {
      console.error('🛠️ Build Mode: File write error', error);
      throw error;
    }
  }
  
  /**
   * Read a file from the WebContainer
   * @param {string} path - File path
   * @returns {Promise<string>} File content
   */
  async readFile(path) {
    if (!this.webContainer) {
      throw new Error('WebContainer not initialized');
    }
    
    try {
      return await this.webContainer.fs.readFile(path, 'utf-8');
    } catch (error) {
      console.error('🛠️ Build Mode: File read error', error);
      throw error;
    }
  }
  
  /**
   * List directory contents
   * @param {string} path - Directory path
   * @returns {Promise<string[]>} List of files and directories
   */
  async listFiles(path) {
    if (!this.webContainer) {
      throw new Error('WebContainer not initialized');
    }
    
    try {
      return await this.webContainer.fs.readdir(path);
    } catch (error) {
      console.error('🛠️ Build Mode: Directory listing error', error);
      throw error;
    }
  }
}

// Initialize Build Mode when the document is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🛠️ Build Mode: Setting up');
  buildModeInstance = new BuildMode();
  
  // Add to window for external access
  window.BuildMode = buildModeInstance;
});
