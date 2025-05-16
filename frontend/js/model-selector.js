/**
 * Podplay Build Sanctuary - Model Selector
 * 
 * Provides model selection capabilities for AI interactions:
 * - Switch between different Gemini models (1.5 Pro, 1.5 Flash, 1.0 Pro, etc.)
 * - Optimize token usage based on task complexity
 * - Avoid API quota limitations
 * - Persist preferences across sessions
 * 
 * Created by Mama Bear 🐻💜
 */

class ModelSelector {
  constructor() {
    this.isInitialized = false;
    this.currentModel = 'gemini-1.5-pro';
    this.availableModels = {
      'gemini-1.5-pro': {
        name: 'Gemini 1.5 Pro',
        description: 'Most powerful model, best for complex tasks',
        quotaCost: 'High',
        tokenLimit: 1048576,
        icon: '✨'
      },
      'gemini-1.5-flash': {
        name: 'Gemini 1.5 Flash',
        description: 'Faster response times, slightly less capable',
        quotaCost: 'Medium',
        tokenLimit: 1048576,
        icon: '⚡'
      },
      'gemini-1.0-pro': {
        name: 'Gemini 1.0 Pro',
        description: 'Previous generation, lower quota usage',
        quotaCost: 'Low',
        tokenLimit: 32768,
        icon: '💎'
      },
      'gemini-1.0-pro-vision': {
        name: 'Gemini 1.0 Pro Vision',
        description: 'Good for visual tasks, lower quota usage',
        quotaCost: 'Low',
        tokenLimit: 16384,
        icon: '👁️'
      }
    };
    
    // Store for API keys (per model)
    this.apiKeys = {};
    
    // Bind methods
    this.init = this.init.bind(this);
    this.createUI = this.createUI.bind(this);
    this.handleModelChange = this.handleModelChange.bind(this);
    this.savePreferences = this.savePreferences.bind(this);
    this.loadPreferences = this.loadPreferences.bind(this);
    this.getCurrentModel = this.getCurrentModel.bind(this);
    
    // Initialize when document is loaded
    if (document.readyState === 'complete') {
      this.init();
    } else {
      document.addEventListener('DOMContentLoaded', this.init);
    }
  }
  
  /**
   * Initialize the model selector
   */
  async init() {
    if (this.isInitialized) return;
    
    console.log('🧠 Model Selector: Initializing');
    
    try {
      // Load saved preferences
      this.loadPreferences();
      
      // Create UI
      this.createUI();
      
      this.isInitialized = true;
      console.log(`🧠 Model Selector: Initialized with model ${this.currentModel}`);
      
      // Dispatch ready event
      document.dispatchEvent(new CustomEvent('model-selector:ready', {
        detail: { modelSelector: this }
      }));
      
      // Dispatch model selected event for current model
      document.dispatchEvent(new CustomEvent('model-selector:model-changed', {
        detail: { 
          model: this.currentModel,
          modelInfo: this.availableModels[this.currentModel]
        }
      }));
    } catch (error) {
      console.error('🧠 Model Selector: Initialization error', error);
    }
  }
  
  /**
   * Create the model selector UI
   */
  createUI() {
    // Create model selector container
    const container = document.createElement('div');
    container.id = 'model-selector';
    container.className = 'model-selector';
    
    // Create model selector button
    const modelButton = document.createElement('button');
    modelButton.id = 'model-selector-button';
    modelButton.className = 'model-selector-button';
    modelButton.innerHTML = `
      <span class="model-selector-icon">${this.availableModels[this.currentModel].icon}</span>
      <span class="model-selector-label">${this.availableModels[this.currentModel].name}</span>
      <span class="model-selector-arrow">▼</span>
    `;
    
    // Create model selector dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'model-selector-dropdown';
    dropdown.className = 'model-selector-dropdown';
    dropdown.style.display = 'none';
    
    // Add models to dropdown
    Object.entries(this.availableModels).forEach(([modelId, modelInfo]) => {
      const modelOption = document.createElement('div');
      modelOption.className = `model-selector-option ${modelId === this.currentModel ? 'selected' : ''}`;
      modelOption.dataset.modelId = modelId;
      
      modelOption.innerHTML = `
        <div class="model-selector-option-header">
          <span class="model-selector-option-icon">${modelInfo.icon}</span>
          <span class="model-selector-option-name">${modelInfo.name}</span>
          <span class="model-selector-option-cost">Quota: ${modelInfo.quotaCost}</span>
        </div>
        <div class="model-selector-option-description">${modelInfo.description}</div>
      `;
      
      modelOption.addEventListener('click', () => {
        this.handleModelChange(modelId);
        dropdown.style.display = 'none';
      });
      
      dropdown.appendChild(modelOption);
    });
    
    // Add model key management section
    const keySection = document.createElement('div');
    keySection.className = 'model-selector-key-section';
    keySection.innerHTML = `
      <div class="model-selector-key-header">API Keys (Optional)</div>
      <div class="model-selector-key-description">Add custom API keys for specific models</div>
      <div id="model-selector-key-list" class="model-selector-key-list"></div>
      <button id="model-selector-add-key" class="model-selector-add-key">Add API Key</button>
    `;
    
    dropdown.appendChild(keySection);
    
    // Toggle dropdown when button is clicked
    modelButton.addEventListener('click', () => {
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
      if (!container.contains(event.target)) {
        dropdown.style.display = 'none';
      }
    });
    
    // Add elements to container
    container.appendChild(modelButton);
    container.appendChild(dropdown);
    
    // Find insertion point - ideally the top right of the UI
    const targetElement = document.querySelector('.flex.justify-between.items-center.p-4.border-b');
    if (targetElement) {
      // Insert at the end of the right section
      const rightSection = targetElement.querySelector('.flex.space-x-2:last-child');
      if (rightSection) {
        rightSection.insertBefore(container, rightSection.firstChild);
      } else {
        targetElement.appendChild(container);
      }
    } else {
      // Fallback - insert at the beginning of the body
      document.body.insertBefore(container, document.body.firstChild);
    }
    
    // Initialize the key management
    this.initializeKeyManagement();
  }
  
  /**
   * Initialize API key management UI
   */
  initializeKeyManagement() {
    const keyList = document.getElementById('model-selector-key-list');
    const addKeyButton = document.getElementById('model-selector-add-key');
    
    if (!keyList || !addKeyButton) return;
    
    // Clear existing keys
    keyList.innerHTML = '';
    
    // Add existing keys
    Object.entries(this.apiKeys).forEach(([modelId, apiKey]) => {
      this.addKeyToUI(modelId, apiKey, keyList);
    });
    
    // Add key button action
    addKeyButton.addEventListener('click', () => {
      const modelId = prompt('Enter model ID (e.g., gemini-1.5-pro):');
      if (!modelId) return;
      
      const apiKey = prompt('Enter API key:');
      if (!apiKey) return;
      
      this.apiKeys[modelId] = apiKey;
      this.savePreferences();
      
      // Add to UI
      this.addKeyToUI(modelId, apiKey, keyList);
    });
  }
  
  /**
   * Add API key to UI
   * @param {string} modelId - Model ID
   * @param {string} apiKey - API key
   * @param {HTMLElement} keyList - Key list element
   */
  addKeyToUI(modelId, apiKey, keyList) {
    const keyItem = document.createElement('div');
    keyItem.className = 'model-selector-key-item';
    
    // Mask API key for display
    const maskedKey = apiKey.substring(0, 4) + '••••••••' + apiKey.substring(apiKey.length - 4);
    
    keyItem.innerHTML = `
      <div class="model-selector-key-model">${modelId}</div>
      <div class="model-selector-key-value">${maskedKey}</div>
      <button class="model-selector-key-delete" data-model-id="${modelId}">×</button>
    `;
    
    // Delete button action
    const deleteButton = keyItem.querySelector('.model-selector-key-delete');
    if (deleteButton) {
      deleteButton.addEventListener('click', () => {
        if (confirm(`Delete API key for ${modelId}?`)) {
          delete this.apiKeys[modelId];
          this.savePreferences();
          keyItem.remove();
        }
      });
    }
    
    keyList.appendChild(keyItem);
  }
  
  /**
   * Handle model change
   * @param {string} modelId - Model ID
   */
  handleModelChange(modelId) {
    if (!this.availableModels[modelId]) {
      console.error(`🧠 Model Selector: Invalid model ${modelId}`);
      return;
    }
    
    // Update current model
    this.currentModel = modelId;
    
    // Update UI
    const modelButton = document.getElementById('model-selector-button');
    if (modelButton) {
      modelButton.innerHTML = `
        <span class="model-selector-icon">${this.availableModels[modelId].icon}</span>
        <span class="model-selector-label">${this.availableModels[modelId].name}</span>
        <span class="model-selector-arrow">▼</span>
      `;
    }
    
    // Update selected option in dropdown
    const options = document.querySelectorAll('.model-selector-option');
    options.forEach((option) => {
      if (option.dataset.modelId === modelId) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
    
    // Save preferences
    this.savePreferences();
    
    console.log(`🧠 Model Selector: Changed model to ${modelId}`);
    
    // Dispatch model changed event
    document.dispatchEvent(new CustomEvent('model-selector:model-changed', {
      detail: { 
        model: modelId,
        modelInfo: this.availableModels[modelId] 
      }
    }));
  }
  
  /**
   * Save preferences to local storage
   */
  savePreferences() {
    try {
      const preferences = {
        currentModel: this.currentModel,
        apiKeys: this.apiKeys
      };
      
      localStorage.setItem('model-selector-preferences', JSON.stringify(preferences));
      return true;
    } catch (error) {
      console.error('🧠 Model Selector: Error saving preferences', error);
      return false;
    }
  }
  
  /**
   * Load preferences from local storage
   */
  loadPreferences() {
    try {
      const preferences = localStorage.getItem('model-selector-preferences');
      if (preferences) {
        const { currentModel, apiKeys } = JSON.parse(preferences);
        
        if (currentModel && this.availableModels[currentModel]) {
          this.currentModel = currentModel;
        }
        
        if (apiKeys) {
          this.apiKeys = apiKeys;
        }
        
        console.log(`🧠 Model Selector: Loaded preferences, model: ${this.currentModel}`);
      }
      
      return true;
    } catch (error) {
      console.error('🧠 Model Selector: Error loading preferences', error);
      return false;
    }
  }
  
  /**
   * Get current model info
   * @returns {Object} Current model info
   */
  getCurrentModel() {
    return {
      id: this.currentModel,
      ...this.availableModels[this.currentModel],
      apiKey: this.apiKeys[this.currentModel] || null
    };
  }
  
  /**
   * Get API key for current model
   * @returns {string|null} API key
   */
  getCurrentApiKey() {
    return this.apiKeys[this.currentModel] || null;
  }
  
  /**
   * Recommend best model for a task
   * @param {Object} task - Task details
   * @returns {string} Recommended model ID
   */
  recommendModel(task = {}) {
    const { complexity = 'medium', usesVision = false, needsSpeed = false } = task;
    
    if (usesVision) {
      // For vision tasks
      return complexity === 'high' ? 'gemini-1.5-pro' : 'gemini-1.0-pro-vision';
    }
    
    if (needsSpeed) {
      // For speed-critical tasks
      return 'gemini-1.5-flash';
    }
    
    // Based on complexity
    switch (complexity) {
      case 'high':
        return 'gemini-1.5-pro';
      case 'medium':
        return 'gemini-1.5-flash';
      case 'low':
        return 'gemini-1.0-pro';
      default:
        return 'gemini-1.5-pro';
    }
  }
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
  window.modelSelector = new ModelSelector();
});
