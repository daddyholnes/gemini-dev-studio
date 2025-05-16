/**
 * Podplay Build Sanctuary - Chat Layout Manager
 * 
 * Handles responsive layout adjustments for the chat area:
 * - Ensures chat container takes full available height
 * - Properly sizes chat messages area for scrolling
 * - Recalculates on resize and orientation change
 * - Properly scrolls to bottom with new messages
 * - Moves development tools to right sidebar
 * - Fixes duplicate multimodal icons
 * 
 * Created by Mama Bear 🐻💜
 */

(function() {
  // Elements
  let chatContainer;
  let chatMessages;
  let chatControls;
  let rightSidebar;
  
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🐻 Chat Layout: Initializing responsive layout');
    
    // Get elements
    chatContainer = document.querySelector('.chat-container');
    chatMessages = document.querySelector('.chat-messages');
    chatControls = document.querySelector('.chat-controls');
    
    if (!chatContainer || !chatMessages) {
      console.error('🐻 Chat Layout: Could not find chat elements');
      return;
    }
    
    // Fix duplicate multimodal icons
    fixDuplicateIcons();
    
    // Move development tools to right sidebar
    moveDevToolsToSidebar();
    
    // Initial layout adjustment
    adjustChatLayout();
    
    // Update layout on window resize
    window.addEventListener('resize', adjustChatLayout);
    
    // Update layout on orientation change (mobile)
    window.addEventListener('orientationchange', adjustChatLayout);
    
    // Listen for new messages and scroll to bottom
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          scrollToBottom();
        }
      });
    });
    
    // Start observing chat messages for changes
    if (chatMessages) {
      observer.observe(chatMessages, { childList: true });
    }
    
    // Fix MCP server buttons
    fixMcpServerButtons();
    
    console.log('🐻 Chat Layout: Responsive layout initialized');
  });
  
  /**
   * Fix duplicate multimodal icons by removing one set
   */
  function fixDuplicateIcons() {
    try {
      // Identify duplicate icon sets
      const topIcons = document.querySelector('.flex.space-x-2');
      const bottomIcons = document.querySelector('.multimodal-controls');
      
      if (!topIcons || !bottomIcons) {
        console.log('🐻 Chat Layout: Could not find icon areas');
        return;
      }
      
      // Keep bottom icons, hide top icons
      if (bottomIcons && bottomIcons.childElementCount > 0) {
        // Just hide the top icons if bottom ones exist
        topIcons.style.display = 'none';
        console.log('🐻 Chat Layout: Hidden duplicate top icons');
      }
    } catch (err) {
      console.error('🐻 Chat Layout: Error fixing icons', err);
    }
  }
  
  /**
   * Move development tools to right sidebar
   */
  function moveDevToolsToSidebar() {
    try {
      // Find development tools
      const devTools = document.querySelector('.development-tools');
      
      if (!devTools) {
        console.log('🐻 Chat Layout: Development tools not found');
        return;
      }
      
      // Create right sidebar if it doesn't exist
      rightSidebar = document.querySelector('.right-sidebar');
      if (!rightSidebar) {
        // Get the main content area
        const mainContent = document.querySelector('.flex.h-screen');
        if (!mainContent) return;
        
        // Create and add right sidebar
        rightSidebar = document.createElement('div');
        rightSidebar.className = 'right-sidebar';
        rightSidebar.style.width = '250px';
        rightSidebar.style.backgroundColor = 'var(--sidebar)';
        rightSidebar.style.borderLeft = '1px solid rgba(255,255,255,0.1)';
        rightSidebar.style.height = '100vh';
        rightSidebar.style.overflowY = 'auto';
        rightSidebar.style.padding = '1rem';
        rightSidebar.style.flexShrink = '0';
        
        // Add to the DOM after the main content area
        mainContent.appendChild(rightSidebar);
        
        console.log('🐻 Chat Layout: Created right sidebar');
      }
      
      // Move development tools to right sidebar
      rightSidebar.appendChild(devTools);
      devTools.style.marginTop = '1rem';
      
      console.log('🐻 Chat Layout: Moved development tools to sidebar');
    } catch (err) {
      console.error('🐻 Chat Layout: Error moving dev tools', err);
    }
  }
  
  /**
   * Fix MCP server buttons
   */
  function fixMcpServerButtons() {
    try {
      // Add click event listeners to Start buttons
      const startButtons = document.querySelectorAll('.mcp-server-item button');
      
      startButtons.forEach(button => {
        button.addEventListener('click', () => {
          const serverItem = button.closest('.mcp-server-item');
          if (!serverItem) return;
          
          const serverName = serverItem.querySelector('h3')?.textContent || 'unknown';
          
          // Update button text and status
          button.textContent = button.textContent === 'Start' ? 'Starting...' : 'Stop';
          
          console.log(`🐻 MCP Server: ${serverName} ${button.textContent}`);
          
          // Show success after a delay (simulates starting)
          setTimeout(() => {
            const statusElement = serverItem.querySelector('.mcp-server-status');
            if (statusElement && button.textContent === 'Starting...') {
              statusElement.textContent = 'active';
              statusElement.style.color = '#10b981';
              button.textContent = 'Stop';
              button.style.backgroundColor = '#ef4444';
              
              document.dispatchEvent(new CustomEvent('mcp-server-started', {
                detail: { server: serverName }
              }));
            } else if (statusElement && button.textContent === 'Stop') {
              statusElement.textContent = 'inactive';
              statusElement.style.color = '#9ca3af';
              button.textContent = 'Start';
              button.style.backgroundColor = '#3b82f6';
              
              document.dispatchEvent(new CustomEvent('mcp-server-stopped', {
                detail: { server: serverName }
              }));
            }
          }, 1500);
        });
      });
      
      console.log('🐻 Chat Layout: Added MCP server button listeners');
    } catch (err) {
      console.error('🐻 Chat Layout: Error fixing MCP buttons', err);
    }
  }
  
  /**
   * Adjust chat layout to use full available space
   */
  function adjustChatLayout() {
    if (!chatContainer || !chatMessages) return;
    
    // Apply appropriate styles to container and messages
    const controlsHeight = chatControls ? chatControls.offsetHeight : 0;
    const topBarHeight = document.querySelector('.tool-btn') ? 
      document.querySelector('.tool-btn').closest('div').offsetHeight : 0;
    
    // Ensure chat container takes full height
    chatContainer.style.position = 'absolute';
    chatContainer.style.top = `${topBarHeight}px`;
    chatContainer.style.left = '0';
    chatContainer.style.right = '0';
    chatContainer.style.bottom = '0';
    
    // Set messages height to container height minus controls
    chatMessages.style.height = `calc(100% - ${controlsHeight}px)`;
    chatMessages.style.overflowY = 'auto';
    
    // Ensure chat controls are at the bottom
    if (chatControls) {
      chatControls.style.position = 'sticky';
      chatControls.style.bottom = '0';
      chatControls.style.left = '0';
      chatControls.style.right = '0';
      chatControls.style.zIndex = '10';
    }
    
    // Scroll to bottom
    scrollToBottom();
    
    console.log(`🐻 Chat Layout: Adjusted - Container: ${chatContainer?.offsetHeight || 0}px, Messages: ${chatMessages?.offsetHeight || 0}px`);
  }
  
  /**
   * Scroll chat to the bottom
   */
  function scrollToBottom() {
    if (!chatMessages) return;
    
    // Scroll to bottom with animation
    chatMessages.scrollTo({
      top: chatMessages.scrollHeight,
      behavior: 'smooth'
    });
  }
  
  // Export scroll function to global scope
  window.scrollChatToBottom = scrollToBottom;
})();
