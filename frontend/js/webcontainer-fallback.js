/**
 * Podplay Build Sanctuary - WebContainer Fallback
 * 
 * Provides a local fallback for WebContainer when CDN fails:
 * - Detects when WebContainer fails to load from CDN
 * - Loads a local copy instead
 * - Ensures Build Mode works even with network issues
 * 
 * Created by Mama Bear 🐻💜
 */

(function() {
  console.log('🌐 WebContainer Fallback: Initializing');
  
  // Original script source
  const originalSrc = 'https://cdn.jsdelivr.net/npm/@webcontainer/api@1.1.0/dist/index.js';
  
  // Local fallback path (we'll create this file)
  const fallbackSrc = './lib/webcontainer-api.js';
  
  // Check if the WebContainer script fails to load
  window.addEventListener('error', function(event) {
    const target = event.target;
    
    // Check if the error is from the WebContainer script
    if (target && target.tagName === 'SCRIPT' && target.src.includes('@webcontainer/api')) {
      console.log('🌐 WebContainer Fallback: CDN load failed, using local fallback');
      
      // Remove the failed script
      target.remove();
      
      // Create a new script element with the fallback source
      const fallbackScript = document.createElement('script');
      fallbackScript.src = fallbackSrc;
      fallbackScript.async = true;
      fallbackScript.defer = true;
      
      // Add event listeners for load and error
      fallbackScript.addEventListener('load', function() {
        console.log('🌐 WebContainer Fallback: Local fallback loaded successfully');
      });
      
      fallbackScript.addEventListener('error', function() {
        console.error('🌐 WebContainer Fallback: Local fallback also failed to load');
      });
      
      // Append the fallback script to the document head
      document.head.appendChild(fallbackScript);
      
      // Prevent the default error behavior
      event.preventDefault();
    }
  }, true);
  
  // Proactively check if WebContainer is available after a timeout
  setTimeout(function() {
    if (typeof WebContainer === 'undefined') {
      console.log('🌐 WebContainer Fallback: WebContainer not available after timeout, loading fallback');
      
      // Remove any existing WebContainer scripts
      document.querySelectorAll('script').forEach(function(script) {
        if (script.src.includes('@webcontainer/api')) {
          script.remove();
        }
      });
      
      // Create a new script element with the fallback source
      const fallbackScript = document.createElement('script');
      fallbackScript.src = fallbackSrc;
      fallbackScript.async = true;
      fallbackScript.defer = true;
      
      // Append the fallback script to the document head
      document.head.appendChild(fallbackScript);
    }
  }, 5000);
})();
