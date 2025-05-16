/**
 * Podplay Build Sanctuary - Muscle Memory
 * 
 * Implements "muscle memory" for AI agents by:
 * - Recording sequences of tool calls for common tasks
 * - Matching new tasks against recorded flows
 * - Replaying successful flows with validation
 * 
 * Created by Mama Bear 🐻💜
 */

class MuscleMem {
  constructor() {
    this.isInitialized = false;
    this.isRecording = false;
    this.currentFlow = [];
    this.flowContext = {};
    this.flowCache = {};
    
    // Bind methods
    this.startRecording = this.startRecording.bind(this);
    this.stopRecording = this.stopRecording.bind(this);
    this.recordToolCall = this.recordToolCall.bind(this);
    this.findMatchingFlow = this.findMatchingFlow.bind(this);
    this.replayFlow = this.replayFlow.bind(this);
    this.saveFlowToStorage = this.saveFlowToStorage.bind(this);
    this.loadFlowsFromStorage = this.loadFlowsFromStorage.bind(this);
    
    // Initialize on load
    this.init();
  }
  
  /**
   * Initialize Muscle Memory
   */
  async init() {
    console.log('💪 Muscle Memory: Initializing');
    
    try {
      // Load stored flows from local storage
      await this.loadFlowsFromStorage();
      
      // Set up event listeners
      document.addEventListener('mcp-tool:before-call', this.handleToolCall.bind(this));
      document.addEventListener('mcp-tool:after-call', this.handleToolCallResult.bind(this));
      
      this.isInitialized = true;
      console.log('💪 Muscle Memory: Initialized');
      
      // Dispatch event that Muscle Memory is ready
      document.dispatchEvent(new CustomEvent('muscle-mem:ready', { 
        detail: { muscleMem: this } 
      }));
    } catch (error) {
      console.error('💪 Muscle Memory: Initialization failed', error);
    }
  }
  
  /**
   * Start recording a flow with context
   * @param {string} taskDescription - Description of the task
   * @param {Object} context - Additional context (project, environment, etc.)
   */
  startRecording(taskDescription, context = {}) {
    console.log(`💪 Muscle Memory: Starting recording for "${taskDescription}"`);
    
    this.isRecording = true;
    this.currentFlow = [];
    this.flowContext = {
      taskDescription,
      projectName: context.projectName || 'default',
      environment: context.environment || {},
      timestamp: Date.now(),
      ...context
    };
    
    // Dispatch recording started event
    document.dispatchEvent(new CustomEvent('muscle-mem:recording-started', {
      detail: { context: this.flowContext }
    }));
    
    return true;
  }
  
  /**
   * Stop recording and save the flow
   * @returns {string|null} Flow ID if saved successfully, null otherwise
   */
  stopRecording() {
    if (!this.isRecording || this.currentFlow.length === 0) {
      console.log('💪 Muscle Memory: No active recording or empty flow');
      return null;
    }
    
    // Generate a flow ID
    const flowId = `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create the flow object
    const flow = {
      id: flowId,
      name: this.flowContext.taskDescription,
      context: this.flowContext,
      steps: this.currentFlow,
      createdAt: Date.now()
    };
    
    // Add to cache
    this.flowCache[flowId] = flow;
    
    // Save to persistent storage
    this.saveFlowToStorage();
    
    // Reset recording state
    this.isRecording = false;
    
    console.log(`💪 Muscle Memory: Saved flow "${flow.name}" with ${flow.steps.length} steps`);
    
    // Dispatch flow saved event
    document.dispatchEvent(new CustomEvent('muscle-mem:flow-saved', {
      detail: { flow }
    }));
    
    return flowId;
  }
  
  /**
   * Record a tool call
   * @param {string} serverName - MCP server name
   * @param {string} toolName - Tool name
   * @param {Object} params - Tool parameters
   * @param {Object} metadata - Additional metadata (agent, timestamp, etc.)
   */
  recordToolCall(serverName, toolName, params, metadata = {}) {
    if (!this.isRecording) return false;
    
    // Create step record
    const step = {
      type: 'tool-call',
      serverName,
      toolName,
      params,
      metadata: {
        timestamp: Date.now(),
        agent: metadata.agent || 'default',
        ...metadata
      }
    };
    
    // Add to current flow
    this.currentFlow.push(step);
    
    console.log(`💪 Muscle Memory: Recorded tool call ${serverName}/${toolName}`);
    return true;
  }
  
  /**
   * Record the result of a tool call
   * @param {number} stepIndex - Index of the step in the current flow
   * @param {Object} result - Result of the tool call
   */
  recordToolCallResult(stepIndex, result) {
    if (!this.isRecording || !this.currentFlow[stepIndex]) return false;
    
    // Add result to the step
    this.currentFlow[stepIndex].result = result;
    this.currentFlow[stepIndex].metadata.completedAt = Date.now();
    
    return true;
  }
  
  /**
   * Handle tool call event
   * @param {CustomEvent} event - Tool call event
   */
  handleToolCall(event) {
    if (!this.isRecording || !event.detail) return;
    
    const { serverName, toolName, params, metadata } = event.detail;
    this.recordToolCall(serverName, toolName, params, metadata);
  }
  
  /**
   * Handle tool call result event
   * @param {CustomEvent} event - Tool call result event
   */
  handleToolCallResult(event) {
    if (!this.isRecording || !event.detail) return;
    
    const { stepIndex, result } = event.detail;
    this.recordToolCallResult(stepIndex, result);
  }
  
  /**
   * Find matching flows for a given task description and context
   * @param {string} taskDescription - Task description to match
   * @param {Object} context - Current context (project, environment, etc.)
   * @returns {Array} Array of matching flows
   */
  findMatchingFlow(taskDescription, context = {}) {
    const matches = [];
    
    // Search for matches in the flow cache
    for (const flowId in this.flowCache) {
      const flow = this.flowCache[flowId];
      
      // Check task description similarity (simple contains check for now)
      // In a real implementation, we'd use semantic similarity search
      const taskMatch = flow.context.taskDescription.toLowerCase().includes(
        taskDescription.toLowerCase()
      );
      
      // Check if context matches
      const contextMatch = this.matchesContext(flow.context, context);
      
      if (taskMatch && contextMatch) {
        matches.push(flow);
      }
    }
    
    // Sort by recency (newest first)
    matches.sort((a, b) => b.createdAt - a.createdAt);
    
    return matches;
  }
  
  /**
   * Check if contexts match
   * @param {Object} storedContext - Stored flow context
   * @param {Object} currentContext - Current context
   * @returns {boolean} True if contexts match
   */
  matchesContext(storedContext, currentContext) {
    // Project name match (if specified)
    if (currentContext.projectName && 
        storedContext.projectName !== currentContext.projectName) {
      return false;
    }
    
    // Environment check (simplified)
    // In a real implementation, we'd do more sophisticated matching
    return true;
  }
  
  /**
   * Validate a step before replay
   * @param {Object} step - Step to validate
   * @param {Object} context - Current context
   * @returns {Promise<boolean>} True if step is valid
   */
  async validateStep(step, context) {
    // Filesystem validation examples:
    if (step.serverName === 'filesystem') {
      // If creating a file, check it doesn't exist
      if (step.toolName === 'write_file' && step.params.path) {
        try {
          // Use WebContainer if available
          if (window.buildMode && window.buildMode.webContainer) {
            const exists = await window.buildMode.webContainer.fs.exists(step.params.path);
            if (exists) {
              console.log(`💪 Muscle Memory: File ${step.params.path} already exists, skipping creation`);
              return false;
            }
          }
        } catch (error) {
          // Error checking, assume it's safe
          return true;
        }
      }
      
      // If reading a file, check it exists
      if (step.toolName === 'read_file' && step.params.path) {
        try {
          // Use WebContainer if available
          if (window.buildMode && window.buildMode.webContainer) {
            const exists = await window.buildMode.webContainer.fs.exists(step.params.path);
            if (!exists) {
              console.log(`💪 Muscle Memory: File ${step.params.path} does not exist, cannot read`);
              return false;
            }
          }
        } catch (error) {
          // Error checking, assume it's not safe
          return false;
        }
      }
    }
    
    // Default to allowing step
    return true;
  }
  
  /**
   * Replay a flow
   * @param {string} flowId - ID of the flow to replay
   * @param {Object} context - Current context
   * @param {boolean} validateSteps - Whether to validate steps before execution
   * @returns {Promise<Object>} Results of the flow replay
   */
  async replayFlow(flowId, context = {}, validateSteps = true) {
    console.log(`💪 Muscle Memory: Replaying flow ${flowId}`);
    
    const flow = this.flowCache[flowId];
    if (!flow) {
      console.error(`💪 Muscle Memory: Flow ${flowId} not found`);
      return { success: false, error: 'Flow not found' };
    }
    
    // Dispatch replay started event
    document.dispatchEvent(new CustomEvent('muscle-mem:replay-started', {
      detail: { flow, context }
    }));
    
    const results = [];
    let failedStep = null;
    
    // Execute each step in the flow
    for (let i = 0; i < flow.steps.length; i++) {
      const step = flow.steps[i];
      
      // Check if we should validate this step
      if (validateSteps) {
        const isValid = await this.validateStep(step, context);
        if (!isValid) {
          console.log(`💪 Muscle Memory: Validation failed for step ${i+1}`, step);
          failedStep = { index: i, step, error: 'Validation failed' };
          break;
        }
      }
      
      try {
        // Execute the step
        console.log(`💪 Muscle Memory: Executing step ${i+1}/${flow.steps.length}`, step);
        
        // Check if MCP Browser is available
        if (window.mcpBrowser && typeof window.mcpBrowser.callTool === 'function') {
          // Call the tool
          const result = await window.mcpBrowser.callTool(
            step.serverName,
            step.toolName,
            step.params
          );
          
          // Store result
          results.push({ step, result, success: true });
        } else {
          console.error(`💪 Muscle Memory: MCP Browser not available`);
          failedStep = { index: i, step, error: 'MCP Browser not available' };
          break;
        }
      } catch (error) {
        console.error(`💪 Muscle Memory: Error executing step ${i+1}`, error);
        failedStep = { index: i, step, error: error.message || 'Execution failed' };
        break;
      }
    }
    
    // Dispatch replay completed event
    document.dispatchEvent(new CustomEvent('muscle-mem:replay-completed', {
      detail: { 
        flow, 
        results, 
        success: !failedStep,
        failedStep
      }
    }));
    
    return { 
      success: !failedStep, 
      results,
      failedStep,
      flowId,
      flowName: flow.name
    };
  }
  
  /**
   * Save flows to storage (local or Firebase)
   */
  saveFlowToStorage() {
    try {
      // Save to local storage as backup
      localStorage.setItem('podplay-muscle-memory', JSON.stringify(this.flowCache));
      
      // If Firebase adapter is available, save to Firebase
      if (window.firebaseMemoryAdapter) {
        // Save each flow to Firebase
        Object.entries(this.flowCache).forEach(([flowId, flow]) => {
          window.firebaseMemoryAdapter.saveFlow(flowId, flow)
            .then(result => {
              if (result.success) {
                console.log(`💪 Muscle Memory: Saved flow ${flowId} to Firebase`);
              } else {
                console.warn(`💪 Muscle Memory: Failed to save flow ${flowId} to Firebase: ${result.error}`);
              }
            })
            .catch(error => {
              console.error(`💪 Muscle Memory: Error saving flow ${flowId} to Firebase`, error);
            });
        });
      }
      
      return true;
    } catch (error) {
      console.error('💪 Muscle Memory: Error saving flows to storage', error);
      return false;
    }
  }
  
  /**
   * Load flows from storage (local or Firebase)
   */
  async loadFlowsFromStorage() {
    try {
      // First load from local storage as a fallback
      const stored = localStorage.getItem('podplay-muscle-memory');
      if (stored) {
        this.flowCache = JSON.parse(stored);
        console.log(`💪 Muscle Memory: Loaded ${Object.keys(this.flowCache).length} flows from local storage`);
      } else {
        console.log('💪 Muscle Memory: No stored flows found in local storage');
        this.flowCache = {};
      }
      
      // If Firebase adapter is available, try to load from Firebase
      if (window.firebaseMemoryAdapter) {
        try {
          const result = await window.firebaseMemoryAdapter.loadAllFlows();
          
          if (result.success && result.flows) {
            console.log(`💪 Muscle Memory: Loaded ${Object.keys(result.flows).length} flows from Firebase`);
            
            // Merge with local flows (Firebase takes precedence for same IDs)
            this.flowCache = { ...this.flowCache, ...result.flows };
            
            // Save merged flows back to local storage
            localStorage.setItem('podplay-muscle-memory', JSON.stringify(this.flowCache));
          } else {
            console.warn('💪 Muscle Memory: Failed to load flows from Firebase:', result.error);
          }
        } catch (error) {
          console.error('💪 Muscle Memory: Error loading flows from Firebase', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('💪 Muscle Memory: Error loading flows from storage', error);
      this.flowCache = {};
      return false;
    }
  }
  
  /**
   * Get all stored flows
   * @returns {Array} Array of flows
   */
  getAllFlows() {
    return Object.values(this.flowCache).sort((a, b) => b.createdAt - a.createdAt);
  }
  
  /**
   * Delete a flow
   * @param {string} flowId - ID of the flow to delete
   * @returns {boolean} True if flow was deleted
   */
  deleteFlow(flowId) {
    if (!this.flowCache[flowId]) return false;
    
    delete this.flowCache[flowId];
    this.saveFlowToStorage();
    
    console.log(`💪 Muscle Memory: Deleted flow ${flowId}`);
    
    // Dispatch flow deleted event
    document.dispatchEvent(new CustomEvent('muscle-mem:flow-deleted', {
      detail: { flowId }
    }));
    
    return true;
  }
  
  /**
   * Rename a flow
   * @param {string} flowId - ID of the flow to rename
   * @param {string} newName - New name for the flow
   * @returns {boolean} True if flow was renamed
   */
  renameFlow(flowId, newName) {
    if (!this.flowCache[flowId]) return false;
    
    this.flowCache[flowId].name = newName;
    this.saveFlowToStorage();
    
    console.log(`💪 Muscle Memory: Renamed flow ${flowId} to "${newName}"`);
    
    // Dispatch flow renamed event
    document.dispatchEvent(new CustomEvent('muscle-mem:flow-renamed', {
      detail: { flowId, newName }
    }));
    
    return true;
  }
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
  window.muscleMem = new MuscleMem();
});
