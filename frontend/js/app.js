/**
 * Main application entry point
 * Initializes and manages all components of the Podplay Build UI
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize components
  initializeModelSelector();
  initializeSidebar();
  initializeBuildModeToggle();
  
  // Initialize Docker Manager if Docker UI elements exist
  if (document.getElementById('docker-containers')) {
    initializeDockerManager();
  }
  
  // Initial UI render
  updateUIState();
});

// Global state
const appState = {
  activePanel: 'chat',
  selectedModel: '2.0',
  isBuildMode: false,
  containers: [],
  chatHistory: [],
  subscribers: []
};

// State management functions
function updateState(updates) {
  Object.assign(appState, updates);
  notifyStateSubscribers();
}

// Add state change listener
function subscribeToState(callback) {
  appState.subscribers.push(callback);
  return () => {
    appState.subscribers = appState.subscribers.filter(sub => sub !== callback);
  };
}

// Notify all state subscribers
function notifyStateSubscribers() {
  appState.subscribers.forEach(callback => callback(appState));
}

// Initialize model selector
function initializeModelSelector() {
  const modelSelector = document.getElementById('model-selector');
  if (modelSelector) {
    // Set initial value
    modelSelector.value = appState.selectedModel;
    
    // Add change handler
    modelSelector.addEventListener('change', (e) => {
      updateState({ selectedModel: e.target.value });
    });
  }
}

// Initialize sidebar navigation
function initializeSidebar() {
  const sidebarButtons = document.querySelectorAll('.sidebar-btn');
  sidebarButtons.forEach(button => {
    button.addEventListener('click', () => {
      const panel = button.getAttribute('data-panel');
      if (panel) {
        updateState({ activePanel: panel });
      }
    });
  });
}

// Initialize build mode toggle
function initializeBuildModeToggle() {
  const buildModeToggle = document.getElementById('build-mode-toggle');
  if (buildModeToggle) {
    buildModeToggle.addEventListener('click', () => {
      updateState({ isBuildMode: !appState.isBuildMode });
    });
  }
}

// Initialize Docker manager
function initializeDockerManager() {
  if (window.DockerMCP) {
    const dockerManager = {
      containers: [],
      
      init: async function() {
        // Check service availability
        await this.checkDockerService();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initial refresh
        await this.refreshContainers();
        
        // Auto-refresh containers
        setInterval(() => this.refreshContainers(), 5000);
      },
      
      checkDockerService: async function() {
        try {
          const isAvailable = await window.DockerMCP.checkStatus();
          const statusElement = document.getElementById('connection-status');
          
          if (statusElement) {
            if (isAvailable) {
              statusElement.innerHTML = `
                <span class="w-2 h-2 rounded-full bg-green-400 mr-1.5"></span>
                <span>Docker Connected</span>
              `;
              statusElement.className = 'flex items-center text-xs text-green-400';
            } else {
              statusElement.innerHTML = `
                <span class="w-2 h-2 rounded-full bg-red-400 mr-1.5"></span>
                <span>Docker Disconnected</span>
              `;
              statusElement.className = 'flex items-center text-xs text-red-400';
            }
          }
          
          return isAvailable;
        } catch (error) {
          console.error('Error checking Docker service:', error);
          return false;
        }
      },
      
      setupEventListeners: function() {
        const runBtn = document.getElementById('run-container');
        const imageInput = document.getElementById('docker-image');
        
        if (runBtn && imageInput) {
          runBtn.addEventListener('click', () => this.runContainer());
          imageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.runContainer();
          });
        }
      },
      
      refreshContainers: async function() {
        const containersList = document.getElementById('docker-containers');
        if (!containersList) return;
        
        try {
          const containers = await window.DockerMCP.listContainers(true);
          this.containers = containers;
          this.renderContainers(containers);
          
          // Update global state
          updateState({ containers });
        } catch (error) {
          console.error('Error refreshing containers:', error);
          this.showError('Failed to load containers');
        }
      },
      
      renderContainers: function(containers) {
        const containersList = document.getElementById('docker-containers');
        if (!containersList) return;
        
        if (containers.length === 0) {
          containersList.innerHTML = `
            <div class="text-center py-4 text-gray-400 text-sm">
              No containers found
            </div>
          `;
          return;
        }
        
        containersList.innerHTML = containers.map(container => {
          const isRunning = container.status && container.status.toLowerCase().includes('up');
          const statusColor = isRunning ? 'text-green-400' : 'text-red-400';
          const statusText = isRunning ? 'Running' : 'Stopped';
          
          return `
            <div class="container-card ${isRunning ? 'running' : 'stopped'} mb-3">
              <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0">
                  <div class="font-medium truncate">${container.names[0] || 'Unnamed'}</div>
                  <div class="text-xs text-gray-400 truncate">${container.image}</div>
                  <div class="flex items-center mt-1">
                    <span class="w-2 h-2 rounded-full ${statusColor} mr-1.5"></span>
                    <span class="text-xs ${statusColor}">${statusText}</span>
                  </div>
                </div>
                <div class="flex space-x-1">
                  ${isRunning ? `
                    <button class="text-gray-400 hover:text-yellow-400 p-1" 
                            data-action="logs" data-id="${container.id}">
                      <i class="material-icons text-sm">description</i>
                    </button>
                    <button class="text-gray-400 hover:text-red-400 p-1" 
                            data-action="stop" data-id="${container.id}">
                      <i class="material-icons text-sm">stop</i>
                    </button>
                  ` : `
                    <button class="text-gray-400 hover:text-green-400 p-1" 
                            data-action="start" data-id="${container.id}">
                      <i class="material-icons text-sm">play_arrow</i>
                    </button>
                  `}
                  <button class="text-gray-400 hover:text-red-500 p-1" 
                          data-action="remove" data-id="${container.id}">
                    <i class="material-icons text-sm">delete</i>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');
        
        // Add event listeners to action buttons
        containersList.querySelectorAll('button').forEach(button => {
          button.addEventListener('click', (e) => {
            const action = button.getAttribute('data-action');
            const containerId = button.getAttribute('data-id');
            
            switch (action) {
              case 'start':
                this.startContainer(containerId);
                break;
              case 'stop':
                this.stopContainer(containerId);
                break;
              case 'remove':
                this.removeContainer(containerId);
                break;
              case 'logs':
                this.showLogs(containerId);
                break;
            }
          });
        });
      },
      
      runContainer: async function() {
        const imageInput = document.getElementById('docker-image');
        const image = imageInput ? imageInput.value.trim() : '';
        
        if (!image) {
          this.showError('Please enter an image name');
          return;
        }
        
        try {
          const [imageName, tag = 'latest'] = image.split(':');
          await window.DockerMCP.pullImage(imageName, tag);
          
          const container = await window.DockerMCP.runContainer({
            image: `${imageName}:${tag}`,
            name: `container-${Date.now()}`,
            ports: ['8080:80'] // Default port mapping
          });
          
          // Clear input
          if (imageInput) imageInput.value = '';
          
          // Refresh containers list
          await this.refreshContainers();
          
          return container;
        } catch (error) {
          console.error('Error running container:', error);
          this.showError(`Failed to run container: ${error.message}`);
        }
      },
      
      startContainer: async function(containerId) {
        try {
          await window.DockerMCP.startContainer(containerId);
          await this.refreshContainers();
        } catch (error) {
          console.error('Error starting container:', error);
          this.showError('Failed to start container');
        }
      },
      
      stopContainer: async function(containerId) {
        try {
          await window.DockerMCP.stopContainer(containerId);
          await this.refreshContainers();
        } catch (error) {
          console.error('Error stopping container:', error);
          this.showError('Failed to stop container');
        }
      },
      
      removeContainer: async function(containerId) {
        if (!confirm('Are you sure you want to remove this container?')) {
          return;
        }
        
        try {
          await window.DockerMCP.removeContainer(containerId, true);
          await this.refreshContainers();
        } catch (error) {
          console.error('Error removing container:', error);
          this.showError('Failed to remove container');
        }
      },
      
      showLogs: async function(containerId) {
        try {
          const logs = await window.DockerMCP.getContainerLogs(containerId, false, 100);
          
          // Create a modal to display logs
          const modal = document.createElement('div');
          modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50';
          modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg w-full max-w-4xl h-3/4 flex flex-col">
              <div class="p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 class="text-lg font-medium">Container Logs</h3>
                <button class="text-gray-400 hover:text-white">
                  <i class="material-icons">close</i>
                </button>
              </div>
              <div class="p-4 overflow-auto flex-1 font-mono text-sm bg-black rounded-b-lg">
                <pre class="whitespace-pre-wrap">${logs}</pre>
              </div>
            </div>
          `;
          
          // Add close button handler
          const closeBtn = modal.querySelector('button');
          closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
          });
          
          // Add to DOM
          document.body.appendChild(modal);
          
        } catch (error) {
          console.error('Error showing logs:', error);
          this.showError('Failed to load container logs');
        }
      },
      
      showError: function(message) {
        // Create error toast
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg flex items-center';
        toast.innerHTML = `
          <i class="material-icons mr-2">error</i>
          <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 5000);
      }
    };
    
    // Initialize Docker manager
    dockerManager.init();
    
    // Make available globally for debugging
    window.dockerManager = dockerManager;
  }
}

// Update UI based on state
function updateUIState() {
  // Update active panel
  document.querySelectorAll('.panel').forEach(panel => {
    if (panel) {
      panel.style.display = 'none';
    }
  });
  
  const activePanel = document.getElementById(`${appState.activePanel}-panel`);
  if (activePanel) {
    activePanel.style.display = 'block';
  }
  
  // Update build mode
  const buildModeToggle = document.getElementById('build-mode-toggle');
  if (buildModeToggle) {
    if (appState.isBuildMode) {
      buildModeToggle.classList.add('bg-green-600');
      buildModeToggle.classList.add('hover:bg-green-700');
      buildModeToggle.textContent = 'Exit Build Mode';
    } else {
      buildModeToggle.classList.remove('bg-green-600');
      buildModeToggle.classList.remove('hover:bg-green-700');
      buildModeToggle.textContent = 'Build Mode';
    }
  }
  
  // Update active sidebar button
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    const panel = btn.getAttribute('data-panel');
    if (panel === appState.activePanel) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// Make appState available globally for debugging
window.appState = appState;
