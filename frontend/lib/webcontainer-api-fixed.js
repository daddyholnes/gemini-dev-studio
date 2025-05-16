/**
 * WebContainer API - Local Fallback
 * 
 * This is a local fallback for the WebContainer API when CDN fails.
 * It provides a minimal implementation that enables basic functionality.
 * 
 * Created by Mama Bear 🐻💜
 */

// Use an IIFE to avoid polluting the global scope
(function() {
  console.log('🌐 Local WebContainer API: Initializing fallback implementation');

  /**
   * Main WebContainer implementation class
   */
  class WebContainerInstance {
    constructor() {
      this.isInitialized = false;
      this.files = {};
      this.processes = {};
      this._processCounter = 0;
      
      console.log('🌐 Local WebContainer: Instance created');
      
      // Dispatch event when instance is created
      setTimeout(() => {
        this.isInitialized = true;
        document.dispatchEvent(new CustomEvent('webcontainer:ready'));
      }, 1000);
    }
    
    /**
     * Mount a filesystem with initial files
     * @param {Object} fileSystem - File system definition
     */
    async mount(fileSystem) {
      console.log('🌐 Local WebContainer: Mounting filesystem', fileSystem);
      
      // Store the files in our virtual filesystem
      this.files = fileSystem || {};
      
      return { success: true };
    }
    
    /**
     * Access file system operations
     * @returns {Object} File system operations
     */
    async fs() {
      return {
        writeFile: async (path, content) => {
          console.log(`🌐 Local WebContainer: Writing file ${path}`);
          this.files[path] = content;
          return { success: true };
        },
        readFile: async (path, options) => {
          console.log(`🌐 Local WebContainer: Reading file ${path}`);
          return this.files[path] || '// Fallback content - file not found';
        },
        readdir: async (path) => {
          console.log(`🌐 Local WebContainer: Reading directory ${path}`);
          const entries = [];
          
          // Find all files that start with the path
          for (const filePath in this.files) {
            if (filePath.startsWith(path)) {
              // Extract the relative path
              const relativePath = filePath.substring(path.length);
              if (relativePath.startsWith('/')) {
                relativePath = relativePath.substring(1);
              }
              
              // Get the first segment (file or directory name)
              const segments = relativePath.split('/');
              const name = segments[0];
              
              // Skip if empty
              if (!name) continue;
              
              // Check if it's a directory
              const isDirectory = segments.length > 1;
              
              // Add to entries if not already there
              if (!entries.some(entry => entry.name === name)) {
                entries.push({
                  name,
                  isDirectory: () => isDirectory,
                  isFile: () => !isDirectory
                });
              }
            }
          }
          
          return entries;
        },
        mkdir: async (path, options) => {
          console.log(`🌐 Local WebContainer: Creating directory ${path}`);
          return { success: true };
        },
        rm: async (path, options) => {
          console.log(`🌐 Local WebContainer: Removing ${path}`);
          
          // If it's a directory, remove all files that start with the path
          if (options?.recursive) {
            for (const filePath in this.files) {
              if (filePath.startsWith(path)) {
                delete this.files[filePath];
              }
            }
          } else {
            // Remove a specific file
            delete this.files[path];
          }
          
          return { success: true };
        }
      };
    }
    
    /**
     * Spawn a new process
     * @param {string} command - Command to run
     * @param {Array} args - Command arguments
     * @param {Object} options - Process options
     */
    async spawn(command, args = [], options = {}) {
      const processId = this._processCounter++;
      console.log(`🌐 Local WebContainer: Spawning process ${processId}: ${command} ${args.join(' ')}`);
      
      // Create a mock process
      const process = {
        id: processId,
        output: {
          pipeTo: (writable) => {
            console.log(`🌐 Local WebContainer: Process ${processId} output piped`);
          }
        },
        exit: Promise.resolve({ code: 0, signal: null }),
        kill: () => {
          console.log(`🌐 Local WebContainer: Process ${processId} killed`);
          return Promise.resolve({ success: true });
        }
      };
      
      // Store the process
      this.processes[processId] = process;
      
      // Return the mock process after a short delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return process;
    }
    
    /**
     * Initialize a shell process
     */
    async shell() {
      console.log('🌐 Local WebContainer: Creating shell');
      return this.spawn('sh', [], { terminal: true });
    }
    
    /**
     * Set up terminal
     * @param {HTMLElement} terminal - Terminal element
     */
    async terminal(terminal) {
      console.log('🌐 Local WebContainer: Setting up terminal');
      terminal.innerHTML = '<div style="padding: 10px; color: #f8f8f2; background: #282a36;">WebContainer Terminal (Fallback Mode)</div>';
      return {
        dispose: () => {}
      };
    }
  }
  
  /**
   * WebContainer API static methods
   */
  const WebContainer = {
    /**
     * Boot a new WebContainer instance
     * @returns {WebContainerInstance} New WebContainer instance
     */
    boot: async function() {
      console.log('🌐 Local WebContainer: Booting fallback WebContainer');
      
      // Simulate boot delay to feel more realistic
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create and return the instance
      const instance = new WebContainerInstance();
      
      console.log('🌐 Local WebContainer: Boot complete');
      return instance;
    }
  };
  
  // Export to global scope
  window.WebContainer = WebContainer;
  
  // Dispatch ready event
  document.dispatchEvent(new CustomEvent('webcontainer-fallback:ready'));
  console.log('🌐 Local WebContainer: Fallback API ready');
})();
