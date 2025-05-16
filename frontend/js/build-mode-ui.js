/**
 * Podplay Build Sanctuary - Build Mode UI
 * 
 * Creates and manages the user interface for Build Mode:
 * - Project explorer panel
 * - File editor
 * - Preview panel
 * - Terminal integration
 * 
 * Created by Mama Bear 🐻💜
 */

class BuildModeUI {
  constructor(buildMode) {
    this.buildMode = buildMode;
    this.container = null;
    this.editor = null;
    this.terminal = null;
    
    // DOM Elements
    this.fileTree = null;
    this.editorContainer = null;
    this.previewFrame = null;
    this.terminalContainer = null;
    
    // Event listeners
    this.addEventListeners();
  }
  
  /**
   * Create the UI elements
   */
  create() {
    console.log('🛠️ Build Mode UI: Creating interface');
    
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'build-mode-container';
      
      // Build the basic structure
      this.container.innerHTML = `
        <div class="build-mode-header">
          <h2>Podplay Build Mode 🐻💜</h2>
          <div class="build-mode-actions">
            <button id="build-mode-run" class="build-mode-btn">▶ Run</button>
            <button id="build-mode-close" class="build-mode-btn">Close</button>
          </div>
        </div>
        
        <div class="build-mode-main">
          <div class="build-mode-sidebar">
            <div class="build-mode-sidebar-header">Project Files</div>
            <div id="build-mode-file-tree" class="build-mode-file-tree"></div>
            <div class="build-mode-project-controls">
              <select id="build-mode-template">
                <option value="node">Node.js Project</option>
                <option value="react">React App</option>
                <option value="html">HTML Project</option>
              </select>
              <button id="build-mode-create-project" class="build-mode-btn">Create Project</button>
            </div>
          </div>
          
          <div class="build-mode-content">
            <div class="build-mode-editor" id="build-mode-editor-container"></div>
            <div class="build-mode-preview">
              <iframe id="build-mode-preview-iframe" src="about:blank"></iframe>
            </div>
          </div>
        </div>
        
        <div class="build-mode-terminal" id="build-mode-terminal"></div>
      `;
      
      document.body.appendChild(this.container);
      
      // Store references to key elements
      this.fileTree = document.getElementById('build-mode-file-tree');
      this.editorContainer = document.getElementById('build-mode-editor-container');
      this.previewFrame = document.getElementById('build-mode-preview-iframe');
      this.terminalContainer = document.getElementById('build-mode-terminal');
    }
    
    return this.container;
  }
  
  /**
   * Add event listeners to UI elements
   */
  addEventListeners() {
    document.addEventListener('click', (event) => {
      // Close button
      if (event.target.id === 'build-mode-close') {
        this.buildMode.toggleBuildMode();
      }
      
      // Run button
      if (event.target.id === 'build-mode-run') {
        this.runProject();
      }
      
      // Create project button
      if (event.target.id === 'build-mode-create-project') {
        this.createNewProject();
      }
    });
    
    // Listen for file selection events
    document.addEventListener('buildmode:fileselected', (event) => {
      if (event.detail && event.detail.path) {
        this.buildMode.handleFileSelected(event.detail.path);
      }
    });
  }
  
  /**
   * Update the file tree display
   */
  updateFileTree() {
    if (!this.fileTree || !this.buildMode.fs) return;
    
    // Clear current tree
    this.fileTree.innerHTML = '';
    
    // Get file tree from FS and render
    const fileTree = this.buildMode.fs.getFileTree();
    const treeElement = this.buildMode.fs.renderFileTreeHtml();
    
    if (treeElement) {
      this.fileTree.appendChild(treeElement);
    } else {
      this.fileTree.innerHTML = '<div class="build-mode-empty">No files yet</div>';
    }
  }
  
  /**
   * Create a new project from template
   */
  async createNewProject() {
    const templateSelect = document.getElementById('build-mode-template');
    if (!templateSelect) return;
    
    const template = templateSelect.value;
    const projectName = prompt('Enter project name:', 'my-project');
    
    if (!projectName) return;
    
    if (this.buildMode.fs) {
      const success = await this.buildMode.fs.createProject(template, projectName);
      
      if (success) {
        console.log(`🛠️ Build Mode: Created ${template} project: ${projectName}`);
        this.updateFileTree();
      } else {
        console.error('Failed to create project');
      }
    }
  }
  
  /**
   * Run the current project
   */
  async runProject() {
    if (!this.buildMode.terminal) return;
    
    // Get the current path
    const currentPath = this.buildMode.fs ? this.buildMode.fs.getCurrentPath() : '/';
    
    // Try to determine project type and run appropriate command
    try {
      // Check if there's a package.json
      const hasPackageJson = await this.buildMode.fs.readFile(`${currentPath}/package.json`);
      
      if (hasPackageJson) {
        const pkgJson = JSON.parse(hasPackageJson);
        
        // Check for start script
        if (pkgJson.scripts && pkgJson.scripts.start) {
          await this.buildMode.terminal.executeCommand('npm start');
          return;
        }
      }
      
      // Check for index.html
      const hasIndexHtml = await this.buildMode.fs.readFile(`${currentPath}/index.html`);
      if (hasIndexHtml) {
        // Use simple server
        await this.buildMode.terminal.executeCommand('npx serve');
        return;
      }
      
      // Fallback - just list directory
      await this.buildMode.terminal.executeCommand('ls -la');
    } catch (error) {
      console.error('🛠️ Build Mode: Error running project', error);
    }
  }
  
  /**
   * Set up preview frame for a given port
   */
  setPreviewUrl(port) {
    if (this.previewFrame) {
      this.previewFrame.src = `http://localhost:${port}`;
    }
  }
  
  /**
   * Initialize the code editor (stub for when Monaco is available)
   */
  initializeEditor() {
    if (!this.editorContainer) return;
    
    // If Monaco is available, initialize it
    if (window.monaco) {
      this.editor = monaco.editor.create(this.editorContainer, {
        value: '// Select a file to edit',
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: {
          enabled: true
        }
      });
    } else {
      // Fallback to a basic textarea
      const textarea = document.createElement('textarea');
      textarea.className = 'build-mode-editor-fallback';
      textarea.value = '// Select a file to edit';
      this.editorContainer.appendChild(textarea);
      this.editor = {
        setValue: (value) => { textarea.value = value; },
        getValue: () => textarea.value,
        getModel: () => null
      };
    }
    
    return this.editor;
  }
}

// Initialize when BuildMode is ready
document.addEventListener('buildmode:ready', (event) => {
  if (event.detail && event.detail.buildMode) {
    const ui = new BuildModeUI(event.detail.buildMode);
    event.detail.buildMode.ui = ui;
    ui.create();
    
    console.log('🛠️ Build Mode UI: Ready');
  }
});
