/**
 * Podplay Build Sanctuary - Model Orchestrator
 * 
 * Intelligent routing between different AI models:
 * - Selects optimal model based on task type and complexity
 * - Preserves context across model switches
 * - Handles API quotas and fallbacks automatically
 * - Preserves memory between different models
 * 
 * Created by Mama Bear 🐻💜
 */

class ModelOrchestrator {
  constructor() {
    this.isInitialized = false;
    this.activeModel = 'gemini-1.5-pro';
    this.fallbackModel = 'gemini-1.0-pro';
    this.emergencyFallbackModel = 'gpt-3.5-turbo';
    this.contextMemory = {};
    this.taskHistory = [];
    this.quotaStatus = {};
    this.modelSpecs = {
      'gemini-1.5-pro': {
        name: 'Gemini 1.5 Pro',
        capabilities: ['text', 'code', 'vision', 'reasoning', 'planning'],
        contextWindow: 1000000,
        costPerToken: 'high',
        quotaPriority: 3
      },
      'gemini-1.5-flash': {
        name: 'Gemini 1.5 Flash',
        capabilities: ['text', 'code', 'vision', 'reasoning'],
        contextWindow: 1000000,
        costPerToken: 'medium',
        quotaPriority: 2
      },
      'gemini-1.0-pro': {
        name: 'Gemini 1.0 Pro',
        capabilities: ['text', 'code', 'reasoning'],
        contextWindow: 32000,
        costPerToken: 'low',
        quotaPriority: 1
      },
      'gpt-3.5-turbo': {
        name: 'GPT-3.5 Turbo',
        capabilities: ['text', 'code'],
        contextWindow: 16000,
        costPerToken: 'low',
        quotaPriority: 0
      }
    };
    
    // Specialized tools with their optimal models
    this.toolModels = {
      'research': 'gemini-1.5-pro',
      'code_generation': 'gemini-1.5-pro',
      'planning': 'gemini-1.5-pro',
      'chat': 'gemini-1.5-flash',
      'image_analysis': 'gemini-1.5-pro'
    };
    
    // Bind methods
    this.init = this.init.bind(this);
    this.routeRequest = this.routeRequest.bind(this);
    this.analyzeTask = this.analyzeTask.bind(this);
    this.selectModel = this.selectModel.bind(this);
    this.handleQuotaExceeded = this.handleQuotaExceeded.bind(this);
    this.preserveContext = this.preserveContext.bind(this);
    
    // Initialize when document is loaded
    if (document.readyState === 'complete') {
      this.init();
    } else {
      document.addEventListener('DOMContentLoaded', this.init);
    }
  }
  
  /**
   * Initialize the model orchestrator
   */
  async init() {
    if (this.isInitialized) return;
    
    console.log('🎭 Model Orchestrator: Initializing');
    
    try {
      // Listen for model selector events
      document.addEventListener('model-selector:model-changed', (event) => {
        if (event.detail && event.detail.model) {
          this.activeModel = event.detail.model;
          console.log(`🎭 Model Orchestrator: Primary model changed to ${this.activeModel}`);
        }
      });
      
      // Listen for quota exceeded errors
      document.addEventListener('api:quota-exceeded', (event) => {
        if (event.detail && event.detail.model) {
          this.handleQuotaExceeded(event.detail.model);
        }
      });
      
      this.isInitialized = true;
      console.log('🎭 Model Orchestrator: Initialized');
      
      // Dispatch ready event
      document.dispatchEvent(new CustomEvent('model-orchestrator:ready', {
        detail: { orchestrator: this }
      }));
    } catch (error) {
      console.error('🎭 Model Orchestrator: Initialization error', error);
    }
  }
  
  /**
   * Route a request to the appropriate model
   * @param {Object} request - Request object
   * @returns {Object} Routing information
   */
  routeRequest(request) {
    const { message, mode, includesImage } = request;
    
    // Analyze the task to determine requirements
    const taskAnalysis = this.analyzeTask(message, mode, includesImage);
    
    // Select the best model for this task
    const selectedModel = this.selectModel(taskAnalysis);
    
    // Preserve context for continuity
    this.preserveContext(selectedModel, taskAnalysis.taskId, message);
    
    // Add to task history
    this.taskHistory.push({
      timestamp: Date.now(),
      taskId: taskAnalysis.taskId,
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      modelUsed: selectedModel,
      mode: mode
    });
    
    // Limit history length
    if (this.taskHistory.length > 100) {
      this.taskHistory = this.taskHistory.slice(-100);
    }
    
    console.log(`🎭 Model Orchestrator: Routing task to ${selectedModel}`);
    
    return {
      model: selectedModel,
      taskId: taskAnalysis.taskId,
      taskType: taskAnalysis.taskType,
      context: this.contextMemory[taskAnalysis.taskId] || null
    };
  }
  
  /**
   * Analyze task to determine requirements
   * @param {string} message - User message
   * @param {string} mode - Mode (Build, Chat, etc.)
   * @param {boolean} includesImage - Whether the message includes an image
   * @returns {Object} Task analysis
   */
  analyzeTask(message, mode, includesImage = false) {
    // Generate a task ID
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Determine task type based on content and mode
    let taskType = 'general';
    
    // Check for code-related content
    if (
      message.includes('```') ||
      message.includes('function') ||
      message.includes('class') ||
      message.includes('def ') ||
      mode === 'Build'
    ) {
      taskType = 'code_generation';
    }
    
    // Check for research-related content
    if (
      message.includes('search for') ||
      message.includes('find information') ||
      message.includes('research') ||
      message.includes('look up') ||
      mode === 'Research'
    ) {
      taskType = 'research';
    }
    
    // Check for planning-related content
    if (
      message.includes('plan') ||
      message.includes('organize') ||
      message.includes('structure') ||
      message.includes('steps to')
    ) {
      taskType = 'planning';
    }
    
    // Vision tasks
    if (includesImage) {
      taskType = 'image_analysis';
    }
    
    // Estimate complexity (basic heuristic)
    const complexity = message.length > 500 ? 'high' : message.length > 100 ? 'medium' : 'low';
    
    return {
      taskId,
      taskType,
      complexity,
      mode,
      includesImage
    };
  }
  
  /**
   * Select the best model for a task
   * @param {Object} taskAnalysis - Task analysis
   * @returns {string} Selected model
   */
  selectModel(taskAnalysis) {
    const { taskType, complexity, includesImage } = taskAnalysis;
    
    // Check if we have a recommended model for this task type
    if (this.toolModels[taskType] && !this.isQuotaExceeded(this.toolModels[taskType])) {
      return this.toolModels[taskType];
    }
    
    // If the active model can handle this task, use it
    if (!this.isQuotaExceeded(this.activeModel)) {
      // Check capabilities
      const activeModelSpecs = this.modelSpecs[this.activeModel];
      
      if (includesImage && !activeModelSpecs.capabilities.includes('vision')) {
        // Active model doesn't support vision, find one that does
        for (const [modelId, specs] of Object.entries(this.modelSpecs)) {
          if (specs.capabilities.includes('vision') && !this.isQuotaExceeded(modelId)) {
            return modelId;
          }
        }
      }
      
      return this.activeModel;
    }
    
    // Active model has quota exceeded, try fallbacks
    console.log(`🎭 Model Orchestrator: Primary model ${this.activeModel} quota exceeded, trying fallbacks`);
    
    // Try models in order of quota priority
    const sortedModels = Object.entries(this.modelSpecs)
      .sort((a, b) => b[1].quotaPriority - a[1].quotaPriority);
    
    for (const [modelId, specs] of sortedModels) {
      // Skip the active model which we already checked
      if (modelId === this.activeModel) continue;
      
      // Check if this model has quota available and suitable capabilities
      if (!this.isQuotaExceeded(modelId)) {
        if (includesImage && !specs.capabilities.includes('vision')) {
          continue; // Skip models that don't support vision for image tasks
        }
        
        if (taskType === 'code_generation' && !specs.capabilities.includes('code')) {
          continue; // Skip models that don't support code for coding tasks
        }
        
        return modelId;
      }
    }
    
    // If all else fails, use emergency fallback
    return this.emergencyFallbackModel;
  }
  
  /**
   * Check if a model's quota is exceeded
   * @param {string} modelId - Model ID
   * @returns {boolean} True if quota exceeded
   */
  isQuotaExceeded(modelId) {
    return this.quotaStatus[modelId] === 'exceeded';
  }
  
  /**
   * Handle quota exceeded for a model
   * @param {string} modelId - Model ID
   */
  handleQuotaExceeded(modelId) {
    console.log(`🎭 Model Orchestrator: Quota exceeded for ${modelId}`);
    
    // Mark this model as quota exceeded
    this.quotaStatus[modelId] = 'exceeded';
    
    // If this was the active model, switch to fallback
    if (modelId === this.activeModel) {
      const newActiveModel = this.fallbackModel;
      
      // If model selector is available, update it
      if (window.modelSelector) {
        window.modelSelector.handleModelChange(newActiveModel);
      } else {
        this.activeModel = newActiveModel;
      }
      
      console.log(`🎭 Model Orchestrator: Switched active model to ${newActiveModel} due to quota limits`);
    }
    
    // Notify the user
    this.showQuotaNotification(modelId);
  }
  
  /**
   * Show quota notification to user
   * @param {string} modelId - Model ID
   */
  showQuotaNotification(modelId) {
    const modelName = this.modelSpecs[modelId]?.name || modelId;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'model-quota-notification';
    notification.innerHTML = `
      <div class="model-quota-notification-icon">⚠️</div>
      <div class="model-quota-notification-content">
        <div class="model-quota-notification-title">API Quota Exceeded</div>
        <div class="model-quota-notification-message">
          ${modelName} quota has been exceeded. Automatically switching to an alternative model.
        </div>
      </div>
      <button class="model-quota-notification-close">×</button>
    `;
    
    // Add close button functionality
    const closeButton = notification.querySelector('.model-quota-notification-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        notification.remove();
      });
    }
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      notification.remove();
    }, 10000);
    
    // Add to document
    document.body.appendChild(notification);
  }
  
  /**
   * Preserve context for continuity
   * @param {string} modelId - Model ID
   * @param {string} taskId - Task ID
   * @param {string} message - User message
   */
  preserveContext(modelId, taskId, message) {
    // Store the context
    this.contextMemory[taskId] = {
      modelId,
      timestamp: Date.now(),
      messagePreview: message.substring(0, 100) + (message.length > 100 ? '...' : '')
    };
    
    // Limit context memory size
    const contextKeys = Object.keys(this.contextMemory);
    if (contextKeys.length > 50) {
      // Remove oldest entries
      const oldestKeys = contextKeys
        .sort((a, b) => this.contextMemory[a].timestamp - this.contextMemory[b].timestamp)
        .slice(0, contextKeys.length - 50);
      
      oldestKeys.forEach(key => {
        delete this.contextMemory[key];
      });
    }
  }
  
  /**
   * Get the currently active model
   * @returns {Object} Active model info
   */
  getActiveModel() {
    return {
      id: this.activeModel,
      name: this.modelSpecs[this.activeModel]?.name || this.activeModel,
      capabilities: this.modelSpecs[this.activeModel]?.capabilities || []
    };
  }
  
  /**
   * Reset quota status for a model
   * @param {string} modelId - Model ID
   */
  resetQuotaStatus(modelId) {
    if (this.quotaStatus[modelId]) {
      delete this.quotaStatus[modelId];
      console.log(`🎭 Model Orchestrator: Reset quota status for ${modelId}`);
    }
  }
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
  window.modelOrchestrator = new ModelOrchestrator();
});
