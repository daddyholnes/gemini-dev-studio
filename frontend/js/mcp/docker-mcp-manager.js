/**
 * Docker MCP Manager
 * 
 * Provides a comprehensive interface for managing Docker-based MCP servers
 * in the Podplay Build environment.
 */

class DockerMCPManager {
  constructor() {
    this.baseUrl = '/api/docker-mcp';
    this.servers = [];
    this.activeServers = new Set();
    this.eventListeners = {
      'status-change': [],
      'server-started': [],
      'server-stopped': [],
      'query-sent': []
    };
    
    // Initialize with status check
    this.refreshStatus();
    
    // Set up automatic status refresh every 30 seconds
    setInterval(() => this.refreshStatus(), 30000);
  }
  
  /**
   * Add an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  addEventListener(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback);
    }
  }
  
  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  removeEventListener(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }
  
  /**
   * Trigger an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  triggerEvent(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in Docker MCP event listener for ${event}:`, error);
        }
      });
    }
  }
  
  /**
   * Fetch Docker MCP server status
   * @returns {Promise<Array>} - Array of server status objects
   */
  async refreshStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      
      if (response.ok) {
        const data = await response.json();
        const oldServers = JSON.stringify(this.servers);
        this.servers = data.docker_mcp_servers || [];
        
        // Update active server set
        this.activeServers.clear();
        this.servers.forEach(server => {
          if (server.running) {
            this.activeServers.add(server.name);
          }
        });
        
        // Trigger event if status changed
        if (oldServers !== JSON.stringify(this.servers)) {
          this.triggerEvent('status-change', this.servers);
        }
        
        return this.servers;
      } else {
        console.error('Failed to fetch Docker MCP status:', response.statusText);
        return [];
      }
    } catch (error) {
      console.error('Error fetching Docker MCP status:', error);
      return [];
    }
  }
  
  /**
   * Start a Docker MCP server
   * @param {string} serverName - Name of the server to start
   * @returns {Promise<object>} - Start result
   */
  async startServer(serverName) {
    try {
      const response = await fetch(`${this.baseUrl}/servers/${serverName}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          this.activeServers.add(serverName);
        }
        
        await this.refreshStatus();
        this.triggerEvent('server-started', { serverName, result });
        return result;
      } else {
        console.error(`Failed to start Docker MCP server ${serverName}:`, response.statusText);
        return { success: false, error: response.statusText };
      }
    } catch (error) {
      console.error(`Error starting Docker MCP server ${serverName}:`, error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Send a query to a Docker MCP server
   * @param {string} serverName - Name of the server
   * @param {string} tool - Tool name (optional)
   * @param {object} params - Query parameters
   * @returns {Promise<object>} - Query result
   */
  async sendQuery(serverName, tool = 'query', params = {}) {
    try {
      // Check if server is active, if not try to start it
      if (!this.activeServers.has(serverName)) {
        console.log(`Docker MCP server ${serverName} is not active, attempting to start...`);
        const startResult = await this.startServer(serverName);
        
        if (!startResult.success) {
          return { error: `Failed to start server ${serverName}` };
        }
      }
      
      const response = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          server: serverName,
          tool: tool,
          params: params
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        this.triggerEvent('query-sent', { serverName, tool, params, result });
        return result;
      } else {
        console.error(`Failed to query Docker MCP server ${serverName}:`, response.statusText);
        return { error: response.statusText };
      }
    } catch (error) {
      console.error(`Error querying Docker MCP server ${serverName}:`, error);
      return { error: error.message };
    }
  }
  
  /**
   * Get all available Docker MCP servers
   * @returns {Array} - Array of server objects
   */
  getAvailableServers() {
    return this.servers;
  }
  
  /**
   * Get active Docker MCP servers
   * @returns {Array<string>} - Array of active server names
   */
  getActiveServers() {
    return Array.from(this.activeServers);
  }
  
  /**
   * Check if a server is active
   * @param {string} serverName - Name of the server
   * @returns {boolean} - True if server is active
   */
  isServerActive(serverName) {
    return this.activeServers.has(serverName);
  }
  
  /**
   * Stop a Docker MCP server
   * @param {string} serverName - Name of the server to stop
   * @returns {Promise<object>} - Stop result
   */
  async stopServer(serverName) {
    try {
      console.log(`Attempting to stop Docker MCP server: ${serverName}`);
      
      // Check if the server is actually running
      if (!this.activeServers.has(serverName)) {
        console.log(`Docker MCP server ${serverName} is not active, no need to stop.`);
        return { success: true, message: `Server ${serverName} is not running` };
      }
      
      const response = await fetch(`${this.baseUrl}/servers/${serverName}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          this.activeServers.delete(serverName);
        }
        
        await this.refreshStatus();
        this.triggerEvent('server-stopped', { serverName, result });
        return result;
      } else {
        console.error(`Failed to stop Docker MCP server ${serverName}:`, response.statusText);
        return { success: false, error: response.statusText };
      }
    } catch (error) {
      console.error(`Error stopping Docker MCP server ${serverName}:`, error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const dockerMCPManager = new DockerMCPManager();

// Expose to global scope
window.dockerMCPManager = dockerMCPManager;

// Export as module
export default dockerMCPManager;