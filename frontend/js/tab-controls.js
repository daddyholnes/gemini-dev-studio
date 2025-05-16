/**
 * Podplay Build Sanctuary - Tab Controls
 * 
 * Manages all the main navigation tabs including:
 * - Build 
 * - Chat
 * - Terminal
 * - Debug
 * - Research
 * 
 * Created by Mama Bear 🐻💜
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🧩 Tab Controls: Initializing');
    
    // Get tab buttons and content panels
    const buildBtn = document.getElementById('build-btn');
    const chatBtn = document.getElementById('chat-btn');
    const terminalBtn = document.getElementById('terminal-btn');
    const debugBtn = document.getElementById('debug-btn');
    const researchBtn = document.getElementById('research-btn');
    const memoryBtn = document.getElementById('memory-btn');
    const buildModeBtn = document.getElementById('btn-build-mode');
    
    const buildPanel = document.getElementById('build-panel');
    const chatPanel = document.getElementById('chat-panel');
    const terminalPanel = document.getElementById('terminal-panel');
    const debugPanel = document.getElementById('debug-panel');
    const researchPanel = document.getElementById('research-panel');
    const memoryPanel = document.getElementById('memory-panel');
    
    // Store all tabs and panels for easy reference
    const allTabs = [buildBtn, chatBtn, terminalBtn, debugBtn, researchBtn, memoryBtn].filter(tab => tab !== null);
    const allPanels = [buildPanel, chatPanel, terminalPanel, debugPanel, researchPanel, memoryPanel].filter(panel => panel !== null);
    
    // Initialize - show default tab (usually build panel)
    showPanel('build-panel');
    
    // Add event listeners for tab buttons
    allTabs.forEach(tab => {
        if (tab) {
            tab.addEventListener('click', function() {
                const panelId = tab.id.replace('-btn', '-panel');
                showPanel(panelId);
            });
        }
    });
    
    // Add event listener for Build Mode button
    if (buildModeBtn) {
        buildModeBtn.addEventListener('click', function() {
            console.log('Build Mode button clicked');
            
            // First show the build panel
            showPanel('build-panel');
            
            // Then activate build mode
            if (window.buildMode) {
                if (typeof window.buildMode.activate === 'function') {
                    window.buildMode.activate();
                } else if (typeof window.buildMode.toggleBuildMode === 'function') {
                    window.buildMode.toggleBuildMode();
                }
            } else {
                console.error('Build Mode not initialized');
            }
        });
    }
    
    /**
     * Show the specific panel and hide others
     * @param {string} panelId - ID of panel to show
     */
    function showPanel(panelId) {
        console.log(`🧩 Showing panel: ${panelId}`);
        
        // Hide all panels
        allPanels.forEach(panel => {
            if (panel) {
                panel.style.display = 'none';
            }
        });
        
        // Remove active class from all tabs
        allTabs.forEach(tab => {
            if (tab) {
                tab.classList.remove('active');
            }
        });
        
        // Show the selected panel
        const selectedPanel = document.getElementById(panelId);
        if (selectedPanel) {
            selectedPanel.style.display = 'flex';
            
            // Activate corresponding button
            const buttonId = panelId.replace('-panel', '-btn');
            const activeButton = document.getElementById(buttonId);
            if (activeButton) {
                activeButton.classList.add('active');
            }
            
            // Special handling for terminal
            if (panelId === 'terminal-panel') {
                // Make sure terminal is initialized
                if (window.Terminal && typeof window.Terminal.focus === 'function') {
                    setTimeout(() => window.Terminal.focus(), 100);
                }
            }
        } else {
            console.warn(`🧩 Panel not found: ${panelId}`);
            
            // Fallback to show build panel
            const buildPanel = document.getElementById('build-panel');
            if (buildPanel) {
                buildPanel.style.display = 'flex';
                const buildBtn = document.getElementById('build-btn');
                if (buildBtn) {
                    buildBtn.classList.add('active');
                }
            }
        }
    }
    
    // Dynamic panel registration system
    const dynamicPanels = {};
    
    /**
     * Register a panel for tab controls
     * @param {string} panelId - ID of the panel to register
     */
    function registerPanel(panelId) {
        // Get panel element
        const panel = document.getElementById(panelId);
        if (!panel) {
            console.warn(`🧩 Tab Controls: Panel not found for ID: ${panelId}`);
            return false;
        }
        
        // Register dynamic panel
        dynamicPanels[panelId] = panel;
        console.log(`🧩 Tab Controls: Registered panel ${panelId}`);
        
        // Add click handler for button if it exists
        const buttonId = panelId.replace('-panel', '-btn');
        const button = document.getElementById(buttonId);
        
        if (button && !button._hasTabHandler) {
            button.addEventListener('click', function() {
                showPanel(panelId);
            });
            button._hasTabHandler = true;
            console.log(`🧩 Tab Controls: Added handler for ${buttonId}`);
        }
        
        return true;
    }
    
    // Expose for external use
    window.TabControls = {
        showPanel: showPanel,
        registerPanel: registerPanel
    };
});
