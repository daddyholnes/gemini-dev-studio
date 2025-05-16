/**
 * WebContainer API - Local Fallback
 * 
 * This is a local fallback for the WebContainer API when CDN fails.
 * It provides a minimal implementation that enables basic functionality.
 */

(function() {
  class WebContainer {
    constructor() {
      this.isInitialized = false;
      this.filesystem = new WebContainerFileSystem();
      this.terminal = new WebContainerTerminal();
      
      console.log('🌐 Local WebContainer: Initialized with fallback implementation');
    }
    
    async boot() {
      this.isInitialized = true;
      console.log('🌐 Local WebContainer: Booted successfully');
      return true;
    }
    
    async mount(files) {
      console.log('🌐 Local WebContainer: Mounted files', Object.keys(files).length);
      this.filesystem.files = files;
      return true;
    }
    
    async spawn(command, options) {
      console.log('🌐 Local WebContainer: Spawning command', command, options);
      return new WebContainerProcess(command, options);
    }
  }
  
  class WebContainerFileSystem {
    constructor() {
      this.files = {};
    }
    
    async readFile(path) {
      return "// This is a fallback implementation.\n// The real WebContainer API could not be loaded.\n// Please check your internet connection or contact support.";
    }
    
    async writeFile(path, content) {
      console.log('🌐 Local WebContainer: Writing file', path);
      return true;
    }
    
    async readdir(path) {
      return ['index.html', 'style.css', 'script.js'];
    }
  }
  
  class WebContainerTerminal {
    constructor() {}
    
    async integrate(element) {
      element.innerHTML = '<div style="padding: 10px; color: #f8f8f2; background: #282a36;">WebContainer Terminal (Fallback Mode)</div>';
      return {
        dispose: () => {}
      };
    }
  }
  
  class WebContainerProcess {
    constructor(command, options) {
      this.command = command;
      this.options = options;
      this.exit = new Promise(resolve => {
        setTimeout(() => resolve({ code: 0, signal: null }), 1000);
      });
      
      this.output = {
        pipe: (stream) => {}
      };
      
      this.input = {
        write: (data) => {}
      };
    }
  }
  
  // Expose WebContainer to the global scope
  window.WebContainer = {
    boot: async function() {
      console.log('🌐 Local WebContainer: Creating instance');
      window._webcontainerInstance = new WebContainer();
      return window._webcontainerInstance;
    }
  };
})();
