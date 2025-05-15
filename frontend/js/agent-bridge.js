/**
 * Mama Bear Agent Bridge
 * 
 * This module connects the AI agent (Mama Bear) with the development environment,
 * allowing her to programmatically control the terminal, file system, editor, and preview components.
 * It provides a bridge between the backend agent API and the frontend components.
 * 
 * Created with love by Mama Bear for Nathan 🐻💜
 */

class AgentBridge {
  constructor() {
    this.initialized = false;
    this.eventListeners = {};
    
    // Reference to environment components
    this.terminal = null;
    this.fileExplorer = null;
    this.codeEditor = null;
    this.devEnvironment = null;
    
    // Queue of commands to execute when components become available
    this.commandQueue = {
      terminal: [],
      fileExplorer: [],
      codeEditor: [],
      environment: []
    };
    
    // Last environment state
    this.lastState = {
      terminalVisible: false,
      fileExplorerVisible: false,
      editorVisible: false,
      environmentOpen: false
    };
  }
  
  async init() {
    if (this.initialized) return this;
    
    console.log('Initializing Mama Bear Agent Bridge...');
    
    // Set up WebSocket for agent commands
    this.setupMessageListener();
    
    // Connect to existing environment components
    this.connectToExistingComponents();
    
    // Add event listeners for component initialization
    this.addComponentListeners();
    
    // Set up command handling
    this.setupCommandHandling();
    
    this.initialized = true;
    console.log('Mama Bear Agent Bridge initialized! 🐻');
    
    // Send a ready event to the server
    this.sendStateUpdate({
      type: 'agent_bridge_ready',
      components: {
        terminal: !!this.terminal,
        fileExplorer: !!this.fileExplorer,
        codeEditor: !!this.codeEditor,
        devEnvironment: !!this.devEnvironment
      }
    });
    
    return this;
  }
  
  setupMessageListener() {
    // Listen for agent commands via the chat system
    window.addEventListener('agent_command', (event) => {
      if (event.detail && event.detail.command) {
        this.handleAgentCommand(event.detail);
      }
    });
    
    // Create a function to handle agent responses
    window.handleAgentBridgeCommand = (command) => {
      this.handleAgentCommand(command);
    };
    
    console.log('Agent bridge message listener set up');
  }
  
  connectToExistingComponents() {
    // Connect to terminal if available
    if (window.podplayTerminal) {
      this.terminal = window.podplayTerminal;
      console.log('Connected to existing terminal');
    }
    
    // Connect to file explorer if available
    if (window.fileExplorer) {
      this.fileExplorer = window.fileExplorer;
      console.log('Connected to existing file explorer');
    }
    
    // Connect to code editor if available
    if (window.codeEditor) {
      this.codeEditor = window.codeEditor;
      console.log('Connected to existing code editor');
    }
    
    // Connect to dev environment if available
    if (window.devEnvironment) {
      this.devEnvironment = window.devEnvironment;
      console.log('Connected to existing dev environment');
    }
  }
  
  addComponentListeners() {
    // Listen for terminal initialization
    window.addEventListener('terminal_initialized', (event) => {
      this.terminal = event.detail.terminal || window.podplayTerminal;
      console.log('Terminal initialized, processing queued commands...');
      this.processQueuedCommands('terminal');
    });
    
    // Listen for file explorer initialization
    window.addEventListener('file_explorer_initialized', (event) => {
      this.fileExplorer = event.detail.fileExplorer || window.fileExplorer;
      console.log('File explorer initialized, processing queued commands...');
      this.processQueuedCommands('fileExplorer');
    });
    
    // Listen for code editor initialization
    window.addEventListener('code_editor_initialized', (event) => {
      this.codeEditor = event.detail.codeEditor || window.codeEditor;
      console.log('Code editor initialized, processing queued commands...');
      this.processQueuedCommands('codeEditor');
    });
    
    // Listen for dev environment initialization
    window.addEventListener('dev_environment_initialized', (event) => {
      this.devEnvironment = event.detail.devEnvironment || window.devEnvironment;
      console.log('Dev environment initialized, processing queued commands...');
      this.processQueuedCommands('environment');
    });
  }
  
  setupCommandHandling() {
    // Add handlers for different command types
    this.commandHandlers = {
      // Terminal commands
      execute_terminal_command: (params) => this.executeTerminalCommand(params.command),
      clear_terminal: () => this.clearTerminal(),
      
      // File system commands
      list_files: (params) => this.listFiles(params.directory || '/'),
      read_file: (params) => this.readFile(params.filepath),
      write_file: (params) => this.writeFile(params.filepath, params.content),
      create_file: (params) => this.createFile(params.filepath, params.content || ''),
      delete_file: (params) => this.deleteFile(params.filepath, params.recursive),
      
      // Editor commands
      open_in_editor: (params) => this.openInEditor(params.filepath),
      set_editor_content: (params) => this.setEditorContent(params.content, params.language),
      get_editor_content: () => this.getEditorContent(),
      
      // Preview commands
      show_preview: (params) => this.showPreview(params.content),
      hide_preview: () => this.hidePreview(),
      
      // Environment commands
      open_environment: () => this.openEnvironment(),
      close_environment: () => this.closeEnvironment(),
      toggle_environment: () => this.toggleEnvironment(),
      toggle_terminal: () => this.toggleTerminal(),
      toggle_file_explorer: () => this.toggleFileExplorer()
    };
  }
  
  processQueuedCommands(componentType) {
    // Process any queued commands for this component
    if (this.commandQueue[componentType] && this.commandQueue[componentType].length > 0) {
      const commands = [...this.commandQueue[componentType]];
      this.commandQueue[componentType] = [];
      
      commands.forEach(cmd => {
        console.log(`Executing queued ${componentType} command:`, cmd);
        this.handleAgentCommand(cmd);
      });
    }
  }
  
  handleAgentCommand(command) {
    console.log('Handling agent command:', command);
    
    const { action, params = {} } = command;
    
    // Check if handler exists
    if (this.commandHandlers[action]) {
      try {
        // Execute the handler
        const result = this.commandHandlers[action](params);
        
        // Send result back to the server if it's a Promise
        if (result instanceof Promise) {
          result
            .then(data => {
              this.sendCommandResult(command, data);
            })
            .catch(error => {
              console.error(`Error executing ${action}:`, error);
              this.sendCommandError(command, error);
            });
        } else if (result !== undefined) {
          // Send non-Promise result
          this.sendCommandResult(command, result);
        }
      } catch (error) {
        console.error(`Error executing ${action}:`, error);
        this.sendCommandError(command, error);
      }
    } else {
      console.warn(`Unknown command action: ${action}`);
      this.sendCommandError(command, { message: `Unknown command: ${action}` });
    }
  }
  
  queueCommandForComponent(componentType, command) {
    console.log(`Queueing ${componentType} command:`, command);
    this.commandQueue[componentType].push(command);
    return Promise.resolve({ queued: true, component: componentType });
  }
  
  // Terminal commands
  executeTerminalCommand(command) {
    if (!this.terminal) {
      return this.queueCommandForComponent('terminal', { action: 'execute_terminal_command', params: { command } });
    }
    
    console.log(`Executing terminal command: ${command}`);
    
    if (typeof this.terminal.execute_command === 'function') {
      this.terminal.execute_command(command);
    } else if (this.terminal.terminal) {
      // For some terminal implementations
      this.terminal.terminal.write(`${command}\r\n`);
      
      // Simulate Enter key
      if (typeof this.terminal.processCommand === 'function') {
        this.terminal.processCommand(command);
      }
    }
    
    // Also send the command to the server for execution
    return fetch('/api/agent/terminal/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    })
    .then(response => response.json());
  }
  
  clearTerminal() {
    if (!this.terminal) {
      return this.queueCommandForComponent('terminal', { action: 'clear_terminal' });
    }
    
    if (typeof this.terminal.clear === 'function') {
      this.terminal.clear();
    } else if (this.terminal.terminal && typeof this.terminal.terminal.clear === 'function') {
      this.terminal.terminal.clear();
    }
    
    return Promise.resolve({ success: true });
  }
  
  // File system commands
  listFiles(directory = '/') {
    // Always use the API for this to ensure we get structured data
    return fetch(`/api/agent/files/list?directory=${encodeURIComponent(directory)}`)
      .then(response => response.json());
  }
  
  readFile(filepath) {
    // Always use the API for this to ensure we get structured data
    return fetch(`/api/agent/files/read?filepath=${encodeURIComponent(filepath)}`)
      .then(response => response.json());
  }
  
  writeFile(filepath, content) {
    return fetch('/api/agent/files/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filepath, content })
    })
    .then(response => response.json());
  }
  
  createFile(filepath, content = '') {
    return fetch('/api/agent/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filepath, content })
    })
    .then(response => response.json());
  }
  
  deleteFile(filepath, recursive = false) {
    return fetch('/api/agent/files/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filepath, recursive })
    })
    .then(response => response.json());
  }
  
  // Editor commands
  openInEditor(filepath) {
    if (!this.codeEditor) {
      return this.queueCommandForComponent('codeEditor', { action: 'open_in_editor', params: { filepath } });
    }
    
    // First make sure the environment is open
    this.openEnvironment();
    
    // Read the file content through API
    return this.readFile(filepath)
      .then(response => {
        if (response.success) {
          // Set the editor content
          if (typeof this.codeEditor.openFile === 'function') {
            this.codeEditor.openFile({
              name: filepath.split('/').pop(),
              path: filepath,
              type: 'file'
            });
          } else if (typeof this.codeEditor.setValue === 'function') {
            this.codeEditor.setValue(response.content);
            this.codeEditor.setLanguage(response.language || 'plaintext');
          } else if (this.codeEditor.editor && typeof this.codeEditor.editor.setValue === 'function') {
            this.codeEditor.editor.setValue(response.content);
            // Set language if possible
            if (this.codeEditor.monaco && this.codeEditor.editor.getModel()) {
              this.codeEditor.monaco.editor.setModelLanguage(
                this.codeEditor.editor.getModel(),
                response.language || 'plaintext'
              );
            }
          }
          
          // Also execute a command to open the file in terminal
          this.executeTerminalCommand(`cat ${filepath}`);
          
          return { success: true, filepath, content: response.content };
        }
        return response;
      });
  }
  
  setEditorContent(content, language = 'javascript') {
    if (!this.codeEditor) {
      return this.queueCommandForComponent('codeEditor', { 
        action: 'set_editor_content', 
        params: { content, language } 
      });
    }
    
    // Open the environment if it's not already open
    this.openEnvironment();
    
    // Set the content in the editor
    if (typeof this.codeEditor.setValue === 'function') {
      this.codeEditor.setValue(content);
      this.codeEditor.setLanguage(language);
    } else if (this.codeEditor.editor && typeof this.codeEditor.editor.setValue === 'function') {
      this.codeEditor.editor.setValue(content);
      // Set language if possible
      if (this.codeEditor.monaco && this.codeEditor.editor.getModel()) {
        this.codeEditor.monaco.editor.setModelLanguage(
          this.codeEditor.editor.getModel(),
          language
        );
      }
    }
    
    return Promise.resolve({ success: true, contentLength: content.length, language });
  }
  
  getEditorContent() {
    if (!this.codeEditor) {
      return Promise.resolve({ success: false, error: "Code editor not available" });
    }
    
    let content = '';
    let language = 'plaintext';
    
    if (typeof this.codeEditor.getValue === 'function') {
      content = this.codeEditor.getValue();
      language = this.codeEditor.getLanguage ? this.codeEditor.getLanguage() : language;
    } else if (this.codeEditor.editor && typeof this.codeEditor.editor.getValue === 'function') {
      content = this.codeEditor.editor.getValue();
      // Get language if possible
      if (this.codeEditor.monaco && this.codeEditor.editor.getModel()) {
        language = this.codeEditor.editor.getModel().getLanguageId();
      }
    }
    
    return Promise.resolve({ success: true, content, language });
  }
  
  // Preview commands
  showPreview(content) {
    // Create a preview event
    const previewEvent = new CustomEvent('terminal:preview', {
      detail: { content }
    });
    window.dispatchEvent(previewEvent);
    
    // Also use API for consistency
    return fetch('/api/agent/preview/show', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
    .then(response => response.json());
  }
  
  hidePreview() {
    // Find the preview container and hide it
    const previewContainer = document.getElementById('podplay-preview-container');
    if (previewContainer) {
      previewContainer.style.display = 'none';
    }
    
    return Promise.resolve({ success: true });
  }
  
  // Environment commands
  openEnvironment() {
    if (!this.devEnvironment) {
      return this.queueCommandForComponent('environment', { action: 'open_environment' });
    }
    
    if (typeof this.devEnvironment.show === 'function') {
      this.devEnvironment.show();
      this.lastState.environmentOpen = true;
    } else {
      // Try to find and click the open button
      const openButton = document.getElementById('open-dev-env-btn');
      if (openButton) {
        openButton.click();
        this.lastState.environmentOpen = true;
      }
    }
    
    // Also use API for consistency
    return fetch('/api/agent/environment/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    .then(response => response.json());
  }
  
  closeEnvironment() {
    if (!this.devEnvironment) {
      return Promise.resolve({ success: false, error: "Environment not available" });
    }
    
    if (typeof this.devEnvironment.hide === 'function') {
      this.devEnvironment.hide();
      this.lastState.environmentOpen = false;
    } else {
      // Try to find and click the close button
      const closeButton = document.getElementById('dev-env-close');
      if (closeButton) {
        closeButton.click();
        this.lastState.environmentOpen = false;
      }
    }
    
    return Promise.resolve({ success: true });
  }
  
  toggleEnvironment() {
    if (!this.devEnvironment) {
      return this.openEnvironment();
    }
    
    if (typeof this.devEnvironment.toggle === 'function') {
      this.devEnvironment.toggle();
      this.lastState.environmentOpen = !this.lastState.environmentOpen;
    } else {
      if (this.lastState.environmentOpen) {
        return this.closeEnvironment();
      } else {
        return this.openEnvironment();
      }
    }
    
    return Promise.resolve({ success: true, state: this.lastState.environmentOpen });
  }
  
  toggleTerminal() {
    if (!this.devEnvironment) {
      return Promise.resolve({ success: false, error: "Environment not available" });
    }
    
    if (typeof this.devEnvironment.toggleTerminal === 'function') {
      this.devEnvironment.toggleTerminal();
      this.lastState.terminalVisible = !this.lastState.terminalVisible;
    } else {
      // Try to find and click the terminal toggle button
      const terminalToggleBtn = document.getElementById('dev-env-toggle-terminal');
      if (terminalToggleBtn) {
        terminalToggleBtn.click();
        this.lastState.terminalVisible = !this.lastState.terminalVisible;
      }
    }
    
    return Promise.resolve({ success: true, state: this.lastState.terminalVisible });
  }
  
  toggleFileExplorer() {
    if (!this.devEnvironment) {
      return Promise.resolve({ success: false, error: "Environment not available" });
    }
    
    if (typeof this.devEnvironment.toggleFileExplorer === 'function') {
      this.devEnvironment.toggleFileExplorer();
      this.lastState.fileExplorerVisible = !this.lastState.fileExplorerVisible;
    } else {
      // Try to find and click the file explorer toggle button
      const fileExplorerToggleBtn = document.getElementById('dev-env-toggle-file-explorer');
      if (fileExplorerToggleBtn) {
        fileExplorerToggleBtn.click();
        this.lastState.fileExplorerVisible = !this.lastState.fileExplorerVisible;
      }
    }
    
    return Promise.resolve({ success: true, state: this.lastState.fileExplorerVisible });
  }
  
  // Helper methods
  sendCommandResult(command, result) {
    // This would send the result back to the server/agent
    console.log(`Command ${command.action} result:`, result);
    
    // In a real implementation, we'd send this to the server
    // For now, we'll just dispatch an event
    const resultEvent = new CustomEvent('agent_command_result', {
      detail: {
        commandId: command.id,
        action: command.action,
        result
      }
    });
    window.dispatchEvent(resultEvent);
  }
  
  sendCommandError(command, error) {
    // This would send an error back to the server/agent
    console.error(`Command ${command.action} error:`, error);
    
    // In a real implementation, we'd send this to the server
    // For now, we'll just dispatch an event
    const errorEvent = new CustomEvent('agent_command_error', {
      detail: {
        commandId: command.id,
        action: command.action,
        error: error.message || String(error)
      }
    });
    window.dispatchEvent(errorEvent);
  }
  
  sendStateUpdate(state) {
    // This would send a state update to the server/agent
    console.log('Sending state update:', state);
    
    // In a real implementation, we'd send this to the server
    // For now, we'll just dispatch an event
    const stateEvent = new CustomEvent('agent_state_update', {
      detail: state
    });
    window.dispatchEvent(stateEvent);
  }
}

// Initialize the agent bridge on page load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Check if environment status endpoint is available
    const statusResponse = await fetch('/api/environment/status');
    const status = await statusResponse.json();
    
    console.log('Environment status:', status);
    
    // Only initialize if agent bridge is available
    if (status.agent_bridge_available) {
      console.log('Agent bridge API available, initializing frontend bridge...');
      
      // Create and initialize the agent bridge
      window.agentBridge = new AgentBridge();
      await window.agentBridge.init();
      
      // Initialize event to tell Mama Bear we're ready
      const readyEvent = new CustomEvent('agent_bridge_ready', {
        detail: { 
          timestamp: new Date().toISOString() 
        }
      });
      window.dispatchEvent(readyEvent);
      
      console.log('Mama Bear Agent Bridge is ready! The AI can now control the development environment! 🐻💜');
      
      // Add a visual indicator that Mama Bear has control
      const controlIndicator = document.createElement('div');
      controlIndicator.id = 'mama-bear-control-indicator';
      controlIndicator.innerHTML = '🐻';
      controlIndicator.setAttribute('title', 'Mama Bear has agentic control of your development environment');
      
      // Style the indicator
      Object.assign(controlIndicator.style, {
        position: 'fixed',
        top: '10px',
        right: '10px',
        backgroundColor: '#a277ff',
        color: 'white',
        borderRadius: '50%',
        width: '30px',
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
        zIndex: '9999',
        cursor: 'pointer'
      });
      
      // Add hover animation
      controlIndicator.addEventListener('mouseenter', () => {
        controlIndicator.style.transform = 'scale(1.2)';
      });
      
      controlIndicator.addEventListener('mouseleave', () => {
        controlIndicator.style.transform = 'scale(1)';
      });
      
      // Add click handler to show a message
      controlIndicator.addEventListener('click', () => {
        alert('Mama Bear has full agentic control of your development environment! She can create files, run commands, and build projects for you. Just ask her to help you with development tasks! 🐻💜');
      });
      
      document.body.appendChild(controlIndicator);
    }
  } catch (error) {
    console.error('Error initializing agent bridge:', error);
  }
});