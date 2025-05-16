/**
 * Podplay Build Sanctuary - Build Mode Terminal
 * 
 * Integrates WebContainer with Xterm.js terminal:
 * - Command execution in WebContainer environment
 * - Input/output handling
 * - Special command processing
 * 
 * Created by Mama Bear 🐻💜
 */

class BuildModeTerminal {
  constructor(buildMode) {
    this.buildMode = buildMode;
    this.webContainer = null;
    this.terminal = null;
    this.shellProcess = null;
    this.isConnected = false;
    
    // Command history
    this.history = [];
    this.historyIndex = 0;
    
    // Special command handlers
    this.specialCommands = {
      'create-project': this.handleCreateProject.bind(this),
      'install-deps': this.handleInstallDeps.bind(this),
      'preview': this.handlePreview.bind(this),
      'help': this.handleHelp.bind(this)
    };
  }
  
  // Initialize with WebContainer instance
  async initialize(webContainer, terminal) {
    this.webContainer = webContainer;
    this.terminal = terminal;
    
    if (!this.webContainer || !this.terminal) {
      console.error('🛠️ Build Mode Terminal: Missing WebContainer or terminal');
      return false;
    }
    
    console.log('🛠️ Build Mode Terminal: Initializing');
    
    try {
      // Start a shell process
      this.shellProcess = await this.webContainer.spawn('jsh');
      
      // Set up I/O piping
      this.shellProcess.output.pipeTo(
        new WritableStream({
          write: (data) => {
            this.terminal.write(data);
          }
        })
      );
      
      // Handle input
      this.terminal.onData((data) => {
        // Check for special command starting with !
        if (data === '\r' && this.pendingCommand && this.pendingCommand.startsWith('!')) {
          this.handleSpecialCommand(this.pendingCommand.substring(1));
          this.pendingCommand = '';
          return;
        }
        
        // Send to shell
        this.shellProcess.input.write(data);
      });
      
      this.isConnected = true;
      console.log('🛠️ Build Mode Terminal: Connected');
      
      // Initial welcome message
      this.writeOutput('\r\n🐻💜 Podplay Build Mode Terminal\r\n');
      this.writeOutput('Type !help for a list of special commands\r\n\n');
      
      return true;
    } catch (error) {
      console.error('🛠️ Build Mode Terminal: Initialization error', error);
      return false;
    }
  }
  
  // Write output to terminal
  writeOutput(text) {
    if (this.terminal) {
      this.terminal.write(text);
    }
  }
  
  // Execute a command directly
  async executeCommand(command) {
    if (!this.isConnected) return null;
    
    try {
      // Special commands
      if (command.startsWith('!')) {
        return await this.handleSpecialCommand(command.substring(1));
      }
      
      // Regular command execution
      this.writeOutput(`${command}\r\n`);
      
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
        this.writeOutput(value);
      }
      
      // Wait for process to exit
      const exitCode = await process.exit;
      
      // Add to history
      this.history.push(command);
      this.historyIndex = this.history.length;
      
      return { output, exitCode };
    } catch (error) {
      console.error('🛠️ Build Mode Terminal: Command execution error', error);
      this.writeOutput(`\r\nError: ${error.message}\r\n`);
      return { error: error.message, exitCode: 1 };
    }
  }
  
  // Handle special commands (starting with !)
  async handleSpecialCommand(command) {
    const parts = command.trim().split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);
    
    if (this.specialCommands[cmd]) {
      return await this.specialCommands[cmd](args);
    } else {
      this.writeOutput(`\r\nUnknown special command: ${cmd}\r\n`);
      this.writeOutput('Type !help for a list of special commands\r\n');
      return { error: 'Unknown command', exitCode: 1 };
    }
  }
  
  // Special command handlers
  
  async handleCreateProject(args) {
    const template = args[0] || 'node';
    const name = args[1] || 'my-project';
    
    this.writeOutput(`\r\nCreating ${template} project: ${name}...\r\n`);
    
    try {
      if (this.buildMode.fs) {
        const success = await this.buildMode.fs.createProject(template, name);
        
        if (success) {
          this.writeOutput(`Project created successfully in /${name}\r\n`);
          await this.executeCommand(`cd /${name}`);
          await this.executeCommand('ls -la');
          return { success: true, template, name };
        } else {
          throw new Error('Project creation failed');
        }
      } else {
        throw new Error('File system not initialized');
      }
    } catch (error) {
      this.writeOutput(`\r\nError creating project: ${error.message}\r\n`);
      return { error: error.message, exitCode: 1 };
    }
  }
  
  async handleInstallDeps(args) {
    const packageManager = args[0] || 'npm';
    
    this.writeOutput(`\r\nInstalling dependencies with ${packageManager}...\r\n`);
    
    try {
      if (packageManager === 'npm') {
        await this.executeCommand('npm install');
      } else if (packageManager === 'yarn') {
        await this.executeCommand('yarn install');
      } else if (packageManager === 'pnpm') {
        await this.executeCommand('pnpm install');
      } else {
        throw new Error(`Unsupported package manager: ${packageManager}`);
      }
      
      this.writeOutput('\r\nDependencies installed successfully!\r\n');
      return { success: true };
    } catch (error) {
      this.writeOutput(`\r\nError installing dependencies: ${error.message}\r\n`);
      return { error: error.message, exitCode: 1 };
    }
  }
  
  async handlePreview(args) {
    const port = args[0] || '3000';
    
    this.writeOutput(`\r\nStarting preview server on port ${port}...\r\n`);
    
    try {
      // Dispatch event for UI to handle
      const event = new CustomEvent('buildmode:preview', { 
        detail: { port: parseInt(port, 10) } 
      });
      document.dispatchEvent(event);
      
      this.writeOutput(`Preview server started on port ${port}\r\n`);
      return { success: true, port };
    } catch (error) {
      this.writeOutput(`\r\nError starting preview: ${error.message}\r\n`);
      return { error: error.message, exitCode: 1 };
    }
  }
  
  async handleHelp() {
    this.writeOutput('\r\n🐻💜 Podplay Build Mode - Special Commands:\r\n\n');
    this.writeOutput('!create-project [template] [name] - Create a new project from template\r\n');
    this.writeOutput('  Available templates: node, react, html\r\n');
    this.writeOutput('!install-deps [npm|yarn|pnpm] - Install dependencies\r\n');
    this.writeOutput('!preview [port] - Start preview server\r\n');
    this.writeOutput('!help - Show this help message\r\n\n');
    
    return { success: true };
  }
}

// Initialize when BuildMode is ready
document.addEventListener('buildmode:ready', (event) => {
  if (event.detail && event.detail.buildMode) {
    // Wait for terminal to be ready
    const checkTerminal = () => {
      if (window.xterm) {
        const terminal = new BuildModeTerminal(event.detail.buildMode);
        event.detail.buildMode.terminal = terminal;
        console.log('🛠️ Build Mode Terminal: Ready');
      } else {
        setTimeout(checkTerminal, 100);
      }
    };
    
    checkTerminal();
  }
});
