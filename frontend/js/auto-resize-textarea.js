/**
 * Auto-resizing Textarea for Podplay Build
 * 
 * This script makes the chat input textarea automatically resize as the user types,
 * providing a more comfortable typing experience for Nathan.
 * 
 * Created with love by Mama Bear 🐻💜
 */

document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chat-input');
  
  if (!chatInput) return;
  
  // Initial setup
  chatInput.setAttribute('style', 'height: auto;');
  
  // Function to resize the textarea based on content
  const resizeTextarea = () => {
    // Reset height temporarily to get the correct scrollHeight
    chatInput.style.height = 'auto';
    
    // Get the scroll height (content height)
    const scrollHeight = chatInput.scrollHeight;
    
    // Calculate new height within min and max bounds
    const minHeight = 40; // Matches the min-h-[40px] class
    const maxHeight = 200; // Matches the max-h-[200px] class
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    
    // Apply the new height
    chatInput.style.height = `${newHeight}px`;
    
    // If content exceeds max height, enable scrolling
    if (scrollHeight > maxHeight) {
      chatInput.style.overflowY = 'auto';
    } else {
      chatInput.style.overflowY = 'hidden'; // Hide scrollbar when not needed
    }
  };
  
  // Apply resize on input events
  chatInput.addEventListener('input', resizeTextarea);
  
  // Also resize on focus to handle pre-filled content
  chatInput.addEventListener('focus', resizeTextarea);
  
  // Initial resize in case there's already content
  resizeTextarea();
  
  // Handle Shift+Enter for new lines vs Enter for sending
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (!e.shiftKey) {
        // Let the existing event listener handle sending
        // But resize after sending (when cleared)
        setTimeout(resizeTextarea, 0);
      } else {
        // After Shift+Enter to add a newline, resize
        setTimeout(resizeTextarea, 0);
      }
    }
  });
  
  // Ensure proper resize after content is programmatically changed
  const originalSetValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
  Object.defineProperty(chatInput, 'value', {
    set(val) {
      originalSetValue.call(this, val);
      // Resize after value change
      setTimeout(resizeTextarea, 0);
    }
  });
  
  console.log('Auto-resize textarea initialized for chat input 🐻');
});