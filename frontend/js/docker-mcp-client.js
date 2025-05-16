/**
 * Docker MCP Client
 * 
 * Provides a client-side interface for interacting with the Docker MCP service.
 * This allows AI models to manage Docker containers, images, and other resources.
 */

class DockerMCPClient {
  constructor(baseUrl = '/api/docker') {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.connected = false;
  }

  /**
   * Check if the Docker service is available
   * @returns {Promise<boolean>} True if the service is available
   */
  /**
   * Check if the Docker service is available
   * @returns {Promise<boolean>} True if the service is available
   */
  async checkStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.connected = data.status === 'available';
      return this.connected;
    } catch (error) {
      console.error('Error checking Docker MCP service status:', error);
      this.connected = false;
      return false;
    }
  }

  /**
   * Search for Docker images
   * @param {string} term Search term
   * @param {number} limit Maximum number of results
   * @returns {Promise<Array>} List of matching images
   */
  async searchImages(term, limit = 10) {
    try {
      const response = await fetch(`${this.baseUrl}/images/search?term=${encodeURIComponent(term)}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error searching Docker images:', error);
      throw error;
    }
  }

  /**
   * Pull a Docker image
   * @param {string} image Image name
   * @param {string} tag Image tag (default: 'latest')
   * @returns {Promise<Object>} Pull operation result
   */
  async pullImage(image, tag = 'latest') {
    try {
      const response = await fetch(`${this.baseUrl}/images/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image, tag }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to pull image');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error pulling Docker image:', error);
      throw error;
    }
  }

  /**
   * Run a Docker container
   * @param {Object} options Container options
   * @returns {Promise<Object>} Container information
   */
  async runContainer(options) {
    try {
      const response = await fetch(`${this.baseUrl}/containers/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to run container');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error running Docker container:', error);
      throw error;
    }
  }

  /**
   * List running containers
   * @param {boolean} all Whether to show all containers (including stopped ones)
   * @returns {Promise<Array>} List of containers
   */
  /**
   * List Docker containers
   * @param {boolean} all Whether to show all containers (including stopped ones)
   * @returns {Promise<Array>} List of containers
   */
  async listContainers(all = false) {
    try {
      const response = await fetch(`${this.baseUrl}/containers?all=${all}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.containers || [];
    } catch (error) {
      console.error('Error listing Docker containers:', error);
      throw error;
    }
  }

  /**
   * Stop a running container
   * @param {string} containerId Container ID
   * @returns {Promise<Object>} Stop operation result
   */
  /**
   * Stop a running container
   * @param {string} containerId Container ID
   * @returns {Promise<Object>} Stop operation result
   */
  async stopContainer(containerId) {
    if (!containerId) {
      throw new Error('Container ID is required');
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/containers/${encodeURIComponent(containerId)}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `Failed to stop container: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error stopping container ${containerId}:`, error);
      throw error;
    }
  }
  
  /**
   * Start a stopped container
   * @param {string} containerId Container ID
   * @returns {Promise<Object>} Start operation result
   */
  async startContainer(containerId) {
    if (!containerId) {
      throw new Error('Container ID is required');
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/containers/${encodeURIComponent(containerId)}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `Failed to start container: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error starting container ${containerId}:`, error);
      throw error;
    }
  }

  /**
   * Get container logs
   * @param {string} containerId Container ID
   * @param {boolean} follow Whether to follow the log output
   * @param {number} tail Number of lines to show from the end of the logs
   * @returns {Promise<string>} Container logs
   */
  async getContainerLogs(containerId, follow = false, tail = 100) {
    try {
      const response = await fetch(
        `${this.baseUrl}/containers/${containerId}/logs?follow=${follow}&tail=${tail}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.text();
    } catch (error) {
      console.error('Error getting container logs:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const dockerMCPClient = new DockerMCPClient();

// Export the client for use in other modules
export default dockerMCPClient;

// Add to window for global access in non-module environments
if (typeof window !== 'undefined') {
  window.DockerMCP = dockerMCPClient;
}
