/**
 * Docker Manager UI
 * 
 * Provides a user interface for managing Docker containers and images
 * through the Docker MCP service.
 */

class DockerManager {
  constructor() {
    this.dockerClient = window.DockerMCP || new DockerMCPClient();
    this.containersList = document.getElementById('docker-containers');
    this.refreshBtn = document.getElementById('refresh-containers');
    this.runBtn = document.getElementById('run-container');
    this.imageInput = document.getElementById('docker-image');
    
    this.initialize();
  }
  
  /**
   * Initialize the Docker Manager
   */
  initialize() {
    // Check if Docker service is available
    this.checkDockerService();
    
    // Set up event listeners
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', () => this.refreshContainers());
    }
    
    if (this.runBtn && this.imageInput) {
      this.runBtn.addEventListener('click', () => this.runContainer());
      this.imageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.runContainer();
      });
    }
    
    // Initial load
    this.refreshContainers();
  }
  
  /**
   * Check if Docker service is available
   */
  async checkDockerService() {
    try {
      const isAvailable = await this.dockerClient.checkStatus();
      if (!isAvailable) {
        this.showError('Docker service is not available. Please make sure the Docker MCP service is running.');
      }
    } catch (error) {
      console.error('Error checking Docker service status:', error);
      this.showError('Failed to connect to Docker service. Please check the console for details.');
    }
  }
  
  /**
   * Refresh the list of containers
   */
  async refreshContainers() {
    if (!this.containersList) return;
    
    try {
      this.containersList.innerHTML = '<p class="text-gray-400 text-sm">Loading containers...</p>';
      
      const containers = await this.dockerClient.listContainers(true);
      
      if (containers.length === 0) {
        this.containersList.innerHTML = '<p class="text-gray-400 text-sm">No containers found</p>';
        return;
      }
      
      this.containersList.innerHTML = '';
      
      containers.forEach(container => {
        const containerEl = document.createElement('div');
        containerEl.className = 'bg-gray-700 p-2 rounded text-sm flex justify-between items-center';
        
        const statusColor = container.status.startsWith('running') ? 'text-green-400' : 'text-red-400';
        
        containerEl.innerHTML = `
          <div class="flex-1 truncate">
            <div class="font-medium">${container.name}</div>
            <div class="text-xs text-gray-400">${container.image}</div>
          </div>
          <div class="flex items-center space-x-2 ml-2">
            <span class="text-xs ${statusColor}">${container.status}</span>
            <button class="text-gray-400 hover:text-white" data-action="${container.status.startsWith('running') ? 'stop' : 'start'}" data-id="${container.id}">
              <i class="material-icons text-sm">${container.status.startsWith('running') ? 'stop' : 'play_arrow'}</i>
            </button>
          </div>
        `;
        
        // Add event listener to action buttons
        const actionBtn = containerEl.querySelector('button');
        actionBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = actionBtn.getAttribute('data-action');
          const containerId = actionBtn.getAttribute('data-id');
          
          if (action === 'stop') {
            this.stopContainer(containerId);
          } else {
            this.startContainer(containerId);
          }
        });
        
        this.containersList.appendChild(containerEl);
      });
      
    } catch (error) {
      console.error('Error refreshing containers:', error);
      this.containersList.innerHTML = `<p class="text-red-400 text-sm">Error: ${error.message}</p>`;
    }
  }
  
  /**
   * Run a new container
   */
  async runContainer() {
    const image = this.imageInput?.value.trim();
    if (!image) {
      this.showError('Please enter an image name');
      return;
    }
    
    try {
      this.runBtn.disabled = true;
      this.runBtn.innerHTML = '<i class="material-icons animate-spin text-sm align-middle">autorenew</i> Running...';
      
      const result = await this.dockerClient.runContainer({
        image,
        detach: true,
        ports: {},
        volumes: {}
      });
      
      this.showSuccess(`Container ${result.container_id} started successfully`);
      this.imageInput.value = '';
      this.refreshContainers();
      
    } catch (error) {
      console.error('Error running container:', error);
      this.showError(`Failed to run container: ${error.message}`);
    } finally {
      this.runBtn.disabled = false;
      this.runBtn.textContent = 'Run Container';
    }
  }
  
  /**
   * Stop a running container
   * @param {string} containerId Container ID
   */
  async stopContainer(containerId) {
    if (!containerId) return;
    
    try {
      await this.dockerClient.stopContainer(containerId);
      this.showSuccess('Container stopped successfully');
      this.refreshContainers();
    } catch (error) {
      console.error('Error stopping container:', error);
      this.showError(`Failed to stop container: ${error.message}`);
    }
  }
  
  /**
   * Start a stopped container
   * @param {string} containerId Container ID
   */
  async startContainer(containerId) {
    if (!containerId) return;
    
    try {
      // Note: The start container endpoint would need to be implemented in the backend
      // For now, we'll just refresh the list
      this.showSuccess('Starting container...');
      this.refreshContainers();
    } catch (error) {
      console.error('Error starting container:', error);
      this.showError(`Failed to start container: ${error.message}`);
    }
  }
  
  /**
   * Show an error message
   * @param {string} message Error message
   */
  showError(message) {
    // You can implement a more sophisticated notification system
    console.error(message);
    alert(`Error: ${message}`);
  }
  
  /**
   * Show a success message
   * @param {string} message Success message
   */
  showSuccess(message) {
    // You can implement a more sophisticated notification system
    console.log(message);
    alert(`Success: ${message}`);
  }
}

// Initialize the Docker Manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if we're on a page with Docker management UI
  if (document.getElementById('docker-containers')) {
    window.dockerManager = new DockerManager();
  }
});
