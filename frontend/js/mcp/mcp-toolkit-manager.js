/**
 * MCP Toolkit Manager
 * 
 * Provides a simple interface for interacting with MCP servers and tools
 * directly from the Podplay Build UI.
 */

class MCPToolkitManager {
  constructor() {
    this.baseUrl = '/api/mcp';
    this.serverStatus = {};
    this.activeTools = {};
    this.eventListeners = {
      'status-change': [],
      'server-started': [],
      'server-stopped': [],
      'tool-called': []
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
          console.error(`Error in MCP event listener for ${event}:`, error);
        }
      });
    }
  }
  
  /**
   * Fetch server status
   * @returns {Promise<object>} - Server status object
   */
  async refreshStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      
      if (response.ok) {
        const data = await response.json();
        const oldStatus = JSON.stringify(this.serverStatus);
        this.serverStatus = data;
        
        // Trigger event if status changed
        if (oldStatus !== JSON.stringify(data)) {
          this.triggerEvent('status-change', data);
        }
        
        return data;
      } else {
        console.error('Failed to fetch MCP status:', response.statusText);
        return {};
      }
    } catch (error) {
      console.error('Error fetching MCP status:', error);
      return {};
    }
  }
  
  /**
   * Start an MCP server
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
        await this.refreshStatus();
        this.triggerEvent('server-started', { serverName, result });
        return result;
      } else {
        console.error(`Failed to start MCP server ${serverName}:`, response.statusText);
        return { status: 'error', error: response.statusText };
      }
    } catch (error) {
      console.error(`Error starting MCP server ${serverName}:`, error);
      return { status: 'error', error: error.message };
    }
  }
  
  /**
   * Stop an MCP server
   * @param {string} serverName - Name of the server to stop
   * @returns {Promise<object>} - Stop result
   */
  async stopServer(serverName) {
    try {
      const response = await fetch(`${this.baseUrl}/servers/${serverName}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        await this.refreshStatus();
        this.triggerEvent('server-stopped', { serverName, result });
        return result;
      } else {
        console.error(`Failed to stop MCP server ${serverName}:`, response.statusText);
        return { status: 'error', error: response.statusText };
      }
    } catch (error) {
      console.error(`Error stopping MCP server ${serverName}:`, error);
      return { status: 'error', error: error.message };
    }
  }
  
  /**
   * Start all MCP servers
   * @returns {Promise<object>} - Start results
   */
  async startAllServers() {
    try {
      const response = await fetch(`${this.baseUrl}/start-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const results = await response.json();
        await this.refreshStatus();
        return results;
      } else {
        console.error('Failed to start all MCP servers:', response.statusText);
        return { status: 'error', error: response.statusText };
      }
    } catch (error) {
      console.error('Error starting all MCP servers:', error);
      return { status: 'error', error: error.message };
    }
  }
  
  /**
   * Stop all MCP servers
   * @returns {Promise<object>} - Stop results
   */
  async stopAllServers() {
    try {
      const response = await fetch(`${this.baseUrl}/stop-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const results = await response.json();
        await this.refreshStatus();
        return results;
      } else {
        console.error('Failed to stop all MCP servers:', response.statusText);
        return { status: 'error', error: response.statusText };
      }
    } catch (error) {
      console.error('Error stopping all MCP servers:', error);
      return { status: 'error', error: error.message };
    }
  }
  
  /**
   * Call a tool on an MCP server
   * @param {string} serverName - Name of the server
   * @param {string} toolName - Name of the tool
   * @param {object} params - Tool parameters
   * @returns {Promise<object>} - Tool call result
   */
  async callTool(serverName, toolName, params = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/servers/${serverName}/tools/${toolName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });
      
      if (response.ok) {
        const result = await response.json();
        this.triggerEvent('tool-called', { serverName, toolName, params, result });
        return result;
      } else {
        console.error(`Failed to call tool ${toolName} on ${serverName}:`, response.statusText);
        return { error: response.statusText };
      }
    } catch (error) {
      console.error(`Error calling tool ${toolName} on ${serverName}:`, error);
      return { error: error.message };
    }
  }
  
  /**
   * Get the status of a specific server
   * @param {string} serverName - Name of the server
   * @returns {object|null} - Server status or null if not found
   */
  getServerStatus(serverName) {
    return this.serverStatus[serverName] || null;
  }
  
  /**
   * Get all available servers
   * @returns {Array<string>} - Array of server names
   */
  getAvailableServers() {
    return Object.keys(this.serverStatus);
  }
  
  /**
   * Get running servers
   * @returns {Array<string>} - Array of running server names
   */
  getRunningServers() {
    return Object.entries(this.serverStatus)
      .filter(([_, status]) => status.running)
      .map(([name]) => name);
  }
}

// Create singleton instance
const mcpToolkitManager = new MCPToolkitManager();

// Expose to global scope
window.mcpToolkitManager = mcpToolkitManager;

// Export as module
export default mcpToolkitManager;