/**
 * Podplay Build Sanctuary - MCP Browser Integration
 * 
 * Provides MCP toolkit functionality directly in the browser:
 * - Connects to MCP servers using browser-compatible clients
 * - Integrates with Build Mode WebContainer
 * - Provides access to brave-search and filesystem MCP servers
 * 
 * Created by Mama Bear 🐻💜
 */

class MCPBrowserIntegration {
  constructor() {
    this.isInitialized = false;
    this.servers = {
      'brave-search': { 
        status: 'initializing',
        name: 'Web Search', 
        tools: [
          { name: 'brave_web_search', description: 'Search the web for information' },
          { name: 'brave_local_search', description: 'Search for local businesses and places' }
        ]
      },
      'filesystem': { 
        status: 'initializing', 
        name: 'File System',
        tools: [
          { name: 'read_file', description: 'Read a file from the filesystem' },
          { name: 'write_file', description: 'Write content to a file' },
          { name: 'list_directory', description: 'List files in a directory' },
          { name: 'create_directory', description: 'Create a new directory' }
        ]
      }
    };
    
    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.callTool = this.callTool.bind(this);
    
    // Initialize on document load
    this.initialize();
  }
  
  /**
   * Initialize MCP Browser Integration
   */
  async initialize() {
    console.log('🔌 MCP Browser: Initializing');
    
    try {
      // Load MCP Tool Libraries (these would normally be loaded from NPM)
      await this.loadExternalScript('https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js');
      
      // Initialize brave-search server
      try {
        this.braveSearchKey = this.getBraveSearchKey();
        if (this.braveSearchKey) {
          this.servers['brave-search'].status = 'running';
          console.log('🔌 MCP Browser: brave-search server ready');
        } else {
          this.servers['brave-search'].status = 'error';
          console.warn('🔌 MCP Browser: brave-search server failed - No API key');
        }
      } catch (error) {
        this.servers['brave-search'].status = 'error';
        console.error('🔌 MCP Browser: brave-search initialization error', error);
      }
      
      // Initialize filesystem server using WebContainer if available
      document.addEventListener('buildmode:ready', (event) => {
        if (event.detail && event.detail.buildMode && event.detail.buildMode.webContainer) {
          this.connectFilesystem(event.detail.buildMode.webContainer);
        }
      });
      
      // Add MCP indicator to MCP dashboard if available
      this.addMCPIndicator();
      
      this.isInitialized = true;
      console.log('🔌 MCP Browser: Initialization complete');
      
      // Dispatch event that MCP browser integration is ready
      document.dispatchEvent(new CustomEvent('mcp-browser:ready', { 
        detail: { mcpBrowser: this } 
      }));
    } catch (error) {
      console.error('🔌 MCP Browser: Initialization failed', error);
    }
  }
  
  /**
   * Add MCP indicator to the dashboard
   */
  addMCPIndicator() {
    const dashboardEl = document.querySelector('#mcp-dashboard');
    if (!dashboardEl) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'mcp-indicator';
    indicator.innerHTML = `
      <h3 class="text-sm font-semibold mb-2">MCP Servers</h3>
      <div id="mcp-server-list" class="space-y-2">
        ${Object.entries(this.servers).map(([id, server]) => `
          <div class="flex items-center justify-between">
            <span class="text-sm">${server.name}</span>
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                         ${server.status === 'running' ? 'bg-green-100 text-green-800' :
                           server.status === 'error' ? 'bg-red-100 text-red-800' :
                           'bg-yellow-100 text-yellow-800'}">
              ${server.status}
            </span>
          </div>
        `).join('')}
      </div>
    `;
    
    dashboardEl.appendChild(indicator);
    
    // Update indicator when status changes
    setInterval(() => {
      const serverListEl = document.getElementById('mcp-server-list');
      if (serverListEl) {
        serverListEl.innerHTML = Object.entries(this.servers).map(([id, server]) => `
          <div class="flex items-center justify-between">
            <span class="text-sm">${server.name}</span>
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                         ${server.status === 'running' ? 'bg-green-100 text-green-800' :
                           server.status === 'error' ? 'bg-red-100 text-red-800' :
                           'bg-yellow-100 text-yellow-800'}">
              ${server.status}
            </span>
          </div>
        `).join('');
      }
    }, 5000);
  }
  
  /**
   * Connect filesystem MCP server to WebContainer
   */
  async connectFilesystem(webContainer) {
    if (!webContainer) {
      this.servers['filesystem'].status = 'error';
      return;
    }
    
    try {
      // Store WebContainer reference
      this.webContainer = webContainer;
      
      // Check if filesystem is accessible
      const result = await webContainer.fs.readdir('/');
      if (result && Array.isArray(result)) {
        this.servers['filesystem'].status = 'running';
        console.log('🔌 MCP Browser: filesystem server ready', result);
      } else {
        this.servers['filesystem'].status = 'error';
      }
    } catch (error) {
      this.servers['filesystem'].status = 'error';
      console.error('🔌 MCP Browser: filesystem initialization error', error);
    }
  }
  
  /**
   * Get Brave Search API key from the environment
   */
  getBraveSearchKey() {
    // In a real implementation, this would be securely stored
    // For demo purposes, we'll return a placeholder
    return 'BRAVE_API_KEY';
  }
  
  /**
   * Load external script
   */
  async loadExternalScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  /**
   * Call MCP tool
   */
  async callTool(serverName, toolName, params = {}) {
    if (!this.isInitialized) {
      throw new Error('MCP Browser not initialized');
    }
    
    const server = this.servers[serverName];
    if (!server) {
      throw new Error(`Server "${serverName}" not found`);
    }
    
    if (server.status !== 'running') {
      throw new Error(`Server "${serverName}" is not running`);
    }
    
    console.log(`🔌 MCP Browser: Calling ${serverName}/${toolName}`, params);
    
    // Handle brave-search tools
    if (serverName === 'brave-search') {
      if (toolName === 'brave_web_search') {
        return this.braveWebSearch(params);
      } else if (toolName === 'brave_local_search') {
        return this.braveLocalSearch(params);
      }
    }
    
    // Handle filesystem tools
    if (serverName === 'filesystem' && this.webContainer) {
      if (toolName === 'read_file') {
        return this.fsReadFile(params);
      } else if (toolName === 'write_file') {
        return this.fsWriteFile(params);
      } else if (toolName === 'list_directory') {
        return this.fsListDirectory(params);
      } else if (toolName === 'create_directory') {
        return this.fsCreateDirectory(params);
      }
    }
    
    throw new Error(`Tool "${toolName}" not found on server "${serverName}"`);
  }
  
  // BRAVE SEARCH TOOLS
  
  /**
   * Brave Web Search
   */
  async braveWebSearch(params = {}) {
    const { query, count = 10, offset = 0 } = params;
    
    if (!query) {
      throw new Error('Search query is required');
    }
    
    // For demo purposes, we'll mock the response
    // In production, this would make an API call to Brave Search
    return {
      results: [
        {
          title: `Search result for "${query}" #1`,
          url: 'https://example.com/1',
          description: 'This is a mock search result for demonstration purposes.'
        },
        {
          title: `Search result for "${query}" #2`,
          url: 'https://example.com/2',
          description: 'This is a mock search result for demonstration purposes.'
        }
      ],
      total: 2,
      query: query
    };
  }
  
  /**
   * Brave Local Search
   */
  async braveLocalSearch(params = {}) {
    const { query, count = 5 } = params;
    
    if (!query) {
      throw new Error('Search query is required');
    }
    
    // For demo purposes, we'll mock the response
    return {
      results: [
        {
          name: `Local business for "${query}" #1`,
          address: '123 Main St, Example City',
          rating: 4.5,
          phone: '(555) 123-4567'
        },
        {
          name: `Local business for "${query}" #2`,
          address: '456 Market St, Example City',
          rating: 4.2,
          phone: '(555) 987-6543'
        }
      ],
      total: 2,
      query: query
    };
  }
  
  // FILESYSTEM TOOLS
  
  /**
   * Read a file from the filesystem
   */
  async fsReadFile(params = {}) {
    const { path } = params;
    
    if (!path) {
      throw new Error('File path is required');
    }
    
    if (!this.webContainer) {
      throw new Error('WebContainer not available');
    }
    
    try {
      const contents = await this.webContainer.fs.readFile(path, 'utf-8');
      return { path, contents };
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }
  
  /**
   * Write content to a file
   */
  async fsWriteFile(params = {}) {
    const { path, content } = params;
    
    if (!path || content === undefined) {
      throw new Error('File path and content are required');
    }
    
    if (!this.webContainer) {
      throw new Error('WebContainer not available');
    }
    
    try {
      await this.webContainer.fs.writeFile(path, content);
      return { success: true, path };
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }
  
  /**
   * List files in a directory
   */
  async fsListDirectory(params = {}) {
    const { path = '/' } = params;
    
    if (!this.webContainer) {
      throw new Error('WebContainer not available');
    }
    
    try {
      const entries = await this.webContainer.fs.readdir(path, { withFileTypes: true });
      return {
        path,
        entries: entries.map(entry => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
          path: `${path}/${entry.name}`.replace(/\/+/g, '/')
        }))
      };
    } catch (error) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }
  
  /**
   * Create a new directory
   */
  async fsCreateDirectory(params = {}) {
    const { path } = params;
    
    if (!path) {
      throw new Error('Directory path is required');
    }
    
    if (!this.webContainer) {
      throw new Error('WebContainer not available');
    }
    
    try {
      await this.webContainer.fs.mkdir(path, { recursive: true });
      return { success: true, path };
    } catch (error) {
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  }
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
  window.mcpBrowser = new MCPBrowserIntegration();
});
