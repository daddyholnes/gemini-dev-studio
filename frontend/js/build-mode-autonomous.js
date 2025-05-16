/**
 * Podplay Build Sanctuary - Autonomous Builder
 * 
 * Inspired by Scout.new, this module provides autonomous project generation capabilities:
 * - Accept natural language project descriptions
 * - Plan and execute multi-step build processes
 * - Research and install dependencies
 * - Generate complete projects with minimal input
 * 
 * Created by Mama Bear 🐻💜
 */

class AutonomousBuilder {
  constructor() {
    this.isInitialized = false;
    this.isBuilding = false;
    this.currentBuildId = null;
    this.buildQueue = [];
    this.currentStepIndex = 0;
    this.totalSteps = 0;
    this.buildPlan = [];
    this.buildContext = {};
    this.buildHistory = [];
    
    // UI elements
    this.promptInput = null;
    this.buildButton = null;
    this.progressContainer = null;
    this.stepListElement = null;
    this.outputElement = null;
    
    // Bind methods
    this.init = this.init.bind(this);
    this.createUI = this.createUI.bind(this);
    this.handleBuildClick = this.handleBuildClick.bind(this);
    this.startBuild = this.startBuild.bind(this);
    this.executeBuildStep = this.executeBuildStep.bind(this);
    this.completeBuild = this.completeBuild.bind(this);
    this.updateProgressUI = this.updateProgressUI.bind(this);
    this.generateBuildPlan = this.generateBuildPlan.bind(this);
    
    // Initialize on DOM ready
    if (document.readyState === 'complete') {
      this.init();
    } else {
      document.addEventListener('DOMContentLoaded', this.init);
    }
  }
  
  /**
   * Initialize the autonomous builder
   */
  async init() {
    console.log('🚀 Autonomous Builder: Initializing');
    
    try {
      // Wait for build mode to be ready
      await this.waitForBuildMode();
      
      // Create builder UI elements
      this.createUI();
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('🚀 Autonomous Builder: Initialized');
      
      // Dispatch ready event
      document.dispatchEvent(new CustomEvent('autonomous-builder:ready', {
        detail: { builder: this }
      }));
    } catch (error) {
      console.error('🚀 Autonomous Builder: Initialization failed', error);
    }
  }
  
  /**
   * Wait for build mode to be ready
   */
  async waitForBuildMode() {
    if (window.buildMode) return Promise.resolve();
    
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (window.buildMode) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        console.warn('🚀 Autonomous Builder: Timeout waiting for Build Mode');
        resolve();
      }, 10000);
    });
  }
  
  /**
   * Create the autonomous builder UI
   */
  createUI() {
    // Create container for prompt input
    const buildTab = document.getElementById('build-panel');
    if (!buildTab) {
      console.error('🚀 Autonomous Builder: Build panel not found');
      return;
    }
    
    // Create the autonomous builder container
    const container = document.createElement('div');
    container.id = 'autonomous-builder';
    container.className = 'autonomous-builder-container';
    
    // Add prompt input area
    container.innerHTML = `
      <div class="autonomous-builder-prompt">
        <div class="autonomous-builder-header">
          <h2>Autonomous Builder</h2>
          <p>Describe what you want to build, and I'll create it for you</p>
        </div>
        <div class="autonomous-builder-input-group">
          <textarea 
            id="autonomous-builder-prompt" 
            placeholder="Describe your project here... (e.g. 'Build a todo app with React, Firebase authentication, and dark mode support')"
            rows="3"
          ></textarea>
          <button id="autonomous-builder-start" class="autonomous-builder-button">
            <span class="autonomous-builder-button-text">Build It</span>
            <span class="autonomous-builder-button-icon">🚀</span>
          </button>
        </div>
      </div>
      
      <div id="autonomous-builder-progress" class="autonomous-builder-progress" style="display: none;">
        <div class="autonomous-builder-progress-header">
          <h3 id="autonomous-builder-progress-title">Building your project...</h3>
          <div class="autonomous-builder-progress-stats">
            <span id="autonomous-builder-current-step">0</span>
            <span>/</span>
            <span id="autonomous-builder-total-steps">0</span>
            <span>steps</span>
          </div>
        </div>
        
        <div class="autonomous-builder-progress-bar-container">
          <div id="autonomous-builder-progress-bar" class="autonomous-builder-progress-bar"></div>
        </div>
        
        <div id="autonomous-builder-step-list" class="autonomous-builder-step-list"></div>
        
        <div id="autonomous-builder-output" class="autonomous-builder-output"></div>
      </div>
    `;
    
    // Insert at the top of build panel
    buildTab.insertBefore(container, buildTab.firstChild);
    
    // Store references to UI elements
    this.promptInput = document.getElementById('autonomous-builder-prompt');
    this.buildButton = document.getElementById('autonomous-builder-start');
    this.progressContainer = document.getElementById('autonomous-builder-progress');
    this.stepListElement = document.getElementById('autonomous-builder-step-list');
    this.outputElement = document.getElementById('autonomous-builder-output');
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Start build button
    if (this.buildButton) {
      this.buildButton.addEventListener('click', this.handleBuildClick);
    }
    
    // Prompt input enter key
    if (this.promptInput) {
      this.promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
          e.preventDefault();
          this.handleBuildClick();
        }
      });
    }
  }
  
  /**
   * Handle build button click
   */
  async handleBuildClick() {
    if (this.isBuilding) {
      // Already building - show toast message
      console.log('🚀 Autonomous Builder: Build already in progress');
      return;
    }
    
    const prompt = this.promptInput.value.trim();
    if (!prompt) {
      // Empty prompt - show error
      console.log('🚀 Autonomous Builder: Empty prompt');
      return;
    }
    
    // Start build process
    this.startBuild(prompt);
  }
  
  /**
   * Start the build process
   * @param {string} prompt - Project description prompt
   */
  async startBuild(prompt) {
    try {
      this.isBuilding = true;
      this.currentStepIndex = 0;
      this.buildPlan = [];
      
      // Show progress UI
      this.progressContainer.style.display = 'block';
      this.updateProgressUI(0, 100, 'Planning your project...');
      
      // Generate a unique build ID
      this.currentBuildId = `build_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Generate build plan
      this.buildPlan = await this.generateBuildPlan(prompt);
      this.totalSteps = this.buildPlan.length;
      
      // Update progress UI with total steps
      const progressTitle = document.getElementById('autonomous-builder-progress-title');
      const totalStepsElement = document.getElementById('autonomous-builder-total-steps');
      
      if (progressTitle) {
        progressTitle.textContent = `Building: ${this.buildPlan[0]?.projectName || 'Your project'}`;
      }
      
      if (totalStepsElement) {
        totalStepsElement.textContent = this.totalSteps;
      }
      
      // Render step list
      this.renderStepList();
      
      // Execute first step
      this.executeBuildStep();
    } catch (error) {
      console.error('🚀 Autonomous Builder: Error starting build', error);
      this.completeBuild(false, error.message);
    }
  }
  
  /**
   * Generate build plan from prompt
   * @param {string} prompt - Project description
   * @returns {Array} Build plan steps
   */
  async generateBuildPlan(prompt) {
    // This is a placeholder for the actual implementation
    // In a real implementation, this would use an AI model to generate a build plan
    
    console.log('🚀 Autonomous Builder: Generating build plan for prompt:', prompt);
    
    // For now, return a mock build plan
    // In the real implementation, this would be generated by an AI model
    return [
      {
        stepId: 'init',
        stepType: 'initialization',
        description: 'Initializing project',
        projectName: 'New Project',
        status: 'pending'
      },
      {
        stepId: 'research',
        stepType: 'research',
        description: 'Researching dependencies and best practices',
        status: 'pending'
      },
      {
        stepId: 'scaffold',
        stepType: 'file_operation',
        description: 'Creating project structure',
        status: 'pending'
      },
      {
        stepId: 'dependencies',
        stepType: 'package_manager',
        description: 'Installing dependencies',
        status: 'pending'
      },
      {
        stepId: 'codebase',
        stepType: 'code_generation',
        description: 'Writing application code',
        status: 'pending'
      },
      {
        stepId: 'test',
        stepType: 'testing',
        description: 'Writing tests',
        status: 'pending'
      },
      {
        stepId: 'documentation',
        stepType: 'documentation',
        description: 'Creating documentation',
        status: 'pending'
      },
      {
        stepId: 'preview',
        stepType: 'preview',
        description: 'Generating preview',
        status: 'pending'
      }
    ];
  }
  
  /**
   * Render the step list UI
   */
  renderStepList() {
    if (!this.stepListElement) return;
    
    this.stepListElement.innerHTML = this.buildPlan.map((step, index) => `
      <div class="autonomous-builder-step ${index === 0 ? 'active' : ''}" data-step-id="${step.stepId}">
        <div class="autonomous-builder-step-index">${index + 1}</div>
        <div class="autonomous-builder-step-content">
          <div class="autonomous-builder-step-title">${step.description}</div>
          <div class="autonomous-builder-step-status">${step.status}</div>
        </div>
      </div>
    `).join('');
  }
  
  /**
   * Execute the current build step
   */
  async executeBuildStep() {
    if (this.currentStepIndex >= this.buildPlan.length) {
      // Build complete
      this.completeBuild(true);
      return;
    }
    
    const step = this.buildPlan[this.currentStepIndex];
    console.log(`🚀 Autonomous Builder: Executing step ${this.currentStepIndex + 1}/${this.totalSteps}: ${step.description}`);
    
    try {
      // Update step status
      step.status = 'in_progress';
      this.updateStepUI(step.stepId, 'in_progress');
      
      // Update progress UI
      this.updateProgressUI(
        this.currentStepIndex, 
        this.totalSteps,
        step.description
      );
      
      // In a real implementation, this would execute the actual step logic
      // For now, just wait a bit to simulate work being done
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update step status
      step.status = 'completed';
      this.updateStepUI(step.stepId, 'completed');
      
      // Move to next step
      this.currentStepIndex++;
      if (this.currentStepIndex < this.buildPlan.length) {
        // Mark next step as active
        this.updateStepUI(this.buildPlan[this.currentStepIndex].stepId, 'active');
      }
      
      // Execute next step
      setTimeout(() => this.executeBuildStep(), 500);
    } catch (error) {
      console.error(`🚀 Autonomous Builder: Error executing step ${step.stepId}`, error);
      
      // Update step status
      step.status = 'failed';
      this.updateStepUI(step.stepId, 'failed', error.message);
      
      // Complete build with error
      this.completeBuild(false, error.message);
    }
  }
  
  /**
   * Update step UI
   * @param {string} stepId - Step ID
   * @param {string} status - Step status
   * @param {string} error - Error message (if any)
   */
  updateStepUI(stepId, status, error = '') {
    const stepElement = this.stepListElement.querySelector(`[data-step-id="${stepId}"]`);
    if (!stepElement) return;
    
    // Remove other status classes
    stepElement.classList.remove('active', 'in_progress', 'completed', 'failed');
    stepElement.classList.add(status);
    
    // Update status text
    const statusElement = stepElement.querySelector('.autonomous-builder-step-status');
    if (statusElement) {
      statusElement.textContent = status === 'in_progress' ? 'In progress...' : 
                                 status === 'completed' ? 'Completed' :
                                 status === 'failed' ? 'Failed' : status;
      
      if (error) {
        statusElement.textContent += `: ${error}`;
      }
    }
  }
  
  /**
   * Update progress UI
   * @param {number} current - Current step index
   * @param {number} total - Total steps
   * @param {string} message - Progress message
   */
  updateProgressUI(current, total, message) {
    // Update progress bar
    const progressBar = document.getElementById('autonomous-builder-progress-bar');
    if (progressBar) {
      const percentage = (current / total) * 100;
      progressBar.style.width = `${percentage}%`;
    }
    
    // Update step counter
    const currentStepElement = document.getElementById('autonomous-builder-current-step');
    if (currentStepElement) {
      currentStepElement.textContent = current;
    }
    
    // Log message to output
    this.logOutput(message);
  }
  
  /**
   * Log output to the output panel
   * @param {string} message - Output message
   */
  logOutput(message) {
    if (!this.outputElement) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const logItem = document.createElement('div');
    logItem.className = 'autonomous-builder-output-item';
    logItem.innerHTML = `
      <span class="autonomous-builder-output-timestamp">${timestamp}</span>
      <span class="autonomous-builder-output-message">${message}</span>
    `;
    
    this.outputElement.appendChild(logItem);
    this.outputElement.scrollTop = this.outputElement.scrollHeight;
  }
  
  /**
   * Complete the build process
   * @param {boolean} success - Whether the build was successful
   * @param {string} error - Error message (if any)
   */
  completeBuild(success, error = '') {
    this.isBuilding = false;
    
    // Log completion message
    if (success) {
      this.logOutput('✅ Build completed successfully!');
    } else {
      this.logOutput(`❌ Build failed: ${error}`);
    }
    
    // Update progress UI
    const progressTitle = document.getElementById('autonomous-builder-progress-title');
    if (progressTitle) {
      progressTitle.textContent = success ? 
        'Build completed successfully!' : 
        'Build failed';
    }
    
    // Add to build history
    this.buildHistory.push({
      buildId: this.currentBuildId,
      prompt: this.promptInput.value,
      timestamp: Date.now(),
      success,
      error,
      steps: this.buildPlan
    });
    
    // Enable build button
    if (this.buildButton) {
      this.buildButton.disabled = false;
    }
  }
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
  window.autonomousBuilder = new AutonomousBuilder();
});
