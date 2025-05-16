/**
 * Podplay Build Sanctuary - Model Switcher
 * 
 * Allows switching between different AI models:
 * - Gemini 1.5 Pro
 * - Gemini 2.0
 * - Gemini 2.5 Pro
 * - Mama Bear (fallback)
 * 
 * Maintains conversation context across model switches
 * 
 * Created by Mama Bear 🐻💜
 */

class ModelSwitcher {
  constructor() {
    this.models = [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'Balanced model with strong multimodal capabilities',
        icon: '🔮',
        color: '#8b5cf6'
      },
      {
        id: 'gemini-2.0-pro',
        name: 'Gemini 2.0',
        description: 'Latest model with enhanced reasoning',
        icon: '✨',
        color: '#6366f1'
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        description: 'Advanced model with the best capabilities',
        icon: '🌟',
        color: '#4f46e5'
      },
      {
        id: 'mama-bear',
        name: 'Mama Bear',
        description: 'Your nurturing assistant (Local fallback)',
        icon: '🐻',
        color: '#c026d3'
      }
    ];
    
    this.currentModelId = 'gemini-1.5-pro';
    this.conversationHistory = [];
    this.modelSelectorElement = null;
    
    // Initialize when DOM is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }
  
  /**
   * Initialize the model switcher
   */
  initialize() {
    console.log('🔄 Model Switcher: Initializing');
    
    // Create model selector UI
    this.createModelSelector();
    
    // Load saved preferences
    this.loadPreferences();
    
    // Listen for chat form submissions
    this.setupChatFormListener();
    
    // Listen for responses
    document.addEventListener('chat:response', (event) => {
      if (event.detail?.response) {
        this.addToHistory('assistant', event.detail.response);
      }
    });
    
    // Set global reference
    window.modelSwitcher = this;
    
    console.log('🔄 Model Switcher: Initialized');
  }
  
  /**
   * Set up chat form submission listener
   */
  setupChatFormListener() {
    const chatForm = document.getElementById('chat-form');
    if (!chatForm) return;
    
    const originalSubmit = chatForm.onsubmit;
    chatForm.onsubmit = (event) => {
      const chatInput = document.getElementById('chat-input');
      if (chatInput?.value.trim()) {
        this.addToHistory('user', chatInput.value.trim());
      }
      
      if (typeof originalSubmit === 'function') {
        return originalSubmit.call(chatForm, event);
      }
      return true;
    };
  }
  
  /**
   * Create the model selector UI
   */
  createModelSelector() {
    // Look for existing model selector
    const existingSelector = document.getElementById('model-selector');
    if (existingSelector) {
      this.modelSelectorElement = existingSelector;
      return;
    }
    
    // Find the model selector container in the chat controls
    const modelSelectorContainer = document.getElementById('model-selector-placeholder');
    if (!modelSelectorContainer) {
      console.error('🔄 Model Switcher: Could not find model selector container');
      return;
    }
    
    // Create model selector container
    const modelSelector = document.createElement('div');
    modelSelector.id = 'model-selector';
    modelSelector.className = 'model-selector';
    
    // Create dropdown button
    const dropdownButton = document.createElement('button');
    dropdownButton.className = 'model-dropdown-button';
    dropdownButton.setAttribute('aria-haspopup', 'listbox');
    dropdownButton.setAttribute('aria-expanded', 'false');
    
    // Add current model display
    const currentModelDisplay = document.createElement('div');
    currentModelDisplay.className = 'current-model-display';
    
    const currentModel = this.getCurrentModel();
    currentModelDisplay.innerHTML = `
      <span class="model-icon">${currentModel.icon}</span>
      <span class="model-name">${currentModel.name}</span>
      <span class="dropdown-arrow">▼</span>
    `;
    
    dropdownButton.appendChild(currentModelDisplay);
    
    // Create dropdown menu
    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'model-dropdown-menu';
    dropdownMenu.setAttribute('role', 'listbox');
    
    // Add model options
    this.models.forEach(model => {
      const modelOption = document.createElement('button');
      modelOption.className = `model-option ${model.id === this.currentModelId ? 'active' : ''}`;
      modelOption.setAttribute('role', 'option');
      modelOption.setAttribute('aria-selected', model.id === this.currentModelId ? 'true' : 'false');
      modelOption.dataset.modelId = model.id;
      
      modelOption.innerHTML = `
        <span class="model-option-icon">${model.icon}</span>
        <div class="model-option-text">
          <div class="model-option-name">${model.name}</div>
          <div class="model-option-desc">${model.description}</div>
        </div>
      `;
      
      modelOption.addEventListener('click', (e) => {
        e.stopPropagation();
        this.switchModel(model.id);
        dropdownMenu.classList.remove('show');
        dropdownButton.setAttribute('aria-expanded', 'false');
      });
      
      dropdownMenu.appendChild(modelOption);
    });
    
    // Toggle dropdown menu
    dropdownButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = dropdownButton.getAttribute('aria-expanded') === 'true';
      dropdownButton.setAttribute('aria-expanded', String(!isExpanded));
      dropdownMenu.classList.toggle('show', !isExpanded);
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      dropdownMenu.classList.remove('show');
      dropdownButton.setAttribute('aria-expanded', 'false');
    });
    
    // Prevent dropdown from closing when clicking inside
    dropdownMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Assemble the component
    modelSelector.appendChild(dropdownButton);
    modelSelector.appendChild(dropdownMenu);
    
    // Add to the DOM
    modelSelectorContainer.appendChild(modelSelector);
    this.modelSelectorElement = modelSelector;
  }
  
  /**
   * Get model by ID
   * @param {string} modelId - ID of the model to find
   * @returns {Object|undefined} Model object or undefined if not found
   */
  getModelById(modelId) {
    return this.models.find(m => m.id === modelId);
  }
  
  /**
   * Get current model
   * @returns {Object} Current model
   */
  getCurrentModel() {
    return this.getModelById(this.currentModelId) || this.models[0];
  }
  
  /**
   * Switch to a different model
   * @param {string} modelId - ID of the model to switch to
   */
  switchModel(modelId) {
    if (this.currentModelId === modelId) return;
    
    const previousModel = this.getCurrentModel();
    const newModel = this.getModelById(modelId);
    
    if (!newModel) {
      console.error(`🔄 Model Switcher: Model with ID ${modelId} not found`);
      return;
    }
    
    console.log(`🔄 Switching model from ${previousModel.name} to ${newModel.name}`);
    
    // Update current model
    this.currentModelId = modelId;
    
    // Save preference
    this.savePreferences();
    
    // Update UI
    this.updateModelSelectorUI(newModel);
    
    // Dispatch event for other components
    document.dispatchEvent(new CustomEvent('model:changed', {
      detail: {
        previousModel,
        newModel,
        conversationHistory: this.conversationHistory
      }
    }));
    
    // Add a system message indicating the model change
    this.addSystemMessage(`Switched to ${newModel.name} ${newModel.icon}`);
  }
  
  /**
   * Update the model selector UI to reflect the current model
   * @param {Object} model - The model to display as active
   */
  updateModelSelectorUI(model) {
    if (!this.modelSelectorElement) return;
    
    // Update current model display
    const currentModelDisplay = this.modelSelectorElement.querySelector('.current-model-display');
    if (currentModelDisplay) {
      currentModelDisplay.innerHTML = `
        <span class="model-icon">${model.icon}</span>
        <span class="model-name">${model.name}</span>
        <span class="dropdown-arrow">▼</span>
      `;
    }
    
    // Update active state in dropdown
    const options = this.modelSelectorElement.querySelectorAll('.model-option');
    options.forEach(option => {
      const isActive = option.dataset.modelId === model.id;
      option.classList.toggle('active', isActive);
      option.setAttribute('aria-selected', String(isActive));
    });
  }
  
  /**
   * Add a system message to the chat
   * @param {string} message - The message to display
   */
  addSystemMessage(message) {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message system-message';
    messageElement.textContent = message;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  /**
   * Load saved preferences
   */
  loadPreferences() {
    // Load model preference
    const savedModel = localStorage.getItem('podplay_model');
    if (savedModel && this.getModelById(savedModel)) {
      this.currentModelId = savedModel;
    }
    
    // Load conversation history
    try {
      const savedHistory = localStorage.getItem('podplay_conversation');
      if (savedHistory) {
        this.conversationHistory = JSON.parse(savedHistory);
        console.log('🔄 Loaded conversation history:', this.conversationHistory.length, 'messages');
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      this.conversationHistory = [];
    }
  }
  
  /**
   * Save preferences to local storage
   */
  savePreferences() {
    localStorage.setItem('podplay_model', this.currentModelId);
    this.saveHistory();
  }
  
  /**
   * Add message to history
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   * @param {string} [modelId] - Optional model ID (defaults to current model)
   * @returns {Object} The added message
   */
  addToHistory(role, content, modelId = this.currentModelId) {
    const message = {
      role,
      content,
      model: modelId,
      timestamp: new Date().toISOString()
    };
    
    this.conversationHistory.push(message);
    
    // Cap history at 100 messages to avoid memory issues
    if (this.conversationHistory.length > 100) {
      this.conversationHistory.shift();
    }
    
    // Save to storage
    this.saveHistory();
    
    // Dispatch event for other components
    document.dispatchEvent(new CustomEvent('chat:message', {
      detail: message
    }));
    
    return message;
  }
  
  /**
   * Save conversation history to local storage
   */
  saveHistory() {
    try {
      localStorage.setItem('podplay_conversation', JSON.stringify(this.conversationHistory));
    } catch (error) {
      console.error('Failed to save conversation history:', error);
    }
  }
  
  /**
   * Get conversation history
   * @returns {Array} Conversation history
   */
  getHistory() {
    return [...this.conversationHistory];
  }
  
  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
    localStorage.removeItem('podplay_conversation');
    console.log('🔄 Model Switcher: Conversation history cleared');
  }
  
  /**
   * Helper to convert hex color to rgb
   * @param {string} hex - Hex color
   * @returns {string} RGB values as string
   */
  hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse r, g, b values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
  }
}

// Initialize the model switcher
const modelSwitcher = new ModelSwitcher();

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = modelSwitcher;
}
