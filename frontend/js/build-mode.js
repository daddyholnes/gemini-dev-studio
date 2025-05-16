/**
 * Podplay Build Sanctuary - Build Mode
 * 
 * Core component that integrates WebContainer API for browser-based development
 * Created by Mama Bear 🐻💜
 */

class BuildMode {
  constructor() {
    // Core components
    this.webContainer = null;
    this.terminal = null;
    this.fileSystem = null;
    this.ui = null;
    this.dockerEnvironment = null; // Will be set by docker-integration.js
    
    // State
    this.isActive = false;
    this.isInitialized = false;
    this.isLoading = false;
    this.currentFile = null;
    
    // Bind methods
    this.toggleBuildMode = this.toggleBuildMode.bind(this);
    this.handleFileSelected = this.handleFileSelected.bind(this);
    
    // Initialize event listeners
    this.initEventListeners();
  }
  
  /**
   * Initialize event listeners
   */
  initEventListeners() {
    // Toggle Build Mode
    document.addEventListener('click', (event) => {
      if (event.target.id === 'btn-build-mode') {
        this.toggleBuildMode();
      }
    });
    
    // File selection
    document.addEventListener('buildmode:fileselected', (event) => {
      if (event.detail && event.detail.path) {
        this.handleFileSelected(event.detail.path);
      }
    });
  }
  
  /**
   * Initialize WebContainer
   */
  async initialize() {
    if (this.isInitialized || this.isLoading) return;
    this.isLoading = true;
    
    console.log('🛠️ Build Mode: Initializing...');
    
    try {
      // Show loading indicator
      this.showLoading(true);
      
      let WebContainer;
      
      console.log('🛠️ Build Mode: Initializing WebContainer...');
      
      // Multiple fallback options to ensure WebContainer loads
      try {
        // APPROACH 1: Try loading from CDN with timeout protection
        console.log('🛠️ Build Mode: Attempting to load WebContainer from jsdelivr CDN...');
        const module = await Promise.race([
          import('https://cdn.jsdelivr.net/npm/@webcontainer/api@1.1.0/dist/index.js'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('jsdelivr CDN timeout')), 3000))
        ]);
        WebContainer = module.WebContainer;
        console.log('🛠️ Build Mode: Successfully loaded WebContainer from jsdelivr CDN');
      } catch (jsdelivrError) {
        console.log('🛠️ Build Mode: jsdelivr CDN failed:', jsdelivrError.message);
        
        try {
          // APPROACH 2: Try unpkg as alternative CDN
          console.log('🛠️ Build Mode: Attempting to load WebContainer from unpkg CDN...');
          const module = await Promise.race([
            import('https://unpkg.com/@webcontainer/api@1.1.0/dist/index.js'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('unpkg CDN timeout')), 3000))
          ]);
          WebContainer = module.WebContainer;
          console.log('🛠️ Build Mode: Successfully loaded WebContainer from unpkg CDN');
        } catch (unpkgError) {
          console.log('🛠️ Build Mode: unpkg CDN failed:', unpkgError.message);
          
          // APPROACH 3: Use local fallback script
          console.log('🛠️ Build Mode: All CDNs failed, using local fallback');
          
          // Check if it's already loaded
          if (window.WebContainer) {
            console.log('🛠️ Build Mode: Local WebContainer already available');
            WebContainer = window.WebContainer;
          } else {
            // Load our clean version of the WebContainer API
            console.log('🛠️ Build Mode: Loading clean local WebContainer API');
            
            const script = document.createElement('script');
            script.src = './lib/webcontainer-api-clean.js';
            document.head.appendChild(script);
            
            // Wait for the script to load
            await new Promise((resolve, reject) => {
              script.onload = () => {
                console.log('🛠️ Build Mode: Local WebContainer script loaded');
                resolve();
              };
              script.onerror = (error) => {
                console.error('🛠️ Build Mode: Failed to load local WebContainer script', error);
                reject(new Error('Failed to load local WebContainer script'));
              };
              
              // Additional timeout for script loading
              setTimeout(() => {
                if (!window.WebContainer) {
                  console.log('🛠️ Build Mode: Loading timeout, forcing local fallback');
                  // Force include the original fallback as last resort
                  const fallbackScript = document.createElement('script');
                  fallbackScript.src = './lib/webcontainer-api.js';
                  document.head.appendChild(fallbackScript);
                  setTimeout(resolve, 500); // Give a moment for script to execute
                }
              }, 2000);
            });
            
            // After script is loaded, get the WebContainer object
            if (window.WebContainer) {
              console.log('🛠️ Build Mode: Successfully loaded local WebContainer');
              WebContainer = window.WebContainer;
            } else {
              throw new Error('Failed to load WebContainer from any source');
            }
          }
        }
      }
      
      // Create WebContainer instance
      console.log('🛠️ Build Mode: Booting WebContainer...');
      this.webContainer = await WebContainer.boot();
      
      // Connect with Docker environment if available
      if (window.dockerIntegration && window.dockerIntegration.isConnected) {
        console.log('🐳 Build Mode: Connecting with Docker environment');
        
        // Register callback for when Docker environment is ready
        if (typeof this.onWebContainerReady === 'function') {
          this.onWebContainerReady(this.webContainer);
        }
      }
      
      // Create UI container if needed
      this.ensureUIContainer();
      
      // Signal that BuildMode is ready
      document.dispatchEvent(new CustomEvent('buildmode:ready', { 
        detail: { buildMode: this } 
      }));
      
      // Wait for file system to initialize
      if (this.fs) {
        await this.fs.initialize(this.webContainer);
      }
      
      // Initialize terminal if available
      if (this.terminal && window.xterm) {
        const terminal = document.getElementById('build-mode-terminal');
        if (terminal) {
          await this.terminal.initialize(this.webContainer, window.xterm);
        }
      }
      
      this.isInitialized = true;
      this.isLoading = false;
      this.showLoading(false);
      
      console.log('🛠️ Build Mode: Initialization complete');
      return true;
    } catch (error) {
      console.error('🛠️ Build Mode: Initialization error', error);
      this.isLoading = false;
      this.showLoading(false);
      this.showError('Failed to initialize Build Mode: ' + error.message);
      return false;
    }
  }
  
  /**
   * Toggle Build Mode on/off
   */
  async toggleBuildMode() {
    if (this.isLoading) return;
    
    if (!this.isActive) {
      // Activate
      if (!this.isInitialized) {
        const initSuccess = await this.initialize();
        if (!initSuccess) return;
      }
      
      // Hide all other panels first
      const panels = document.querySelectorAll('#build-panel, #chat-panel, #terminal-panel, #debug-panel, #research-panel');
      panels.forEach(panel => {
        if (panel) panel.style.display = 'none';
      });
      
      // Deactivate all tab buttons
      const buttons = document.querySelectorAll('.tool-btn');
      buttons.forEach(btn => {
        if (btn) btn.classList.remove('active');
      });
      
      // Activate Build Mode button
      const buildModeBtn = document.getElementById('btn-build-mode');
      if (buildModeBtn) buildModeBtn.classList.add('active');
      
      document.body.classList.add('build-mode-active');
      this.isActive = true;
      console.log('🛠️ Build Mode: Activated');
      
      // Initialize terminal if applicable
      if (this.terminal && window.xterm) {
        const terminalEl = document.getElementById('build-mode-terminal');
        if (terminalEl) {
          // Create a new terminal instance if needed
          if (!window.terminal) {
            window.terminal = new window.xterm.Terminal({
              cursorBlink: true,
              theme: {
                background: '#0f172a',
                foreground: '#e2e8f0',
                cursor: '#8b5cf6'
              }
            });
          }
          window.terminal.open(terminalEl);
          this.terminal.initialize(this.webContainer, window.terminal);
        }
      }
      
    } else {
      // Deactivate
      document.body.classList.remove('build-mode-active');
      this.isActive = false;
      console.log('🛠️ Build Mode: Deactivated');
      
      // Show build panel by default when exiting
      const buildPanel = document.getElementById('build-panel');
      if (buildPanel) buildPanel.style.display = 'flex';
      
      // Activate build button
      const buildBtn = document.getElementById('build-btn');
      if (buildBtn) buildBtn.classList.add('active');
      
      // Deactivate Build Mode button
      const buildModeBtn = document.getElementById('btn-build-mode');
      if (buildModeBtn) buildModeBtn.classList.remove('active');
    }
  }
  
  /**
   * Ensure UI container exists
   */
  ensureUIContainer() {
    if (!document.querySelector('.build-mode-container')) {
      const container = document.createElement('div');
      container.className = 'build-mode-container';
      container.innerHTML = `
        <div class="build-mode-sidebar">
          <div class="build-mode-header">Explorer</div>
          <div id="build-mode-file-tree" class="build-mode-file-tree"></div>
          <div class="build-mode-templates">
            <select id="build-mode-template">
              <option value="node">Node.js</option>
              <option value="react">React</option>
              <option value="html">HTML</option>
            </select>
            <button id="build-mode-create">Create Project</button>
          </div>
        </div>
        <div class="build-mode-content">
          <div class="build-mode-editor">
            <div class="build-mode-toolbar">
              <button id="build-mode-run">Run</button>
              <button id="build-mode-save">Save</button>
              <button id="build-mode-close">Close</button>
            </div>
            <div id="build-mode-editor-container"></div>
          </div>
          <div class="build-mode-preview">
            <div class="build-mode-header">Preview</div>
            <iframe id="build-mode-preview-iframe" class="build-mode-iframe"></iframe>
          </div>
        </div>
        <div class="build-mode-terminal">
          <div class="build-mode-header">Terminal</div>
          <div id="build-mode-terminal"></div>
        </div>
      `;
      document.body.appendChild(container);
    }
  }
  
  /**
   * Handle file selection
   */
  async handleFileSelected(path) {
    if (!this.isInitialized || !this.fs) return;
    
    try {
      // Read file content
      const content = await this.fs.readFile(path);
      if (content === null) {
        throw new Error('Failed to read file');
      }
      
      // Update editor if available
      if (window.monaco && this.editor) {
        this.editor.setValue(content);
        this.currentFile = path;
        
        // Update status display
        const statusElement = document.getElementById('build-mode-file-path');
        if (statusElement) {
          statusElement.textContent = path;
        }
      } else {
        console.log('File content:', content);
      }
    } catch (error) {
      console.error('🛠️ Build Mode: Error handling file selection', error);
    }
  }
  
  /**
   * Show/hide loading indicator
   */
  showLoading(show) {
    // Implement loading indicator
    const loadingElement = document.getElementById('build-mode-loading');
    if (loadingElement) {
      loadingElement.style.display = show ? 'flex' : 'none';
    }
  }
  
  /**
   * Show error message
   */
  showError(message) {
    console.error('🛠️ Build Mode Error:', message);
    // Implement error display
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.buildMode = new BuildMode();
  
  // Create Build Mode button if it doesn't exist
  if (!document.getElementById('btn-build-mode')) {
    const buildBtn = document.createElement('button');
    buildBtn.id = 'btn-build-mode';
    buildBtn.className = 'tool-btn';
    buildBtn.innerHTML = '<i class="material-icons">build</i>';
    buildBtn.title = 'Build Mode';
    
    const toolbarLeft = document.querySelector('.toolbar-left');
    if (toolbarLeft) {
      toolbarLeft.appendChild(buildBtn);
    }
  }
});
