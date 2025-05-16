
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
  
  /**
   * Get container stats
   * @param {string} containerId 
   * @returns {Promise<Object>} Container stats
   */
  async getContainerStats(containerId) {
    try {
      const response = await fetch(`${this.baseUrl}/containers/${containerId}/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting container stats:', error);
      throw error;
    }
  }

  /**
   * Remove a container
   * @param {string} containerId 
   * @param {boolean} force 
   * @returns {Promise<Object>} Result
   */
  async removeContainer(containerId, force = false) {
    try {
      const response = await fetch(`${this.baseUrl}/containers/${containerId}?force=${force}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to remove container');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error removing container:', error);
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
