/**
 * Podplay Build Sanctuary - Memory Panel
 * 
 * UI component for muscle memory management:
 * - List and execute saved flows
 * - Record new agent flows
 * - Visualize flow diagrams
 * 
 * Created by Mama Bear 🐻💜
 */

class MemoryPanel {
  constructor() {
    this.isInitialized = false;
    this.activeFlowId = null;
    this.isVisible = false;
    this.isRecording = false;
    
    // Element references
    this.panelElement = null;
    this.flowListElement = null;
    this.flowDetailElement = null;
    
    // Bind methods
    this.init = this.init.bind(this);
    this.createPanelElement = this.createPanelElement.bind(this);
    this.renderFlowList = this.renderFlowList.bind(this);
    this.renderFlowDetail = this.renderFlowDetail.bind(this);
    this.handleFlowSelect = this.handleFlowSelect.bind(this);
    this.handleStartRecording = this.handleStartRecording.bind(this);
    this.handleStopRecording = this.handleStopRecording.bind(this);
    this.handleReplayFlow = this.handleReplayFlow.bind(this);
    this.handleDeleteFlow = this.handleDeleteFlow.bind(this);
    this.syncToCloud = this.syncToCloud.bind(this);
    this.shareFlow = this.shareFlow.bind(this);
    this.formatDate = this.formatDate.bind(this);
    
    // Initialize
    document.addEventListener('DOMContentLoaded', this.init);
  }
  
  /**
   * Initialize the memory panel
   */
  async init() {
    console.log('🧠 Memory Panel: Initializing');
    
    try {
      // Wait for required components
      await this.waitForDependencies();
      
      // Create panel element
      this.createPanelElement();
      
      // Add panel to the DOM
      const mainContent = document.querySelector('.flex-1.flex.overflow-hidden');
      if (mainContent) {
        mainContent.appendChild(this.panelElement);
      } else {
        console.error('🧠 Memory Panel: Main content element not found');
        return;
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Render initial state
      this.renderFlowList();
      this.renderEmptyDetail();
      
      this.isInitialized = true;
      console.log('🧠 Memory Panel: Initialized');
      
      // Register with TabControls
      if (window.TabControls) {
        window.TabControls.registerPanel('memory-panel');
      }
    } catch (error) {
      console.error('🧠 Memory Panel: Initialization failed', error);
    }
  }
  
  /**
   * Wait for required dependencies
   */
  async waitForDependencies() {
    // Wait for Muscle Memory to be ready
    if (!window.muscleMem) {
      await new Promise(resolve => {
        document.addEventListener('muscle-mem:ready', resolve, { once: true });
        
        // Timeout after 5 seconds
        setTimeout(() => {
          console.warn('🧠 Memory Panel: Timeout waiting for Muscle Memory');
          resolve();
        }, 5000);
      });
    }
    
    // Wait for Flow Graph Manager to be ready
    if (!window.flowGraphManager) {
      await new Promise(resolve => {
        document.addEventListener('flow-graph:ready', resolve, { once: true });
        
        // Timeout after 5 seconds
        setTimeout(() => {
          console.warn('🧠 Memory Panel: Timeout waiting for Flow Graph Manager');
          resolve();
        }, 5000);
      });
    }
  }
  
  /**
   * Create the panel element
   */
  createPanelElement() {
    this.panelElement = document.createElement('div');
    this.panelElement.id = 'memory-panel';
    this.panelElement.className = 'flex-1 flex flex-col h-full memory-panel';
    this.panelElement.style.display = 'none';
    
    this.panelElement.innerHTML = `
      <div class="memory-panel-header">
        <div class="memory-panel-title">Muscle Memory</div>
        <div class="memory-panel-controls">
          <button id="memory-record-btn" class="memory-button memory-button-primary">
            <span class="material-icons memory-button-icon">fiber_manual_record</span>
            <span>Record Flow</span>
          </button>
        </div>
      </div>
      
      <div class="memory-panel-content">
        <div class="memory-panel-sidebar">
          <div class="memory-list" id="memory-flow-list"></div>
        </div>
        
        <div class="memory-panel-main">
          <div id="memory-flow-detail"></div>
        </div>
      </div>
    `;
    
    // Store references to important elements
    this.flowListElement = this.panelElement.querySelector('#memory-flow-list');
    this.flowDetailElement = this.panelElement.querySelector('#memory-flow-detail');
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Record button
    const recordBtn = this.panelElement.querySelector('#memory-record-btn');
    if (recordBtn) {
      recordBtn.addEventListener('click', () => {
        if (this.isRecording) {
          this.handleStopRecording();
        } else {
          this.handleStartRecording();
        }
      });
    }
    
    // Muscle Memory events
    document.addEventListener('muscle-mem:flow-saved', () => {
      this.renderFlowList();
    });
    
    document.addEventListener('muscle-mem:flow-deleted', () => {
      this.renderFlowList();
      if (this.activeFlowId === event.detail.flowId) {
        this.activeFlowId = null;
        this.renderEmptyDetail();
      }
    });
    
    document.addEventListener('muscle-mem:recording-started', () => {
      this.isRecording = true;
      this.updateRecordButton();
    });
    
    document.addEventListener('muscle-mem:recording-stopped', () => {
      this.isRecording = false;
      this.updateRecordButton();
    });
    
    // Flow Graph events
    document.addEventListener('flow-graph:execution-completed', () => {
      if (this.activeFlowId) {
        this.renderFlowDetail(this.activeFlowId);
      }
    });
  }
  
  /**
   * Update record button state
   */
  updateRecordButton() {
    const recordBtn = this.panelElement.querySelector('#memory-record-btn');
    if (!recordBtn) return;
    
    if (this.isRecording) {
      recordBtn.innerHTML = `
        <span class="material-icons memory-button-icon">stop</span>
        <span>Stop Recording</span>
      `;
      recordBtn.classList.add('memory-recording-indicator');
      recordBtn.classList.remove('memory-button-primary');
    } else {
      recordBtn.innerHTML = `
        <span class="material-icons memory-button-icon">fiber_manual_record</span>
        <span>Record Flow</span>
      `;
      recordBtn.classList.remove('memory-recording-indicator');
      recordBtn.classList.add('memory-button-primary');
    }
  }
  
  /**
   * Render the flow list
   */
  renderFlowList() {
    if (!this.flowListElement || !window.muscleMem) return;
    
    const flows = window.muscleMem.getAllFlows();
    
    if (flows.length === 0) {
      this.flowListElement.innerHTML = `
        <div class="memory-empty" style="height: auto; padding: 1rem;">
          <div class="memory-empty-text">No saved flows yet</div>
        </div>
      `;
      return;
    }
    
    this.flowListElement.innerHTML = flows.map(flow => `
      <div class="memory-item ${flow.id === this.activeFlowId ? 'active' : ''}" 
           data-flow-id="${flow.id}">
        <div class="memory-item-header">
          <div class="memory-item-title">${flow.name || 'Unnamed Flow'}</div>
        </div>
        <div class="memory-item-meta">
          ${new Date(flow.createdAt).toLocaleString()} • ${flow.steps.length} steps
        </div>
      </div>
    `).join('');
    
    // Add click event listeners
    const flowItems = this.flowListElement.querySelectorAll('.memory-item');
    flowItems.forEach(item => {
      item.addEventListener('click', () => {
        const flowId = item.dataset.flowId;
        this.handleFlowSelect(flowId);
      });
    });
  }
  
  /**
   * Render empty detail view
   */
  renderEmptyDetail() {
    if (!this.flowDetailElement) return;
    
    this.flowDetailElement.innerHTML = `
      <div class="memory-empty">
        <span class="material-icons memory-empty-icon">psychology</span>
        <div class="memory-empty-text">
          Select a flow from the list to view details or click "Record Flow" to create a new one
        </div>
      </div>
    `;
  }
  
  /**
   * Format date for display
   * @param {number} timestamp - Timestamp to format
   * @returns {string} Formatted date
   */
  formatDate(timestamp) {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  }
  
  /**
   * Render flow detail
   * @param {string} flowId - Flow ID to render
   */
  renderFlowDetail(flowId) {
    if (!this.flowDetailElement || !window.muscleMem) return;
    
    const flow = window.muscleMem.flowCache[flowId];
    if (!flow) {
      this.renderEmptyDetail();
      return;
    }
    
    this.activeFlowId = flowId;
    
    // Check if flow is stored in cloud
    const isCloudStored = flow.userId && flow.updatedAt;
    const isShared = flow.sharedFrom;
    
    this.flowDetailElement.innerHTML = `
      <div class="memory-detail">
        <div class="memory-detail-header">
          <div class="memory-detail-title">${flow.name || 'Unnamed Flow'}</div>
          <div class="memory-detail-actions">
            <button class="memory-button memory-button-secondary memory-replay-btn">
              <span class="material-icons memory-button-icon">play_arrow</span>
              <span>Replay</span>
            </button>
            ${window.firebaseMemoryAdapter ? `
              <button class="memory-button memory-button-${isCloudStored ? 'secondary' : 'primary'} memory-cloud-btn">
                <span class="material-icons memory-button-icon">${isCloudStored ? 'cloud_done' : 'cloud_upload'}</span>
                <span>${isCloudStored ? 'Synced' : 'Save to Cloud'}</span>
              </button>
            ` : ''}
            ${window.cloudFunctionsAdapter ? `
              <button class="memory-button memory-button-secondary memory-share-btn">
                <span class="material-icons memory-button-icon">share</span>
                <span>Share</span>
              </button>
            ` : ''}
            <button class="memory-button memory-button-danger memory-delete-btn">
              <span class="material-icons memory-button-icon">delete</span>
            </button>
          </div>
        </div>
        
        <div class="memory-detail-meta">
          <div class="memory-detail-meta-item">
            <span class="material-icons">calendar_today</span>
            <span>${this.formatDate(flow.createdAt)}</span>
          </div>
          <div class="memory-detail-meta-item">
            <span class="material-icons">list</span>
            <span>${flow.steps.length} steps</span>
          </div>
          ${flow.context?.projectName ? `
            <div class="memory-detail-meta-item">
              <span class="material-icons">folder</span>
              <span>${flow.context.projectName}</span>
            </div>
          ` : ''}
          ${isCloudStored ? `
            <div class="memory-detail-meta-item cloud-item">
              <span class="material-icons">cloud</span>
              <span>Cloud Synced</span>
            </div>
          ` : ''}
          ${isShared ? `
            <div class="memory-detail-meta-item shared-item">
              <span class="material-icons">people</span>
              <span>Shared Flow</span>
            </div>
          ` : ''}
        </div>
        
        <div class="memory-steps">
          <h3 class="text-sm font-semibold mb-2">Steps</h3>
          ${flow.steps.map((step, index) => `
            <div class="memory-step">
              <div class="memory-step-header">
                <div class="memory-step-title">Step ${index + 1}</div>
                <div class="memory-step-tool">${step.serverName}/${step.toolName}</div>
              </div>
              <div class="memory-step-params">
                ${JSON.stringify(step.params, null, 2)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  /**
   * Handle start recording
   */
  handleStartRecording() {
    // Get task description
    const taskDescription = prompt('What task are you recording?');
    if (!taskDescription) return;
    
    // Start recording
    if (window.muscleMem) {
      window.muscleMem.startRecording(taskDescription, {
        projectName: document.title || 'Podplay Build'
      });
      
      // Update UI
      this.isRecording = true;
      this.updateRecordButton();
    }
  }
  
  /**
   * Handle stop recording
   */
  handleStopRecording() {
    if (window.muscleMem && this.isRecording) {
      const flowId = window.muscleMem.stopRecording();
      
      if (flowId) {
        // Select the new flow
        this.renderFlowList();
        this.handleFlowSelect(flowId);
      }
      
      // Update UI
      this.isRecording = false;
      this.updateRecordButton();
    }
  }
  
  /**
   * Handle replay flow
   * @param {string} flowId - Flow ID to replay
   */
  async handleReplayFlow(flowId) {
    if (!window.muscleMem) return;
    
    try {
      // Show loading state
      const replayBtn = this.flowDetailElement.querySelector('.memory-replay-btn');
      if (replayBtn) {
        replayBtn.disabled = true;
        replayBtn.innerHTML = `
          <span class="material-icons memory-button-icon spinning">sync</span>
          <span>Replaying...</span>
        `;
      }
      
      // Replay the flow
      const result = await window.muscleMem.replayFlow(flowId);
      
      // Show result
      if (result.success) {
        alert(`Successfully replayed flow "${result.flowName}"`);
      } else {
        alert(`Failed to replay flow: ${result.failedStep?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('🧠 Memory Panel: Error replaying flow', error);
      alert(`Error: ${error.message || 'Unknown error'}`);
    } finally {
      // Reset button state
      const replayBtn = this.flowDetailElement.querySelector('.memory-replay-btn');
      if (replayBtn) {
        replayBtn.disabled = false;
        replayBtn.innerHTML = `
          <span class="material-icons memory-button-icon">play_arrow</span>
          <span>Replay</span>
        `;
      }
    }
  }
  
  /**
   * Handle delete flow
   * @param {string} flowId - Flow ID to delete
   */
  handleDeleteFlow(flowId) {
    if (!window.muscleMem) return;
    
    const flow = window.muscleMem.flowCache[flowId];
    if (!flow) return;
    
    if (confirm(`Are you sure you want to delete the flow "${flow.name || 'Unnamed Flow'}"?`)) {
      // Delete from Firebase if available
      if (window.firebaseMemoryAdapter && flow.userId) {
        window.firebaseMemoryAdapter.deleteFlow(flowId)
          .then(result => {
            if (result.success) {
              console.log(`🧠 Memory Panel: Deleted flow ${flowId} from Firebase`);
            } else {
              console.warn(`🧠 Memory Panel: Failed to delete flow ${flowId} from Firebase: ${result.error}`);
            }
          })
          .catch(error => {
            console.error(`🧠 Memory Panel: Error deleting flow ${flowId} from Firebase`, error);
          });
      }
      
      // Delete from local storage
      window.muscleMem.deleteFlow(flowId);
      
      // Update UI
      this.renderFlowList();
      
      if (this.activeFlowId === flowId) {
        this.activeFlowId = null;
        this.renderEmptyDetail();
      }
    }
  }
  
  /**
   * Sync flow to cloud
   * @param {string} flowId - Flow ID to sync
   */
  async syncToCloud(flowId) {
    if (!window.muscleMem || !window.firebaseMemoryAdapter) return;
    
    const flow = window.muscleMem.flowCache[flowId];
    if (!flow) return;
    
    try {
      // Show loading state
      const cloudBtn = this.flowDetailElement.querySelector('.memory-cloud-btn');
      if (cloudBtn) {
        cloudBtn.disabled = true;
        cloudBtn.innerHTML = `
          <span class="material-icons memory-button-icon spinning">sync</span>
          <span>Syncing...</span>
        `;
      }
      
      // Save to Firebase
      const result = await window.firebaseMemoryAdapter.saveFlow(flowId, flow);
      
      if (result.success) {
        // Update local cache to reflect cloud storage
        flow.userId = window.firebaseMemoryAdapter.userId;
        flow.updatedAt = Date.now();
        
        // Save updated flow to local storage
        window.muscleMem.flowCache[flowId] = flow;
        window.muscleMem.saveFlowToStorage();
        
        console.log(`🧠 Memory Panel: Synced flow ${flowId} to cloud`);
        
        // Re-render flow detail
        this.renderFlowDetail(flowId);
      } else {
        alert(`Failed to sync flow to cloud: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('🧠 Memory Panel: Error syncing flow to cloud', error);
      alert(`Error: ${error.message || 'Unknown error'}`);
    } finally {
      // Reset button state
      const cloudBtn = this.flowDetailElement.querySelector('.memory-cloud-btn');
      if (cloudBtn) {
        cloudBtn.disabled = false;
        
        // Update button based on whether flow is now synced
        const flow = window.muscleMem.flowCache[flowId];
        const isCloudStored = flow && flow.userId && flow.updatedAt;
        
        cloudBtn.innerHTML = `
          <span class="material-icons memory-button-icon">${isCloudStored ? 'cloud_done' : 'cloud_upload'}</span>
          <span>${isCloudStored ? 'Synced' : 'Save to Cloud'}</span>
        `;
        cloudBtn.className = `memory-button memory-button-${isCloudStored ? 'secondary' : 'primary'} memory-cloud-btn`;
      }
    }
  }
  
  /**
   * Share flow with another user
   * @param {string} flowId - Flow ID to share
   */
  async shareFlow(flowId) {
    if (!window.muscleMem || !window.cloudFunctionsAdapter) return;
    
    const flow = window.muscleMem.flowCache[flowId];
    if (!flow) return;
    
    try {
      // Make sure flow is synced to Firebase first
      if (window.firebaseMemoryAdapter && (!flow.userId || !flow.updatedAt)) {
        // Prompt user to sync first
        if (confirm(`This flow needs to be synced to the cloud before sharing. Sync now?`)) {
          await this.syncToCloud(flowId);
        } else {
          return; // User cancelled
        }
      }
      
      // Show loading state
      const shareBtn = this.flowDetailElement.querySelector('.memory-share-btn');
      if (shareBtn) {
        shareBtn.disabled = true;
        shareBtn.innerHTML = `
          <span class="material-icons memory-button-icon spinning">sync</span>
          <span>Creating link...</span>
        `;
      }
      
      // Create shareable link
      const result = await window.cloudFunctionsAdapter.createShareableLink(flowId);
      
      if (result.success && result.shareLink) {
        // Show share dialog
        const shareUrl = result.shareLink;
        
        // Copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        
        // Show success message with expiration time
        const expiresDate = new Date(result.expiresAt).toLocaleString();
        alert(`Shareable link copied to clipboard! It will expire on ${expiresDate}.\n\n${shareUrl}`);
        
        console.log(`🧠 Memory Panel: Created shareable link for flow ${flowId}`);
      } else {
        alert(`Failed to create shareable link: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('🧠 Memory Panel: Error sharing flow', error);
      alert(`Error: ${error.message || 'Unknown error'}`);
    } finally {
      // Reset button state
      const shareBtn = this.flowDetailElement.querySelector('.memory-share-btn');
      if (shareBtn) {
        shareBtn.disabled = false;
        shareBtn.innerHTML = `
          <span class="material-icons memory-button-icon">share</span>
          <span>Share</span>
        `;
      }
    }
  }
  
  /**
   * Show the panel
   */
  show() {
    if (!this.panelElement) return;
    
    this.panelElement.style.display = 'flex';
    this.isVisible = true;
    
    // Refresh the flow list
    this.renderFlowList();
  }
  
  /**
   * Hide the panel
   */
  hide() {
    if (!this.panelElement) return;
    
    this.panelElement.style.display = 'none';
    this.isVisible = false;
  }
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
  window.memoryPanel = new MemoryPanel();
});
