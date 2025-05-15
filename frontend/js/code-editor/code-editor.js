/**
 * Podplay Build Code Editor
 * 
 * A powerful Monaco-style code editor component for the Podplay Build sanctuary.
 * Provides syntax highlighting, autocompletion, and integration with the terminal.
 */

class CodeEditor {
  constructor(options = {}) {
    this.options = {
      containerId: 'podplay-editor-container',
      theme: 'vs-dark',
      language: 'javascript',
      fontSize: 14,
      tabSize: 2,
      minimap: true,
      lineNumbers: true,
      ...options
    };
    
    this.container = null;
    this.editor = null;
    this.monaco = null;
    this.currentFile = null;
    this.isInitialized = false;
    this.eventListeners = {};
  }
  
  async init() {
    if (this.isInitialized) return this;
    
    // Create UI elements
    this.createElements();
    
    // Load Monaco Editor
    await this.loadMonaco();
    
    // Create editor instance
    await this.createEditor();
    
    // Register event handlers
    this.registerEventHandlers();
    
    this.isInitialized = true;
    return this;
  }
  
  createElements() {
    // Check if container already exists
    let container = document.getElementById(this.options.containerId);
    if (container) {
      this.container = container;
      return;
    }
    
    // Create container
    container = document.createElement('div');
    container.id = this.options.containerId;
    container.className = 'podplay-editor-container';
    
    // Apply styles
    Object.assign(container.style, {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      flex: '1',
      overflow: 'hidden'
    });
    
    // Create header
    const header = document.createElement('div');
    header.className = 'editor-header';
    
    // Style header
    Object.assign(header.style, {
      padding: '8px',
      backgroundColor: '#1e1e1e',
      borderBottom: '1px solid #333',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    });
    
    // Create tabs
    const tabs = document.createElement('div');
    tabs.className = 'editor-tabs';
    tabs.innerHTML = '<div class="editor-tab active"><span class="tab-name">untitled</span><span class="tab-close">×</span></div>';
    
    // Style tabs
    Object.assign(tabs.style, {
      display: 'flex',
      overflow: 'auto',
      whiteSpace: 'nowrap'
    });
    
    // Create controls
    const controls = document.createElement('div');
    controls.className = 'editor-controls';
    controls.innerHTML = `
      <button id="editor-save-btn" title="Save (Ctrl+S)">💾</button>
      <button id="editor-run-btn" title="Run (Ctrl+Enter)">▶️</button>
      <select id="editor-language-select">
        <option value="javascript">JavaScript</option>
        <option value="html">HTML</option>
        <option value="css">CSS</option>
        <option value="typescript">TypeScript</option>
        <option value="python">Python</option>
        <option value="json">JSON</option>
        <option value="markdown">Markdown</option>
      </select>
    `;
    
    // Style controls
    Object.assign(controls.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    });
    
    // Style buttons
    controls.querySelectorAll('button').forEach(btn => {
      Object.assign(btn.style, {
        backgroundColor: 'transparent',
        border: 'none',
        color: '#ccc',
        cursor: 'pointer',
        fontSize: '16px',
        padding: '4px'
      });
    });
    
    // Style select
    controls.querySelector('select').style.backgroundColor = '#252525';
    controls.querySelector('select').style.color = '#ccc';
    controls.querySelector('select').style.border = '1px solid #333';
    controls.querySelector('select').style.borderRadius = '4px';
    controls.querySelector('select').style.padding = '4px';
    
    // Add tabs and controls to header
    header.appendChild(tabs);
    header.appendChild(controls);
    
    // Create editor content area
    const editorArea = document.createElement('div');
    editorArea.id = 'podplay-editor';
    editorArea.className = 'podplay-editor';
    
    // Style editor area
    Object.assign(editorArea.style, {
      flex: '1',
      overflow: 'hidden'
    });
    
    // Assemble container
    container.appendChild(header);
    container.appendChild(editorArea);
    
    // Add to main content
    const mainContent = document.querySelector('.main-content, main');
    if (mainContent) {
      mainContent.style.display = 'flex';
      mainContent.appendChild(container);
    } else {
      document.body.appendChild(container);
    }
    
    this.container = container;
  }
  
  async loadMonaco() {
    // Check if Monaco is already loaded
    if (window.monaco) {
      this.monaco = window.monaco;
      return;
    }
    
    // Load Monaco loader script
    await this.loadScript('https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs/loader.js');
    
    // Configure Monaco loader
    window.require.config({
      paths: {
        vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs'
      }
    });
    
    // Load Monaco editor
    return new Promise(resolve => {
      window.require(['vs/editor/editor.main'], () => {
        this.monaco = window.monaco;
        resolve();
      });
    });
  }
  
  async createEditor() {
    if (!this.monaco) return;
    
    // Make sure the editor container exists
    const editorElement = document.getElementById('podplay-editor');
    if (!editorElement) {
      console.error('Editor element #podplay-editor not found in DOM');
      return false; // Exit early if element doesn't exist
    }
    
    try {
      // Create editor instance with error handling
      this.editor = this.monaco.editor.create(editorElement, {
        value: '// Welcome to Mama Bear Code Editor! 🐻\n// Start typing or open a file from the file explorer.\n',
        language: this.options.language,
        theme: this.options.theme,
        automaticLayout: true,
        fontSize: this.options.fontSize,
        tabSize: this.options.tabSize,
        minimap: {
          enabled: this.options.minimap
        },
        lineNumbers: this.options.lineNumbers ? 'on' : 'off',
        scrollBeyondLastLine: false,
        wordWrap: 'on'
      });
    } catch (error) {
      console.error('Error creating Monaco editor:', error);
      return false;
    }
    
    // Set up keyboard shortcuts
    this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KeyS, () => {
      this.saveFile();
    });
    
    this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.Enter, () => {
      this.runCode();
    });
  }
  
  registerEventHandlers() {
    // Save button
    const saveBtn = document.getElementById('editor-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveFile());
    }
    
    // Run button
    const runBtn = document.getElementById('editor-run-btn');
    if (runBtn) {
      runBtn.addEventListener('click', () => this.runCode());
    }
    
    // Language selector
    const langSelect = document.getElementById('editor-language-select');
    if (langSelect) {
      langSelect.addEventListener('change', () => {
        const language = langSelect.value;
        this.setLanguage(language);
      });
    }
    
    // Tab close button
    const tabCloseBtn = document.querySelector('.tab-close');
    if (tabCloseBtn) {
      tabCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeFile();
      });
    }
    
    // Listen for file system events
    window.addEventListener('fileSelected', (event) => {
      if (event.detail) {
        this.openFile(event.detail);
      }
    });
  }
  
  openFile(file) {
    // In a full implementation, this would fetch the file content from the server
    // For demo purposes, we'll use dummy content based on file extension
    
    const filename = file.name;
    const ext = filename.split('.').pop().toLowerCase();
    
    let content = '';
    let language = 'plaintext';
    
    switch (ext) {
      case 'html':
        content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename}</title>
</head>
<body>
  <h1>Hello from Mama Bear! 🐻</h1>
  <p>This is a sample HTML file created in the Podplay Build sanctuary.</p>
</body>
</html>`;
        language = 'html';
        break;
        
      case 'css':
        content = `/* ${filename} */
body {
  font-family: 'Inter', sans-serif;
  background-color: #f5f5f5;
  color: #333;
  line-height: 1.6;
  margin: 0;
  padding: 20px;
}

h1 {
  color: #8b5cf6;
  border-bottom: 2px solid #ddd;
  padding-bottom: 10px;
}`;
        language = 'css';
        break;
        
      case 'js':
        content = `// ${filename}
/**
 * A sample JavaScript file created in Mama Bear's Podplay Build sanctuary
 */
function greet(name) {
  return \`Hello, \${name}! Welcome to Podplay Build.\`;
}

// Log a welcome message
console.log(greet('Nathan'));

// Add event listener to a button
document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('.greeting-button');
  if (button) {
    button.addEventListener('click', () => {
      alert(greet('friend'));
    });
  }
});`;
        language = 'javascript';
        break;
        
      case 'ts':
        content = `// ${filename}
/**
 * A sample TypeScript file created in Mama Bear's Podplay Build sanctuary
 */
interface Person {
  name: string;
  age?: number;
}

function greet(person: Person): string {
  return \`Hello, \${person.name}! Welcome to Podplay Build.\`;
}

// Log a welcome message
const nathan: Person = { name: 'Nathan' };
console.log(greet(nathan));`;
        language = 'typescript';
        break;
        
      case 'json':
        content = `{
  "name": "podplay-build-project",
  "version": "1.0.0",
  "description": "A project created in Mama Bear's Podplay Build sanctuary",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": [
    "podplay",
    "mama-bear",
    "sanctuary"
  ],
  "author": "Nathan",
  "license": "MIT"
}`;
        language = 'json';
        break;
        
      case 'md':
        content = `# ${filename.replace('.md', '')}

## Welcome to Mama Bear's Podplay Build Sanctuary

This is a sample Markdown file created in the Podplay Build environment.

### Features

- Code editing with syntax highlighting
- File management
- Terminal integration
- Live preview

### Getting Started

1. Create new files using the file explorer
2. Edit your code in this editor
3. Run your code using the terminal
4. Preview your results in the browser

---

_Created with ❤️ by Mama Bear_`;
        language = 'markdown';
        break;
        
      default:
        content = `// ${filename}\n// This is a sample file created in Mama Bear's Podplay Build sanctuary.\n`;
        break;
    }
    
    // Set editor content and language
    this.editor.setValue(content);
    this.setLanguage(language);
    
    // Update tab
    this.updateTab(filename);
    
    // Store current file
    this.currentFile = file;
    
    // Trigger event
    this.trigger('fileOpened', file);
  }
  
  updateTab(filename) {
    const tabName = document.querySelector('.tab-name');
    if (tabName) {
      tabName.textContent = filename;
    }
  }
  
  setLanguage(language) {
    if (!this.editor) return;
    
    // Set editor language
    this.monaco.editor.setModelLanguage(this.editor.getModel(), language);
    
    // Update language selector
    const langSelect = document.getElementById('editor-language-select');
    if (langSelect) {
      langSelect.value = language;
    }
  }
  
  saveFile() {
    if (!this.currentFile) {
      // No file is currently open, prompt for filename
      const filename = prompt('Enter file name:');
      if (!filename) return;
      
      // Create a new file
      this.currentFile = {
        name: filename,
        path: `/${filename}`,
        type: 'file'
      };
    }
    
    const content = this.editor.getValue();
    
    // In a full implementation, this would save the file to the server
    // For demo purposes, we'll just use the terminal to write the file
    if (window.podplayTerminal) {
      // Split content into lines and create an echo command
      const safeContent = content
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\$/g, '\\$');
        
      const command = `echo "${safeContent}" > ${this.currentFile.path}`;
      window.podplayTerminal.execute_command(command);
      
      // Trigger event
      this.trigger('fileSaved', this.currentFile);
      
      // Show success message
      this.showMessage(`File saved: ${this.currentFile.name}`);
    }
  }
  
  runCode() {
    if (!this.currentFile) {
      this.showMessage('Please save the file first.');
      return;
    }
    
    const ext = this.currentFile.name.split('.').pop().toLowerCase();
    
    // Different execution approaches based on file type
    switch (ext) {
      case 'html':
        // For HTML files, show in the preview
        this.showPreview(this.editor.getValue());
        break;
        
      case 'js':
        // For JS files, run with node (simulated)
        this.executeInTerminal(`node ${this.currentFile.path}`);
        break;
        
      case 'py':
        // For Python files, run with python
        this.executeInTerminal(`python ${this.currentFile.path}`);
        break;
        
      default:
        // For other files, just cat the file
        this.executeInTerminal(`cat ${this.currentFile.path}`);
        break;
    }
  }
  
  executeInTerminal(command) {
    if (window.podplayTerminal) {
      window.podplayTerminal.execute_command(command);
    } else {
      this.showMessage('Terminal not available.');
    }
  }
  
  showPreview(content) {
    // Trigger a preview update event
    const previewEvent = new CustomEvent('terminal:preview', { 
      detail: { content }
    });
    window.dispatchEvent(previewEvent);
    
    // Show success message
    this.showMessage('Preview updated.');
  }
  
  closeFile() {
    if (!this.currentFile) return;
    
    // Check for unsaved changes
    const isDirty = this.editor.getValue() !== this.lastSavedContent;
    if (isDirty) {
      const confirmClose = confirm('You have unsaved changes. Do you want to save before closing?');
      if (confirmClose) {
        this.saveFile();
      }
    }
    
    // Reset editor content
    this.editor.setValue('// Welcome to Mama Bear Code Editor! 🐻\n// Start typing or open a file from the file explorer.\n');
    
    // Reset tab
    this.updateTab('untitled');
    
    // Clear current file
    this.currentFile = null;
    
    // Trigger event
    this.trigger('fileClosed');
  }
  
  showMessage(message, type = 'info') {
    // Create message element if it doesn't exist
    let messageEl = document.getElementById('editor-message');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'editor-message';
      
      // Style message
      Object.assign(messageEl.style, {
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        padding: '10px 20px',
        borderRadius: '4px',
        backgroundColor: '#333',
        color: 'white',
        zIndex: '1000',
        transition: 'opacity 0.3s ease',
        opacity: '0',
        pointerEvents: 'none'
      });
      
      document.body.appendChild(messageEl);
    }
    
    // Set message content and type
    messageEl.textContent = message;
    
    // Apply style based on type
    if (type === 'error') {
      messageEl.style.backgroundColor = '#ff5555';
    } else if (type === 'success') {
      messageEl.style.backgroundColor = '#50fa7b';
      messageEl.style.color = '#282a36';
    } else {
      messageEl.style.backgroundColor = '#333';
    }
    
    // Show message
    messageEl.style.opacity = '1';
    
    // Hide after 3 seconds
    setTimeout(() => {
      messageEl.style.opacity = '0';
    }, 3000);
  }
  
  // Helper function to load a script
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  // Event handling
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
    return this;
  }
  
  off(event, callback) {
    if (!this.eventListeners[event]) return this;
    
    if (callback) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    } else {
      delete this.eventListeners[event];
    }
    return this;
  }
  
  trigger(event, data) {
    if (!this.eventListeners[event]) return;
    
    this.eventListeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error(`Error in event handler for ${event}:`, e);
      }
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CodeEditor;
} else {
  window.CodeEditor = CodeEditor;
}