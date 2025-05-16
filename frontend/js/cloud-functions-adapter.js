/**
 * Podplay Build Sanctuary - Cloud Functions Adapter
 * 
 * Integrates with Firebase Cloud Functions to:
 * - Enable sharing of flows between users
 * - Process and validate flows before storage
 * - Run serverless functions for remote pattern execution
 * 
 * Created by Mama Bear 🐻💜
 */

class CloudFunctionsAdapter {
  constructor() {
    this.isInitialized = false;
    this.baseUrl = null;
    this.functions = null;
    this.userId = null;
    
    // Bind methods
    this.init = this.init.bind(this);
    this.executeFlow = this.executeFlow.bind(this);
    this.shareFlow = this.shareFlow.bind(this);
    this.getSharedFlows = this.getSharedFlows.bind(this);
    this.validateFlow = this.validateFlow.bind(this);
    
    // Initialize if Firebase is available
    this.checkFirebaseAndInit();
  }
  
  /**
   * Check if Firebase is available and initialize
   */
  async checkFirebaseAndInit() {
    // Wait for DOM to be ready
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => this.checkFirebaseAndInit());
      return;
    }
    
    console.log('☁️ Cloud Functions: Checking Firebase availability');
    
    try {
      // Wait for Firebase to be globally available
      if (typeof firebase === 'undefined') {
        console.log('☁️ Cloud Functions: Firebase not available, waiting for global object');
        
        // Try again in 1 second
        setTimeout(() => this.checkFirebaseAndInit(), 1000);
        return;
      }
      
      // Initialize
      this.init();
    } catch (error) {
      console.error('☁️ Cloud Functions: Error checking Firebase', error);
    }
  }
  
  /**
   * Initialize Cloud Functions adapter
   */
  async init() {
    if (this.isInitialized) return true;
    
    console.log('☁️ Cloud Functions: Initializing');
    
    try {
      // Get Firebase references
      this.functions = firebase.functions();
      
      // Set base URL from window location
      this.baseUrl = window.location.origin;
      
      // Get user ID if authenticated
      if (firebase.auth().currentUser) {
        this.userId = firebase.auth().currentUser.uid;
      }
      
      // Listen for auth state changes
      firebase.auth().onAuthStateChanged(user => {
        if (user) {
          this.userId = user.uid;
        } else {
          this.userId = null;
        }
      });
      
      this.isInitialized = true;
      console.log('☁️ Cloud Functions: Initialized');
      
      // Dispatch ready event
      document.dispatchEvent(new CustomEvent('cloud-functions:ready', {
        detail: { adapter: this }
      }));
      
      return true;
    } catch (error) {
      console.error('☁️ Cloud Functions: Initialization failed', error);
      return false;
    }
  }
  
  /**
   * Execute a flow on the cloud
   * @param {string} flowId - Flow ID
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Execution result
   */
  async executeFlow(flowId, context = {}) {
    if (!this.isInitialized) {
      await this.init();
    }
    
    try {
      // Create a Cloud Function reference
      const executeFlowFn = this.functions.httpsCallable('executeFlow');
      
      // Call the function
      const result = await executeFlowFn({
        flowId,
        context,
        userId: this.userId || 'anonymous'
      });
      
      console.log('☁️ Cloud Functions: Executed flow', flowId, result.data);
      
      return {
        success: true,
        result: result.data
      };
    } catch (error) {
      console.error('☁️ Cloud Functions: Error executing flow', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Share a flow with another user or team
   * @param {string} flowId - Flow ID
   * @param {string} targetId - Target user or team ID
   * @returns {Promise<Object>} Share result
   */
  async shareFlow(flowId, targetId) {
    if (!this.isInitialized) {
      await this.init();
    }
    
    try {
      // Create a Cloud Function reference
      const shareFlowFn = this.functions.httpsCallable('shareFlow');
      
      // Call the function
      const result = await shareFlowFn({
        flowId,
        targetId,
        userId: this.userId || 'anonymous'
      });
      
      console.log('☁️ Cloud Functions: Shared flow', flowId, 'with', targetId, result.data);
      
      return {
        success: true,
        result: result.data
      };
    } catch (error) {
      console.error('☁️ Cloud Functions: Error sharing flow', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get flows shared with the current user
   * @returns {Promise<Object>} Shared flows
   */
  async getSharedFlows() {
    if (!this.isInitialized) {
      await this.init();
    }
    
    try {
      // Create a Cloud Function reference
      const getSharedFlowsFn = this.functions.httpsCallable('getSharedFlows');
      
      // Call the function
      const result = await getSharedFlowsFn({
        userId: this.userId || 'anonymous'
      });
      
      console.log('☁️ Cloud Functions: Got shared flows', result.data);
      
      return {
        success: true,
        flows: result.data.flows || []
      };
    } catch (error) {
      console.error('☁️ Cloud Functions: Error getting shared flows', error);
      
      return {
        success: false,
        error: error.message,
        flows: []
      };
    }
  }
  
  /**
   * Validate a flow against security rules
   * @param {Object} flow - Flow to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateFlow(flow) {
    if (!this.isInitialized) {
      await this.init();
    }
    
    try {
      // Create a Cloud Function reference
      const validateFlowFn = this.functions.httpsCallable('validateFlow');
      
      // Call the function
      const result = await validateFlowFn({
        flow,
        userId: this.userId || 'anonymous'
      });
      
      console.log('☁️ Cloud Functions: Validated flow', result.data);
      
      return {
        success: true,
        valid: result.data.valid,
        issues: result.data.issues || []
      };
    } catch (error) {
      console.error('☁️ Cloud Functions: Error validating flow', error);
      
      return {
        success: false,
        error: error.message,
        valid: false,
        issues: [{
          severity: 'error',
          message: error.message
        }]
      };
    }
  }
  
  /**
   * Get flow stats across all users (admin only)
   * @returns {Promise<Object>} Flow stats
   */
  async getFlowStats() {
    if (!this.isInitialized) {
      await this.init();
    }
    
    try {
      // Create a Cloud Function reference
      const getFlowStatsFn = this.functions.httpsCallable('getFlowStats');
      
      // Call the function
      const result = await getFlowStatsFn();
      
      console.log('☁️ Cloud Functions: Got flow stats', result.data);
      
      return {
        success: true,
        stats: result.data
      };
    } catch (error) {
      console.error('☁️ Cloud Functions: Error getting flow stats', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Create a shareable link for a flow
   * @param {string} flowId - Flow ID
   * @returns {Promise<Object>} Share link result
   */
  async createShareableLink(flowId) {
    if (!this.isInitialized) {
      await this.init();
    }
    
    try {
      // Create a Cloud Function reference
      const createShareableLinkFn = this.functions.httpsCallable('createShareableLink');
      
      // Call the function
      const result = await createShareableLinkFn({
        flowId,
        userId: this.userId || 'anonymous'
      });
      
      console.log('☁️ Cloud Functions: Created shareable link for flow', flowId, result.data);
      
      return {
        success: true,
        shareLink: result.data.shareLink,
        expiresAt: result.data.expiresAt
      };
    } catch (error) {
      console.error('☁️ Cloud Functions: Error creating shareable link', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
  window.cloudFunctionsAdapter = new CloudFunctionsAdapter();
});
