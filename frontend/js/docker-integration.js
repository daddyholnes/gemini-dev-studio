/**
 * Podplay Build Sanctuary - Docker Integration
 * 
 * Connects the Podplay Build interface with Docker MCP services:
 * - Provides status of Docker containers
 * - Connects Build Mode with containerized environment
 * - Manages MCP server connections
 * 
 * Created by Mama Bear 🐻💜
 */

class DockerIntegration {
  constructor() {
    this.isInitialized = false;
    this.isConnected = false;
    this.mcpServers = [
      { id: 'github', name: 'GitHub', status: 'unknown', port: 3001 },
      { id: 'brave-search', name: 'Web Search', status: 'unknown', port: 3002 },
      { id: 'puppeteer', name: 'Web Browser', status: 'unknown', port: 3003 },
      { id: 'playwright', name: 'Playwright', status: 'unknown', port: 3004 },
      { id: 'postgresql', name: 'Database', status: 'unknown', port: 3005 },
      { id: 'sequential-thinking', name: 'Sequential Thinking', status: 'unknown', port: 3006 }
    ];
    
    // Bind methods
    this.checkDockerStatus = this.checkDockerStatus.bind(this);
    this.connectBuildMode = this.connectBuildMode.bind(this);
    this.updateMCPStatus = this.updateMCPStatus.bind(this);
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize Docker integration
   */
  async init() {
    console.log('🐳 Docker Integration: Initializing');
    
    // Add Docker status indicator to MCP dashboard
    this.addDockerStatusIndicator();
    
    // Check Docker status immediately
    await this.checkDockerStatus();
    
    // Set up periodic status check
    setInterval(this.checkDockerStatus, 30000); // Every 30 seconds
    
    // Connect with Build Mode when it's ready
    document.addEventListener('buildmode:ready', (event) => {
      if (event.detail && event.detail.buildMode) {
        this.connectBuildMode(event.detail.buildMode);
      }
    });
    
    this.isInitialized = true;
    console.log('🐳 Docker Integration: Initialized');
  }
  
  /**
   * Add Docker status indicator to MCP dashboard
   */
  addDockerStatusIndicator() {
    // Find the project settings section in the sidebar
    const projectSettings = document.querySelector('.p-4 .space-y-3');
    if (!projectSettings) return;
    
    // Create Docker status element
    const dockerStatus = document.createElement('div');
    dockerStatus.innerHTML = `
      <span class="text-sm text-gray-400">Docker:</span>
      <div class="flex items-center" id="docker-status">
        <span class="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
        <span>Checking...</span>
      </div>
    `;
    
    // Add to project settings
    projectSettings.appendChild(dockerStatus);
  }
  
  /**
   * Check Docker container status
   */
  async checkDockerStatus() {
    try {
      // In a real implementation, this would make an API call to check Docker status
      // For demo purposes, we'll simulate this
      const response = await fetch('/api/environment/status', { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {
        // If server isn't available, handle gracefully
        return { ok: false };
      });
      
      if (response && response.ok) {
        const data = await response.json();
        this.isConnected = data.docker_status === 'running';
        
        // Update Docker status indicator
        const statusEl = document.getElementById('docker-status');
        if (statusEl) {
          if (this.isConnected) {
            statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-green-500 mr-2"></span><span>Running</span>';
          } else {
            statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-500 mr-2"></span><span>Stopped</span>';
          }
        }
        
        // Update MCP server statuses
        if (data.mcp_servers) {
          this.updateMCPStatus(data.mcp_servers);
        }
      } else {
        // Server not available
        this.isConnected = false;
        const statusEl = document.getElementById('docker-status');
        if (statusEl) {
          statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-red-500 mr-2"></span><span>Not connected</span>';
        }
      }
    } catch (error) {
      console.error('🐳 Docker Integration: Status check failed', error);
      this.isConnected = false;
    }
  }
  
  /**
   * Update MCP server status indicators
   */
  updateMCPStatus(serverStatuses) {
    for (const [serverId, status] of Object.entries(serverStatuses)) {
      const server = this.mcpServers.find(s => s.id === serverId);
      if (server) {
        server.status = status;
      }
    }
    
    // Update MCP dashboard if it exists
    if (window.mcpDashboard && typeof window.mcpDashboard.refreshServerStatus === 'function') {
      window.mcpDashboard.refreshServerStatus();
    }
  }
  
  /**
   * Connect Docker environment with Build Mode
   */
  connectBuildMode(buildMode) {
    console.log('🐳 Docker Integration: Connecting with Build Mode');
    
    if (!buildMode) return;
    
    // Attach Docker environment to Build Mode
    buildMode.dockerEnvironment = {
      isConnected: () => this.isConnected,
      getMCPServers: () => this.mcpServers,
      restartServer: async (serverId) => {
        try {
          const response = await fetch('/api/mcp/restart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ server_id: serverId })
          });
          
          if (response.ok) {
            console.log(`🐳 Docker Integration: Restarted MCP server ${serverId}`);
            return true;
          }
          return false;
        } catch (error) {
          console.error(`🐳 Docker Integration: Failed to restart MCP server ${serverId}`, error);
          return false;
        }
      }
    };
    
    // Enhance WebContainer with Docker environment capabilities
    buildMode.onWebContainerReady = (webContainer) => {
      if (webContainer && this.isConnected) {
        console.log('🐳 Docker Integration: Enhancing WebContainer with Docker capabilities');
        
        // Register MCP server ports for external access
        this.mcpServers.forEach(server => {
          if (server.status === 'running') {
            webContainer.mount.externalPort(server.port);
          }
        });
      }
    };
    
    console.log('🐳 Docker Integration: Build Mode connection complete');
  }
  
  /**
   * Start Docker environment if not running
   */
  async startDocker() {
    if (this.isConnected) return true;
    
    try {
      const response = await fetch('/api/environment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log('🐳 Docker Integration: Started Docker environment');
        // Check status after a delay to let containers start
        setTimeout(this.checkDockerStatus, 5000);
        return true;
      }
      return false;
    } catch (error) {
      console.error('🐳 Docker Integration: Failed to start Docker environment', error);
      return false;
    }
  }
  
  /**
   * Stop Docker environment
   */
  async stopDocker() {
    if (!this.isConnected) return true;
    
    try {
      const response = await fetch('/api/environment/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log('🐳 Docker Integration: Stopped Docker environment');
        this.isConnected = false;
        // Update status immediately
        this.checkDockerStatus();
        return true;
      }
      return false;
    } catch (error) {
      console.error('🐳 Docker Integration: Failed to stop Docker environment', error);
      return false;
    }
  }
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
  window.dockerIntegration = new DockerIntegration();
});
