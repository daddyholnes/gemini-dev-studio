/**
 * Podplay Build Sanctuary - Utility Functions
 * 
 * Common helper functions used throughout the application
 * 
 * Created by Mama Bear 🐻💜
 */

// Format date/time functions
const Utils = {
  /**
   * Format a timestamp as a nice readable string
   * @param {Date|string} timestamp - Date object or ISO timestamp string
   * @param {boolean} includeTime - Whether to include the time
   * @returns {string} Formatted date string
   */
  formatTimestamp: function(timestamp, includeTime = true) {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const options = {
      month: 'short',
      day: 'numeric'
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('en-US', options);
  },
  
  /**
   * Truncate text to specified length with ellipsis
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text
   */
  truncateText: function(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  },
  
  /**
   * Generate a random ID string
   * @returns {string} Random ID
   */
  generateId: function() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  },
  
  /**
   * Debounce a function call
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce: function(func, wait = 300) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
};

// Export to global scope
window.Utils = Utils;
