/**
 * Podplay Build Sanctuary - Interface Fix
 * 
 * This script fixes UI navigation issues:
 * - Properly activates tab buttons
 * - Shows/hides corresponding panels
 * - Fixes Build Mode integration
 * 
 * Created by Mama Bear 🐻💜
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('🧩 Interface Fix: Initializing...');

  // Get tab elements
  const tabButtons = {
    build: document.getElementById('build-btn'),
    chat: document.getElementById('chat-btn'),
    terminal: document.getElementById('terminal-btn'),
    debug: document.getElementById('debug-btn'),
    research: document.getElementById('research-btn'),
    buildMode: document.getElementById('btn-build-mode')
  };
  
  // Ensure Build Mode button exists
  if (!tabButtons.buildMode) {
    const buildModeBtn = document.createElement('button');
    buildModeBtn.id = 'btn-build-mode';
    buildModeBtn.className = 'tool-btn';
    buildModeBtn.innerHTML = '<i class="material-icons">build</i> Build Mode';
    
    // Add to toolbar
    const toolbar = document.querySelector('.flex.space-x-2');
    if (toolbar) {
      toolbar.appendChild(buildModeBtn);
      tabButtons.buildMode = buildModeBtn;
    }
  }
  
  // Create panel containers if they don't exist
  ensurePanels();
  
  // Add event listeners for tabs
  Object.keys(tabButtons).forEach(tabName => {
    const button = tabButtons[tabName];
    if (button) {
      button.addEventListener('click', function() {
        if (tabName === 'buildMode') {
          // Build Mode is special - handled by build-mode.js
          if (window.buildMode) {
            window.buildMode.toggleBuildMode();
          } else {
            console.error('Build Mode not initialized');
          }
        } else {
          // Regular tabs
          activateTab(tabName);
        }
      });
    }
  });
  
  // Activate build tab by default
  activateTab('build');
  
  /**
   * Make sure all panel containers exist
   */
  function ensurePanels() {
    const contentContainer = document.querySelector('.flex-1.flex.overflow-hidden');
    if (!contentContainer) return;
    
    // Get existing panels
    const existingPanels = {
      build: document.getElementById('build-panel'),
      chat: document.getElementById('chat-panel'),
      terminal: document.getElementById('terminal-panel'),
      debug: document.getElementById('debug-panel'),
      research: document.getElementById('research-panel')
    };
    
    // Create missing panels
    if (!existingPanels.build) {
      const buildPanel = document.createElement('div');
      buildPanel.id = 'build-panel';
      buildPanel.className = 'flex-1 flex flex-col';
      buildPanel.innerHTML = '<div class="p-4"><h2 class="text-xl mb-4">Build Panel</h2><p>This is where you can manage your projects.</p></div>';
      contentContainer.appendChild(buildPanel);
    }
    
    if (!existingPanels.terminal) {
      const terminalPanel = document.createElement('div');
      terminalPanel.id = 'terminal-panel';
      terminalPanel.className = 'flex-1 flex flex-col';
      terminalPanel.style.display = 'none';
      terminalPanel.innerHTML = '<div id="terminal" class="flex-1 bg-black p-2 font-mono text-sm"></div>';
      contentContainer.appendChild(terminalPanel);
    }
    
    if (!existingPanels.debug) {
      const debugPanel = document.createElement('div');
      debugPanel.id = 'debug-panel';
      debugPanel.className = 'flex-1 flex flex-col';
      debugPanel.style.display = 'none';
      debugPanel.innerHTML = '<div class="flex-1 p-4"><h2 class="text-xl mb-4">Debug Console</h2><div id="debug-output" class="bg-gray-800 p-4 rounded overflow-auto h-full"><p>Debug information will appear here.</p></div></div>';
      contentContainer.appendChild(debugPanel);
    }
    
    if (!existingPanels.research) {
      const researchPanel = document.createElement('div');
      researchPanel.id = 'research-panel';
      researchPanel.className = 'flex-1 flex flex-col';
      researchPanel.style.display = 'none';
      researchPanel.innerHTML = '<div class="flex-1 p-4"><h2 class="text-xl mb-4">Research Tools</h2><div class="mb-4"><input type="text" id="research-input" class="w-full p-2 bg-gray-800 border border-gray-700 rounded" placeholder="Search for information..."><button id="research-search-btn" class="mt-2 px-4 py-2 bg-purple-600 text-white rounded">Search</button></div><div id="research-results" class="bg-gray-800 p-4 rounded overflow-auto flex-1 mt-4"><p>Research results will appear here.</p></div></div>';
      contentContainer.appendChild(researchPanel);
    }
  }
  
  /**
   * Activate a specific tab
   */
  function activateTab(tabName) {
    // Deactivate all buttons
    Object.keys(tabButtons).forEach(key => {
      const button = tabButtons[key];
      if (button) button.classList.remove('active');
    });
    
    // Activate current button
    if (tabButtons[tabName]) {
      tabButtons[tabName].classList.add('active');
    }
    
    // Hide all panels
    const panels = ['build-panel', 'chat-panel', 'terminal-panel', 'debug-panel', 'research-panel'];
    panels.forEach(panelId => {
      const panel = document.getElementById(panelId);
      if (panel) panel.style.display = 'none';
    });
    
    // Show current panel
    const panelId = tabName + '-panel';
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.style.display = 'flex';
      
      // Special case for terminal panel - initialize terminal
      if (tabName === 'terminal' && window.terminal && typeof window.terminal.fit === 'function') {
        window.terminal.fit();
      }
    }
    
    console.log(`🧩 Interface Fix: Activated ${tabName} tab`);
  }
  
  // Initialize terminal if available
  const terminalElement = document.getElementById('terminal');
  if (terminalElement && window.xterm) {
    if (!window.terminal) {
      window.terminal = new window.xterm.Terminal({
        cursorBlink: true,
        theme: {
          background: '#0f172a',
          foreground: '#e2e8f0',
          cursor: '#8b5cf6'
        }
      });
      window.terminal.open(terminalElement);
      window.terminal.writeln('Podplay Build Terminal 🐻💜');
      window.terminal.writeln('Type commands to get started...');
    }
  }
  
  console.log('🧩 Interface Fix: Completed');
});
