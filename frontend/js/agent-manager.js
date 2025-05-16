/**
 * Podplay Build Sanctuary - Agent Manager
 * 
 * Manages specialized AI agents for different tasks:
 * - Research Hound: Focused on information gathering and research
 * - Code Weasel: Specialized in code generation and debugging
 * - Each agent has their own personality, capabilities, and appearance
 * - Works with the model orchestrator to pick the right model
 * 
 * Created by Mama Bear 🐻💜
 */

class AgentManager {
  constructor() {
    this.isInitialized = false;
    this.activeAgent = 'mama-bear';
    this.agents = {
      'mama-bear': {
        name: 'Mama Bear',
        role: 'Primary AI Assistant',
        personality: 'Nurturing, supportive, and comprehensive',
        icon: '🐻💜',
        avatar: 'mama-bear-avatar.png',
        capabilities: ['conversation', 'coding', 'planning', 'research', 'vision'],
        accent: 'var(--primary-gradient)',
        isActive: true
      },
      'research-hound': {
        name: 'Research Hound',
        role: 'Information Specialist',
        personality: 'Curious, thorough, and detail-oriented',
        icon: '🐕📚',
        avatar: 'research-hound-avatar.png',
        capabilities: ['research', 'summarization', 'fact-checking', 'data-analysis'],
        accent: 'var(--research-gradient)',
        isActive: true
      },
      'code-weasel': {
        name: 'Code Weasel',
        role: 'Programming Expert',
        personality: 'Clever, efficient, and resourceful',
        icon: '🦡💻',
        avatar: 'code-weasel-avatar.png',
        capabilities: ['coding', 'debugging', 'optimization', 'code-review'],
        accent: 'var(--code-gradient)',
        isActive: true
      }
    };
    
    // Bind methods
    this.init = this.init.bind(this);
    this.switchAgent = this.switchAgent.bind(this);
    this.showAgentUI = this.showAgentUI.bind(this);
    this.isAgentActive = this.isAgentActive.bind(this);
    this.activateAgent = this.activateAgent.bind(this);
    this.createAgentSwitcher = this.createAgentSwitcher.bind(this);
    this.updateAgentStyles = this.updateAgentStyles.bind(this);
    
    // Initialize when document is loaded
    if (document.readyState === 'complete') {
      this.init();
    } else {
      document.addEventListener('DOMContentLoaded', this.init);
    }
  }
  
  /**
   * Initialize the agent manager
   */
  async init() {
    if (this.isInitialized) return;
    
    console.log('🦊 Agent Manager: Initializing');
    
    try {
      // Create custom CSS variables for agent themes
      this.updateAgentStyles();
      
      // Create agent switcher UI
      this.createAgentSwitcher();
      
      // Show active agent UI
      this.showAgentUI(this.activeAgent);
      
      this.isInitialized = true;
      console.log('🦊 Agent Manager: Initialized');
      
      // Dispatch ready event
      document.dispatchEvent(new CustomEvent('agent-manager:ready', {
        detail: { agentManager: this }
      }));
    } catch (error) {
      console.error('🦊 Agent Manager: Initialization error', error);
    }
  }
  
  /**
   * Update CSS with agent theme styles
   */
  updateAgentStyles() {
    // Create style element if it doesn't exist
    let styleEl = document.getElementById('agent-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'agent-styles';
      document.head.appendChild(styleEl);
    }
    
    // Define the CSS variables
    const css = `
      :root {
        /* Base color scheme */
        --primary-gradient: linear-gradient(135deg, #8b5cf6, #7c3aed);
        --research-gradient: linear-gradient(135deg, #3b82f6, #1d4ed8);
        --code-gradient: linear-gradient(135deg, #10b981, #059669);
        
        /* Agent-specific gradients */
        --mama-bear-gradient: linear-gradient(135deg, #8b5cf6, #7c3aed);
        --research-hound-gradient: linear-gradient(135deg, #3b82f6, #1d4ed8);
        --code-weasel-gradient: linear-gradient(135deg, #10b981, #059669);
        
        /* Agent message backgrounds */
        --agent-message-bg: #2d2b3a;
        --research-message-bg: #1e293b;
        --code-message-bg: #1e3a31;
        
        /* Neon effects */
        --neon-purple: 0 0 5px rgba(139, 92, 246, 0.5), 0 0 20px rgba(139, 92, 246, 0.3);
        --neon-blue: 0 0 5px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3);
        --neon-green: 0 0 5px rgba(16, 185, 129, 0.5), 0 0 20px rgba(16, 185, 129, 0.3);
      }
      
      /* Agent-specific theme classes */
      .theme-mama-bear {
        --agent-gradient: var(--mama-bear-gradient);
        --agent-shadow: var(--neon-purple);
      }
      
      .theme-research-hound {
        --agent-gradient: var(--research-hound-gradient);
        --agent-shadow: var(--neon-blue);
      }
      
      .theme-code-weasel {
        --agent-gradient: var(--code-weasel-gradient);
        --agent-shadow: var(--neon-green);
      }
      
      /* Agent message styling */
      .chat-message.agent-message.mama-bear-message {
        background-color: var(--agent-message-bg);
        border-left: 3px solid #8b5cf6;
      }
      
      .chat-message.agent-message.research-hound-message {
        background-color: var(--research-message-bg);
        border-left: 3px solid #3b82f6;
      }
      
      .chat-message.agent-message.code-weasel-message {
        background-color: var(--code-message-bg);
        border-left: 3px solid #10b981;
      }
      
      /* Agent avatar styling */
      .agent-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 8px;
        font-size: 16px;
      }
      
      .agent-avatar.mama-bear-avatar {
        background: var(--mama-bear-gradient);
        box-shadow: var(--neon-purple);
      }
      
      .agent-avatar.research-hound-avatar {
        background: var(--research-hound-gradient);
        box-shadow: var(--neon-blue);
      }
      
      .agent-avatar.code-weasel-avatar {
        background: var(--code-weasel-gradient);
        box-shadow: var(--neon-green);
      }
      
      /* Agent switcher styling */
      .agent-switcher {
        display: flex;
        padding: 8px;
        background: var(--surface-2);
        border-radius: 8px;
        margin-bottom: 12px;
      }
      
      .agent-option {
        flex: 1;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s ease;
        opacity: 0.7;
        position: relative;
      }
      
      .agent-option:hover {
        opacity: 0.9;
      }
      
      .agent-option.active {
        opacity: 1;
      }
      
      .agent-option.active::after {
        content: '';
        position: absolute;
        bottom: -4px;
        left: 25%;
        width: 50%;
        height: 2px;
        border-radius: 1px;
      }
      
      .agent-option.mama-bear-option.active::after {
        background: var(--mama-bear-gradient);
        box-shadow: var(--neon-purple);
      }
      
      .agent-option.research-hound-option.active::after {
        background: var(--research-hound-gradient);
        box-shadow: var(--neon-blue);
      }
      
      .agent-option.code-weasel-option.active::after {
        background: var(--code-weasel-gradient);
        box-shadow: var(--neon-green);
      }
      
      .agent-option-icon {
        font-size: 18px;
        display: block;
        margin-bottom: 4px;
      }
      
      .agent-option-name {
        font-size: 12px;
        font-weight: 500;
      }
      
      .agent-option.inactive {
        opacity: 0.3;
        cursor: not-allowed;
      }
      
      .agent-option.inactive::before {
        content: '⚠️';
        position: absolute;
        top: 2px;
        right: 2px;
        font-size: 10px;
      }
    `;
    
    // Update the style element
    styleEl.textContent = css;
  }
  
  /**
   * Create agent switcher UI
   */
  createAgentSwitcher() {
    // Find chat input container
    const chatInputContainer = document.querySelector('.chat-input-container');
    if (!chatInputContainer) {
      console.error('🦊 Agent Manager: Chat input container not found');
      return;
    }
    
    // Create agent switcher
    const agentSwitcher = document.createElement('div');
    agentSwitcher.className = 'agent-switcher';
    
    // Add agent options
    for (const [agentId, agent] of Object.entries(this.agents)) {
      const agentOption = document.createElement('div');
      agentOption.className = `agent-option ${agentId}-option ${agentId === this.activeAgent ? 'active' : ''} ${agent.isActive ? '' : 'inactive'}`;
      agentOption.dataset.agentId = agentId;
      
      agentOption.innerHTML = `
        <span class="agent-option-icon">${agent.icon}</span>
        <span class="agent-option-name">${agent.name}</span>
      `;
      
      // Add click event
      if (agent.isActive) {
        agentOption.addEventListener('click', () => {
          this.switchAgent(agentId);
        });
      } else {
        agentOption.title = `${agent.name} is currently inactive`;
      }
      
      agentSwitcher.appendChild(agentOption);
    }
    
    // Insert before chat input
    chatInputContainer.insertBefore(agentSwitcher, chatInputContainer.firstChild);
  }
  
  /**
   * Switch to a different agent
   * @param {string} agentId - Agent ID
   */
  switchAgent(agentId) {
    // Check if agent exists and is active
    if (!this.agents[agentId] || !this.agents[agentId].isActive) {
      console.error(`🦊 Agent Manager: Agent ${agentId} not found or inactive`);
      return;
    }
    
    console.log(`🦊 Agent Manager: Switching to ${agentId}`);
    
    // Update active agent
    this.activeAgent = agentId;
    
    // Update UI
    const agentOptions = document.querySelectorAll('.agent-option');
    agentOptions.forEach(option => {
      if (option.dataset.agentId === agentId) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
    
    // Update agent UI
    this.showAgentUI(agentId);
    
    // Apply theme
    document.body.className = document.body.className.replace(/theme-[a-z-]+/g, '');
    document.body.classList.add(`theme-${agentId}`);
    
    // Dispatch agent change event
    document.dispatchEvent(new CustomEvent('agent-manager:agent-changed', {
      detail: { 
        agentId, 
        agent: this.agents[agentId] 
      }
    }));
  }
  
  /**
   * Show agent-specific UI elements
   * @param {string} agentId - Agent ID
   */
  showAgentUI(agentId) {
    const agent = this.agents[agentId];
    if (!agent) return;
    
    // Update chat input placeholder
    const chatInput = document.querySelector('.chat-input textarea');
    if (chatInput) {
      chatInput.placeholder = `Ask ${agent.name} anything...`;
    }
    
    // Update welcome message if empty chat
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages && chatMessages.childElementCount === 0) {
      const welcomeMsg = document.createElement('div');
      welcomeMsg.className = `chat-message agent-message ${agentId}-message`;
      welcomeMsg.innerHTML = `
        <div class="agent-avatar ${agentId}-avatar">${agent.icon}</div>
        <div class="content">
          <div class="agent-name">${agent.name}</div>
          <p>Hello! I'm ${agent.name}, your ${agent.role.toLowerCase()}. ${this.getAgentIntro(agentId)}</p>
        </div>
        <div class="timestamp">${new Date().toLocaleTimeString()}</div>
      `;
      
      chatMessages.appendChild(welcomeMsg);
    }
  }
  
  /**
   * Get introductory message for an agent
   * @param {string} agentId - Agent ID
   * @returns {string} Intro message
   */
  getAgentIntro(agentId) {
    switch (agentId) {
      case 'mama-bear':
        return "I'm here to help with anything you need in your Podplay Build sanctuary.";
      case 'research-hound':
        return "I can help you find and analyze information, do research, and synthesize data from various sources.";
      case 'code-weasel':
        return "I specialize in writing, debugging, and optimizing code. Let me handle all your programming needs.";
      default:
        return "How can I assist you today?";
    }
  }
  
  /**
   * Check if an agent is active
   * @param {string} agentId - Agent ID
   * @returns {boolean} True if agent is active
   */
  isAgentActive(agentId) {
    return this.agents[agentId]?.isActive || false;
  }
  
  /**
   * Activate an agent
   * @param {string} agentId - Agent ID
   * @param {boolean} activate - Whether to activate or deactivate
   */
  activateAgent(agentId, activate = true) {
    // Check if agent exists
    if (!this.agents[agentId]) {
      console.error(`🦊 Agent Manager: Agent ${agentId} not found`);
      return;
    }
    
    // Update agent status
    this.agents[agentId].isActive = activate;
    console.log(`🦊 Agent Manager: ${activate ? 'Activated' : 'Deactivated'} ${agentId}`);
    
    // Update UI
    const agentOption = document.querySelector(`.agent-option.${agentId}-option`);
    if (agentOption) {
      if (activate) {
        agentOption.classList.remove('inactive');
        agentOption.removeAttribute('title');
        
        // Add click event
        agentOption.addEventListener('click', () => {
          this.switchAgent(agentId);
        });
      } else {
        agentOption.classList.add('inactive');
        agentOption.title = `${this.agents[agentId].name} is currently inactive`;
        
        // Remove click event by cloning and replacing
        const newOption = agentOption.cloneNode(true);
        agentOption.parentNode.replaceChild(newOption, agentOption);
      }
    }
    
    // Dispatch agent status change event
    document.dispatchEvent(new CustomEvent('agent-manager:agent-status-changed', {
      detail: { 
        agentId, 
        isActive: activate
      }
    }));
  }
  
  /**
   * Get current agent info
   * @returns {Object} Current agent info
   */
  getCurrentAgent() {
    return {
      id: this.activeAgent,
      ...this.agents[this.activeAgent]
    };
  }
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
  window.agentManager = new AgentManager();
});
