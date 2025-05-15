/**
 * MCP Dashboard Component
 * 
 * A unified dashboard for managing all MCP servers (native and Docker-based)
 * in the Podplay Build sanctuary.
 */

import mcpToolkitManager from './mcp-toolkit-manager.js';
import dockerMCPManager from './docker-mcp-manager.js';

class MCPDashboard {
  constructor() {
    this.isInitialized = false;
    this.dashboardContainer = null;
    this.nativeServersContainer = null;
    this.dockerServersContainer = null;
    this.toolCallSection = null;
    
    // Initialize when document is ready
    if (document.readyState === 'complete') {
      this.initialize();
    } else {
      window.addEventListener('load', () => this.initialize());
    }
  }
  
  /**
   * Initialize the dashboard
   */
  initialize() {
    if (this.isInitialized) return;
    
    // Create dashboard container if it doesn't exist
    this.createDashboardElement();
    
    // Set up event listeners for MCP status changes
    mcpToolkitManager.addEventListener('status-change', () => this.updateNativeServersView());
    dockerMCPManager.addEventListener('status-change', () => this.updateDockerServersView());
    
    // Initial update
    this.updateNativeServersView();
    this.updateDockerServersView();
    
    // Add toggle button to sidebar
    this.addToggleButton();
    
    this.isInitialized = true;
    console.log('MCP Dashboard initialized');
  }
  
  /**
   * Create the dashboard DOM elements
   */
  createDashboardElement() {
    // Check if dashboard already exists
    let existingDashboard = document.getElementById('mcp-dashboard');
    if (existingDashboard) {
      this.dashboardContainer = existingDashboard;
      return;
    }
    
    // Create dashboard container
    this.dashboardContainer = document.createElement('div');
    this.dashboardContainer.id = 'mcp-dashboard';
    this.dashboardContainer.classList.add('mcp-dashboard', 'hidden');
    
    // Style the dashboard
    this.dashboardContainer.style.position = 'fixed';
    this.dashboardContainer.style.right = '0';
    this.dashboardContainer.style.top = '60px';
    this.dashboardContainer.style.bottom = '0';
    this.dashboardContainer.style.width = '320px';
    this.dashboardContainer.style.backgroundColor = '#1e1e2e';
    this.dashboardContainer.style.color = '#cdd6f4';
    this.dashboardContainer.style.padding = '1rem';
    this.dashboardContainer.style.overflow = 'auto';
    this.dashboardContainer.style.zIndex = '100';
    this.dashboardContainer.style.boxShadow = '-5px 0 15px rgba(0, 0, 0, 0.2)';
    this.dashboardContainer.style.transition = 'transform 0.3s ease-in-out';
    this.dashboardContainer.style.transform = 'translateX(320px)';
    
    // Create dashboard header
    const header = document.createElement('div');
    header.classList.add('dashboard-header');
    header.style.borderBottom = '1px solid #313244';
    header.style.paddingBottom = '10px';
    header.style.marginBottom = '15px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    
    const title = document.createElement('h2');
    title.textContent = 'MCP Sanctuary';
    title.style.margin = '0';
    title.style.fontSize = '1.2rem';
    title.style.fontWeight = 'bold';
    title.style.color = '#89b4fa';
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = '#cdd6f4';
    closeButton.style.fontSize = '1.5rem';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '0 8px';
    closeButton.title = 'Close MCP Dashboard';
    closeButton.addEventListener('click', () => this.toggleDashboard());
    
    header.appendChild(title);
    header.appendChild(closeButton);
    this.dashboardContainer.appendChild(header);
    
    // Create section for Native MCP Servers
    const nativeSection = document.createElement('div');
    nativeSection.classList.add('dashboard-section');
    nativeSection.style.marginBottom = '20px';
    
    const nativeTitle = document.createElement('h3');
    nativeTitle.textContent = 'Native MCP Servers';
    nativeTitle.style.fontSize = '1rem';
    nativeTitle.style.color = '#a6e3a1';
    nativeTitle.style.marginBottom = '10px';
    
    this.nativeServersContainer = document.createElement('div');
    this.nativeServersContainer.classList.add('servers-container');
    
    const nativeActions = document.createElement('div');
    nativeActions.classList.add('section-actions');
    nativeActions.style.display = 'flex';
    nativeActions.style.gap = '5px';
    nativeActions.style.marginTop = '10px';
    
    const startAllNativeBtn = document.createElement('button');
    startAllNativeBtn.textContent = 'Start All';
    startAllNativeBtn.classList.add('action-button');
    startAllNativeBtn.style.backgroundColor = '#a6e3a1';
    startAllNativeBtn.style.color = '#1e1e2e';
    startAllNativeBtn.style.padding = '5px 10px';
    startAllNativeBtn.style.border = 'none';
    startAllNativeBtn.style.borderRadius = '4px';
    startAllNativeBtn.style.cursor = 'pointer';
    startAllNativeBtn.style.flex = '1';
    startAllNativeBtn.addEventListener('click', () => this.startAllNativeServers());
    
    const stopAllNativeBtn = document.createElement('button');
    stopAllNativeBtn.textContent = 'Stop All';
    stopAllNativeBtn.classList.add('action-button');
    stopAllNativeBtn.style.backgroundColor = '#f38ba8';
    stopAllNativeBtn.style.color = '#1e1e2e';
    stopAllNativeBtn.style.padding = '5px 10px';
    stopAllNativeBtn.style.border = 'none';
    stopAllNativeBtn.style.borderRadius = '4px';
    stopAllNativeBtn.style.cursor = 'pointer';
    stopAllNativeBtn.style.flex = '1';
    stopAllNativeBtn.addEventListener('click', () => this.stopAllNativeServers());
    
    nativeActions.appendChild(startAllNativeBtn);
    nativeActions.appendChild(stopAllNativeBtn);
    
    nativeSection.appendChild(nativeTitle);
    nativeSection.appendChild(this.nativeServersContainer);
    nativeSection.appendChild(nativeActions);
    this.dashboardContainer.appendChild(nativeSection);
    
    // Create section for Docker MCP Servers
    const dockerSection = document.createElement('div');
    dockerSection.classList.add('dashboard-section');
    dockerSection.style.marginBottom = '20px';
    
    const dockerTitle = document.createElement('h3');
    dockerTitle.textContent = 'Docker MCP Servers';
    dockerTitle.style.fontSize = '1rem';
    dockerTitle.style.color = '#89b4fa';
    dockerTitle.style.marginBottom = '10px';
    
    this.dockerServersContainer = document.createElement('div');
    this.dockerServersContainer.classList.add('servers-container');
    
    dockerSection.appendChild(dockerTitle);
    dockerSection.appendChild(this.dockerServersContainer);
    this.dashboardContainer.appendChild(dockerSection);
    
    // Create Tool Call Section
    const toolCallSection = document.createElement('div');
    toolCallSection.classList.add('dashboard-section');
    toolCallSection.style.marginTop = '20px';
    toolCallSection.style.borderTop = '1px solid #313244';
    toolCallSection.style.paddingTop = '15px';
    
    const toolCallTitle = document.createElement('h3');
    toolCallTitle.textContent = 'MCP Tool Caller';
    toolCallTitle.style.fontSize = '1rem';
    toolCallTitle.style.color = '#fab387';
    toolCallTitle.style.marginBottom = '10px';
    
    const toolCallForm = document.createElement('div');
    toolCallForm.classList.add('tool-call-form');
    toolCallForm.style.display = 'flex';
    toolCallForm.style.flexDirection = 'column';
    toolCallForm.style.gap = '8px';
    
    // Server selector
    const serverSelectContainer = document.createElement('div');
    serverSelectContainer.style.display = 'flex';
    serverSelectContainer.style.alignItems = 'center';
    serverSelectContainer.style.gap = '5px';
    
    const serverSelectLabel = document.createElement('label');
    serverSelectLabel.textContent = 'Server:';
    serverSelectLabel.style.width = '80px';
    serverSelectLabel.style.display = 'inline-block';
    
    const serverSelect = document.createElement('select');
    serverSelect.id = 'mcp-server-select';
    serverSelect.style.flex = '1';
    serverSelect.style.padding = '5px';
    serverSelect.style.backgroundColor = '#313244';
    serverSelect.style.color = '#cdd6f4';
    serverSelect.style.border = '1px solid #45475a';
    serverSelect.style.borderRadius = '4px';
    
    serverSelectContainer.appendChild(serverSelectLabel);
    serverSelectContainer.appendChild(serverSelect);
    
    // Tool selector
    const toolSelectContainer = document.createElement('div');
    toolSelectContainer.style.display = 'flex';
    toolSelectContainer.style.alignItems = 'center';
    toolSelectContainer.style.gap = '5px';
    
    const toolSelectLabel = document.createElement('label');
    toolSelectLabel.textContent = 'Tool:';
    toolSelectLabel.style.width = '80px';
    toolSelectLabel.style.display = 'inline-block';
    
    const toolInput = document.createElement('input');
    toolInput.id = 'mcp-tool-input';
    toolInput.type = 'text';
    toolInput.placeholder = 'Tool name...';
    toolInput.style.flex = '1';
    toolInput.style.padding = '5px';
    toolInput.style.backgroundColor = '#313244';
    toolInput.style.color = '#cdd6f4';
    toolInput.style.border = '1px solid #45475a';
    toolInput.style.borderRadius = '4px';
    
    toolSelectContainer.appendChild(toolSelectLabel);
    toolSelectContainer.appendChild(toolInput);
    
    // Parameters input
    const paramsContainer = document.createElement('div');
    paramsContainer.style.display = 'flex';
    paramsContainer.style.flexDirection = 'column';
    paramsContainer.style.gap = '5px';
    
    const paramsLabel = document.createElement('label');
    paramsLabel.textContent = 'Parameters (JSON):';
    paramsLabel.style.display = 'block';
    
    const paramsTextarea = document.createElement('textarea');
    paramsTextarea.id = 'mcp-params-input';
    paramsTextarea.rows = '5';
    paramsTextarea.placeholder = '{\n  "key": "value"\n}';
    paramsTextarea.style.width = '100%';
    paramsTextarea.style.padding = '5px';
    paramsTextarea.style.backgroundColor = '#313244';
    paramsTextarea.style.color = '#cdd6f4';
    paramsTextarea.style.border = '1px solid #45475a';
    paramsTextarea.style.borderRadius = '4px';
    paramsTextarea.style.fontFamily = 'monospace';
    
    paramsContainer.appendChild(paramsLabel);
    paramsContainer.appendChild(paramsTextarea);
    
    // Call button
    const callButton = document.createElement('button');
    callButton.textContent = 'Call Tool';
    callButton.classList.add('action-button');
    callButton.style.backgroundColor = '#cba6f7';
    callButton.style.color = '#1e1e2e';
    callButton.style.padding = '8px';
    callButton.style.border = 'none';
    callButton.style.borderRadius = '4px';
    callButton.style.cursor = 'pointer';
    callButton.style.marginTop = '5px';
    callButton.addEventListener('click', () => this.callSelectedTool());
    
    // Result display
    const resultContainer = document.createElement('div');
    resultContainer.style.marginTop = '10px';
    
    const resultLabel = document.createElement('label');
    resultLabel.textContent = 'Result:';
    resultLabel.style.display = 'block';
    resultLabel.style.marginBottom = '5px';
    
    const resultOutput = document.createElement('pre');
    resultOutput.id = 'mcp-result-output';
    resultOutput.style.width = '100%';
    resultOutput.style.padding = '8px';
    resultOutput.style.backgroundColor = '#313244';
    resultOutput.style.color = '#cdd6f4';
    resultOutput.style.border = '1px solid #45475a';
    resultOutput.style.borderRadius = '4px';
    resultOutput.style.fontFamily = 'monospace';
    resultOutput.style.whiteSpace = 'pre-wrap';
    resultOutput.style.maxHeight = '150px';
    resultOutput.style.overflow = 'auto';
    resultOutput.style.fontSize = '0.8rem';
    
    resultContainer.appendChild(resultLabel);
    resultContainer.appendChild(resultOutput);
    
    toolCallForm.appendChild(serverSelectContainer);
    toolCallForm.appendChild(toolSelectContainer);
    toolCallForm.appendChild(paramsContainer);
    toolCallForm.appendChild(callButton);
    
    toolCallSection.appendChild(toolCallTitle);
    toolCallSection.appendChild(toolCallForm);
    toolCallSection.appendChild(resultContainer);
    
    this.toolCallSection = toolCallSection;
    this.dashboardContainer.appendChild(toolCallSection);
    
    // Add dashboard to body
    document.body.appendChild(this.dashboardContainer);
  }
  
  /**
   * Add toggle button to sidebar
   */
  addToggleButton() {
    // Check if button already exists
    let existingButton = document.getElementById('toggle-mcp-dashboard');
    if (existingButton) return;
    
    // Find sidebar or create button container
    let sidebar = document.querySelector('.sidebar');
    let buttonContainer;
    
    if (sidebar) {
      buttonContainer = document.createElement('div');
      buttonContainer.style.padding = '10px';
      buttonContainer.style.textAlign = 'center';
      sidebar.appendChild(buttonContainer);
    } else {
      // If no sidebar, create floating button
      buttonContainer = document.createElement('div');
      buttonContainer.style.position = 'fixed';
      buttonContainer.style.top = '70px';
      buttonContainer.style.right = '10px';
      buttonContainer.style.zIndex = '101';
      document.body.appendChild(buttonContainer);
    }
    
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'toggle-mcp-dashboard';
    toggleButton.innerHTML = '<span style="font-size: 1.2em;">🌐</span> MCP';
    toggleButton.title = 'Toggle MCP Dashboard';
    toggleButton.style.backgroundColor = '#89b4fa';
    toggleButton.style.color = '#1e1e2e';
    toggleButton.style.padding = '6px 12px';
    toggleButton.style.border = 'none';
    toggleButton.style.borderRadius = '4px';
    toggleButton.style.cursor = 'pointer';
    toggleButton.style.fontWeight = 'bold';
    toggleButton.addEventListener('click', () => this.toggleDashboard());
    
    buttonContainer.appendChild(toggleButton);
  }
  
  /**
   * Toggle dashboard visibility
   */
  toggleDashboard() {
    if (this.dashboardContainer.classList.contains('hidden')) {
      this.dashboardContainer.classList.remove('hidden');
      this.dashboardContainer.style.transform = 'translateX(0)';
      
      // Refresh data when showing
      this.updateNativeServersView();
      this.updateDockerServersView();
      this.updateServerSelector();
    } else {
      this.dashboardContainer.classList.add('hidden');
      this.dashboardContainer.style.transform = 'translateX(320px)';
    }
  }
  
  /**
   * Update the native servers view
   */
  async updateNativeServersView() {
    const serverStatus = await mcpToolkitManager.refreshStatus();
    this.nativeServersContainer.innerHTML = '';
    
    const serverNames = mcpToolkitManager.getAvailableServers();
    
    if (serverNames.length === 0) {
      const message = document.createElement('p');
      message.textContent = 'No native MCP servers available.';
      message.style.fontStyle = 'italic';
      message.style.color = '#7f849c';
      message.style.margin = '10px 0';
      this.nativeServersContainer.appendChild(message);
      return;
    }
    
    serverNames.forEach(serverName => {
      const serverStatus = mcpToolkitManager.getServerStatus(serverName);
      const isRunning = serverStatus?.running || false;
      
      const serverItem = document.createElement('div');
      serverItem.classList.add('server-item');
      serverItem.style.display = 'flex';
      serverItem.style.justifyContent = 'space-between';
      serverItem.style.alignItems = 'center';
      serverItem.style.padding = '8px';
      serverItem.style.margin = '5px 0';
      serverItem.style.backgroundColor = '#313244';
      serverItem.style.borderRadius = '4px';
      
      const serverInfo = document.createElement('div');
      serverInfo.style.flex = '1';
      
      const nameElement = document.createElement('div');
      nameElement.textContent = serverName;
      nameElement.style.fontWeight = 'bold';
      
      const statusElement = document.createElement('div');
      statusElement.textContent = isRunning ? 'Running' : 'Stopped';
      statusElement.style.fontSize = '0.8rem';
      statusElement.style.color = isRunning ? '#a6e3a1' : '#f38ba8';
      
      serverInfo.appendChild(nameElement);
      serverInfo.appendChild(statusElement);
      
      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '5px';
      
      const toggleButton = document.createElement('button');
      toggleButton.textContent = isRunning ? 'Stop' : 'Start';
      toggleButton.style.backgroundColor = isRunning ? '#f38ba8' : '#a6e3a1';
      toggleButton.style.color = '#1e1e2e';
      toggleButton.style.padding = '3px 8px';
      toggleButton.style.border = 'none';
      toggleButton.style.borderRadius = '4px';
      toggleButton.style.cursor = 'pointer';
      toggleButton.style.fontSize = '0.8rem';
      
      toggleButton.addEventListener('click', () => {
        if (isRunning) {
          mcpToolkitManager.stopServer(serverName)
            .then(() => this.updateNativeServersView());
        } else {
          mcpToolkitManager.startServer(serverName)
            .then(() => this.updateNativeServersView());
        }
      });
      
      actions.appendChild(toggleButton);
      
      serverItem.appendChild(serverInfo);
      serverItem.appendChild(actions);
      
      this.nativeServersContainer.appendChild(serverItem);
    });
    
    // Update the server selector
    this.updateServerSelector();
  }
  
  /**
   * Update the Docker servers view
   */
  async updateDockerServersView() {
    const dockerServers = await dockerMCPManager.refreshStatus();
    this.dockerServersContainer.innerHTML = '';
    
    if (dockerServers.length === 0) {
      const message = document.createElement('p');
      message.textContent = 'No Docker MCP servers available.';
      message.style.fontStyle = 'italic';
      message.style.color = '#7f849c';
      message.style.margin = '10px 0';
      this.dockerServersContainer.appendChild(message);
      return;
    }
    
    dockerServers.forEach(server => {
      const isActive = dockerMCPManager.isServerActive(server.name);
      
      const serverItem = document.createElement('div');
      serverItem.classList.add('server-item');
      serverItem.style.display = 'flex';
      serverItem.style.justifyContent = 'space-between';
      serverItem.style.alignItems = 'center';
      serverItem.style.padding = '8px';
      serverItem.style.margin = '5px 0';
      serverItem.style.backgroundColor = '#313244';
      serverItem.style.borderRadius = '4px';
      
      const serverInfo = document.createElement('div');
      serverInfo.style.flex = '1';
      
      const nameElement = document.createElement('div');
      nameElement.textContent = server.name;
      nameElement.style.fontWeight = 'bold';
      
      const imageElement = document.createElement('div');
      imageElement.textContent = server.image;
      imageElement.style.fontSize = '0.75rem';
      imageElement.style.color = '#bac2de';
      
      const statusElement = document.createElement('div');
      statusElement.textContent = isActive ? 'Active' : 'Inactive';
      statusElement.style.fontSize = '0.8rem';
      statusElement.style.color = isActive ? '#89b4fa' : '#7f849c';
      
      serverInfo.appendChild(nameElement);
      serverInfo.appendChild(imageElement);
      serverInfo.appendChild(statusElement);
      
      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '5px';
      
      // Create a unique ID for this button for debugging
      const buttonId = `docker-mcp-${server.name}-${isActive ? 'stop' : 'start'}-btn`;
      
      // Create a more robust button with clear styling
      const actionButton = document.createElement('button');
      actionButton.id = buttonId;
      actionButton.textContent = isActive ? 'Stop' : 'Start';
      actionButton.style.backgroundColor = isActive ? '#f38ba8' : '#89b4fa';
      actionButton.style.color = '#1e1e2e';
      actionButton.style.padding = '3px 8px';
      actionButton.style.border = 'none';
      actionButton.style.borderRadius = '4px';
      actionButton.style.cursor = 'pointer';
      actionButton.style.fontSize = '0.8rem';
      actionButton.style.minWidth = '60px';
      
      // Log the button creation for debugging
      console.log(`Creating Docker MCP button: ${buttonId} (${server.name} - ${isActive ? 'Stop' : 'Start'})`);
      
      // Use a more robust event handler
      actionButton.onclick = (e) => {
        e.preventDefault();
        console.log(`Docker MCP button clicked: ${buttonId}`);
        
        if (isActive) {
          console.log(`Stopping Docker MCP server: ${server.name}`);
          dockerMCPManager.stopServer(server.name)
            .then(result => {
              console.log(`Stop result for ${server.name}:`, result);
              this.updateDockerServersView();
            })
            .catch(err => {
              console.error(`Error stopping Docker MCP server ${server.name}:`, err);
            });
        } else {
          console.log(`Starting Docker MCP server: ${server.name}`);
          dockerMCPManager.startServer(server.name)
            .then(result => {
              console.log(`Start result for ${server.name}:`, result);
              this.updateDockerServersView();
            })
            .catch(err => {
              console.error(`Error starting Docker MCP server ${server.name}:`, err);
            });
        }
        return false;
      };
      
      actions.appendChild(actionButton);
      
      serverItem.appendChild(serverInfo);
      serverItem.appendChild(actions);
      
      this.dockerServersContainer.appendChild(serverItem);
    });
    
    // Update the server selector
    this.updateServerSelector();
  }
  
  /**
   * Update the server selector in the tool call section
   */
  updateServerSelector() {
    const serverSelect = document.getElementById('mcp-server-select');
    if (!serverSelect) return;
    
    // Save current selection
    const currentSelection = serverSelect.value;
    
    // Clear options
    serverSelect.innerHTML = '';
    
    // Add separator and label
    const addSeparator = (text) => {
      const option = document.createElement('option');
      option.disabled = true;
      option.textContent = `--- ${text} ---`;
      serverSelect.appendChild(option);
    };
    
    // Add native servers
    const nativeServers = mcpToolkitManager.getAvailableServers();
    if (nativeServers.length > 0) {
      addSeparator('Native MCP Servers');
      nativeServers.forEach(serverName => {
        const option = document.createElement('option');
        option.value = `native:${serverName}`;
        option.textContent = serverName;
        serverSelect.appendChild(option);
      });
    }
    
    // Add Docker servers
    const dockerServers = dockerMCPManager.getAvailableServers();
    if (dockerServers.length > 0) {
      addSeparator('Docker MCP Servers');
      dockerServers.forEach(server => {
        const option = document.createElement('option');
        option.value = `docker:${server.name}`;
        option.textContent = server.name;
        serverSelect.appendChild(option);
      });
    }
    
    // Restore selection if possible
    if (currentSelection && Array.from(serverSelect.options).some(opt => opt.value === currentSelection)) {
      serverSelect.value = currentSelection;
    }
  }
  
  /**
   * Start all native MCP servers
   */
  async startAllNativeServers() {
    const result = await mcpToolkitManager.startAllServers();
    
    // Update view
    this.updateNativeServersView();
    
    return result;
  }
  
  /**
   * Stop all native MCP servers
   */
  async stopAllNativeServers() {
    const result = await mcpToolkitManager.stopAllServers();
    
    // Update view
    this.updateNativeServersView();
    
    return result;
  }
  
  /**
   * Call the selected tool
   */
  async callSelectedTool() {
    const serverSelect = document.getElementById('mcp-server-select');
    const toolInput = document.getElementById('mcp-tool-input');
    const paramsInput = document.getElementById('mcp-params-input');
    const resultOutput = document.getElementById('mcp-result-output');
    
    if (!serverSelect || !toolInput || !paramsInput || !resultOutput) return;
    
    const serverSelection = serverSelect.value;
    const toolName = toolInput.value.trim();
    
    // Parse parameters
    let params = {};
    try {
      if (paramsInput.value.trim()) {
        params = JSON.parse(paramsInput.value);
      }
    } catch (error) {
      resultOutput.textContent = `Error parsing parameters: ${error.message}`;
      resultOutput.style.color = '#f38ba8';
      return;
    }
    
    // Clear previous result
    resultOutput.textContent = 'Calling tool...';
    resultOutput.style.color = '#cdd6f4';
    
    try {
      let result;
      
      if (serverSelection.startsWith('native:')) {
        const serverName = serverSelection.substring(7);
        result = await mcpToolkitManager.callTool(serverName, toolName, params);
      } else if (serverSelection.startsWith('docker:')) {
        const serverName = serverSelection.substring(7);
        result = await dockerMCPManager.sendQuery(serverName, toolName, params);
      } else {
        throw new Error('Invalid server selection');
      }
      
      // Display result
      resultOutput.textContent = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      resultOutput.style.color = '#cdd6f4';
    } catch (error) {
      resultOutput.textContent = `Error calling tool: ${error.message}`;
      resultOutput.style.color = '#f38ba8';
    }
  }
}

// Create and initialize dashboard
const mcpDashboard = new MCPDashboard();

// Ensure dashboard is available globally
window.mcpDashboard = mcpDashboard;

// Make sure we initialize everything
document.addEventListener('DOMContentLoaded', () => {
  console.log('MCP Dashboard: DOM loaded, initializing dashboard');
  if (mcpDashboard && !mcpDashboard.isInitialized) {
    mcpDashboard.initialize();
  }
  
  // Add a debug message to confirm dashboard is ready
  console.log('MCP Dashboard is ready to use');
});

export default mcpDashboard;