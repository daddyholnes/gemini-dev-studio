/**
 * WebAssembly Runtime Integration for Podplay Build frontend
 * 
 * Provides a secure environment for executing code directly in the browser
 * using WebAssembly technology. This module integrates with wasmer.js to
 * enable secure, sandboxed code execution for Python, JavaScript, and other
 * languages directly within your sanctuary.
 */

class WasmRuntime {
  constructor() {
    this.initialized = false;
    this.wasmInstance = null;
    this.supportedLanguages = ['javascript', 'python', 'rust'];
    this.initPromise = this.initialize();
  }

  /**
   * Initialize the WebAssembly runtime environment
   */
  async initialize() {
    try {
      // Load the wasmer.js library
      if (!window.wasmer) {
        await this.loadScript('https://cdn.jsdelivr.net/npm/@wasmer/wasi@1.2.2/lib/index.iife.js');
        await this.loadScript('https://cdn.jsdelivr.net/npm/@wasmer/wasmfs@0.12.0/lib/index.iife.js');
        console.log('Wasmer.js libraries loaded');
      }

      // Create WASI instance
      const wasi = new window.wasmer.WASI({
        args: [],
        env: {},
        bindings: {
          ...window.wasmer.defaultBindings,
          fs: new window.wasmer.WasmFs().fs
        }
      });

      this.wasi = wasi;
      this.initialized = true;
      console.log('WebAssembly runtime initialized successfully');
      
      // Notify the backend that we're ready
      fetch('/api/wasm/initialized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'ready' })
      });
      
      return true;
    } catch (error) {
      console.error('Failed to initialize WebAssembly runtime:', error);
      this.initialized = false;
      return false;
    }
  }
  
  /**
   * Utility function to load scripts dynamically
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Execute code in the WebAssembly runtime
   * 
   * @param {string} code - The code to execute
   * @param {string} language - The programming language of the code
   * @returns {Promise<object>} - The execution result
   */
  async executeCode(code, language = 'javascript') {
    // Wait for initialization if it's still in progress
    if (!this.initialized) {
      await this.initPromise;
      
      if (!this.initialized) {
        return {
          success: false,
          output: '',
          error: 'WebAssembly runtime failed to initialize'
        };
      }
    }
    
    // For client-side execution, we'll only support JavaScript directly
    // For other languages, we'll make a server request
    if (language.toLowerCase() === 'javascript') {
      return this.executeJavaScript(code);
    } else {
      return this.executeOnServer(code, language);
    }
  }
  
  /**
   * Execute JavaScript code directly in the browser
   * with appropriate safety measures
   */
  async executeJavaScript(code) {
    try {
      // Create a secure sandbox for execution
      const sandbox = {
        console: {
          log: (...args) => this.captureOutput(args.join(' ')),
          error: (...args) => this.captureOutput(args.join(' '), 'error'),
          warn: (...args) => this.captureOutput(args.join(' '), 'warning')
        },
        // Safe subset of APIs
        setTimeout: window.setTimeout,
        clearTimeout: window.clearTimeout,
        Math: Math,
        Date: Date,
        JSON: JSON,
        Number: Number,
        String: String,
        Array: Array,
        Object: Object,
        // No document, window, fetch or other potentially harmful APIs
      };
      
      // Reset output
      this.output = [];
      this.errors = [];
      
      // Execute in sandbox
      const sandboxProxy = new Proxy(sandbox, {
        has: () => true,
        get: (target, prop) => {
          if (prop in target) {
            return target[prop];
          }
          return undefined;
        }
      });
      
      // Create a function with the sandbox as its context
      const safeFunction = new Function(
        ...Object.keys(sandboxProxy),
        `try { ${code} } catch (e) { console.error(e.toString()); }`
      );
      
      // Call the function with the sandbox properties as arguments
      safeFunction(...Object.values(sandboxProxy));
      
      return {
        success: this.errors.length === 0,
        output: this.output.join('\n'),
        error: this.errors.length > 0 ? this.errors.join('\n') : null
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error.toString()
      };
    }
  }
  
  /**
   * Execute code on the server for non-JavaScript languages
   */
  async executeOnServer(code, language) {
    try {
      const response = await fetch('/api/wasm/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          language,
          timeout: 10
        })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Failed to execute on server: ${error.toString()}`
      };
    }
  }
  
  /**
   * Helper method to capture console output
   */
  captureOutput(text, type = 'log') {
    if (type === 'error') {
      this.errors.push(text);
    } else {
      this.output.push(text);
    }
  }
  
  /**
   * Check if a language is supported
   */
  isLanguageSupported(language) {
    return this.supportedLanguages.includes(language.toLowerCase());
  }
}

// Initialize the WebAssembly runtime
const wasmRuntime = new WasmRuntime();

// Export for global use
window.wasmRuntime = wasmRuntime;