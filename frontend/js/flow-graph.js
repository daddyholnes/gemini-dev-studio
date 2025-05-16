/**
 * Podplay Build Sanctuary - Flow Graph
 * 
 * Implements LangGraph-inspired workflow orchestration:
 * - Define workflows as directed graphs with nodes and edges
 * - Execute workflows with branching based on conditions
 * - Store and manage workflows for common agent tasks
 * 
 * Created by Mama Bear 🐻💜
 */

class FlowNode {
  constructor(id, handler, metadata = {}) {
    this.id = id;
    this.handler = handler;
    this.type = metadata.type || 'tool';
    this.description = metadata.description || '';
    this.metadata = metadata;
  }
  
  async execute(context) {
    try {
      return await this.handler(context);
    } catch (error) {
      console.error(`🔄 Flow Graph: Error executing node ${this.id}`, error);
      throw error;
    }
  }
}

class FlowEdge {
  constructor(from, to, condition = null, metadata = {}) {
    this.from = from;
    this.to = to;
    this.condition = condition;
    this.description = metadata.description || '';
    this.metadata = metadata;
  }
  
  isValid(context) {
    if (!this.condition) return true;
    try {
      return this.condition(context);
    } catch (error) {
      console.error(`🔄 Flow Graph: Error evaluating edge condition ${this.from} -> ${this.to}`, error);
      return false;
    }
  }
}

class FlowGraph {
  constructor(id, name = '', metadata = {}) {
    this.id = id || `flow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.name = name || 'Unnamed Flow';
    this.description = metadata.description || '';
    this.metadata = metadata;
    this.nodes = {};
    this.edges = {};
    this.startNodeId = null;
    this.isExecuting = false;
    this.executionHistory = [];
    
    // Bind methods
    this.addNode = this.addNode.bind(this);
    this.addEdge = this.addEdge.bind(this);
    this.execute = this.execute.bind(this);
  }
  
  /**
   * Add a node to the graph
   * @param {string} id - Node ID
   * @param {Function} handler - Function to execute
   * @param {Object} metadata - Node metadata
   * @returns {FlowGraph} This graph instance for chaining
   */
  addNode(id, handler, metadata = {}) {
    this.nodes[id] = new FlowNode(id, handler, metadata);
    this.edges[id] = [];
    
    // Set as start node if it's the first node or explicitly marked
    if (Object.keys(this.nodes).length === 1 || metadata.isStart) {
      this.startNodeId = id;
    }
    
    return this;
  }
  
  /**
   * Add an edge between nodes
   * @param {string} fromId - Source node ID
   * @param {string} toId - Target node ID
   * @param {Function} condition - Condition function
   * @param {Object} metadata - Edge metadata
   * @returns {FlowGraph} This graph instance for chaining
   */
  addEdge(fromId, toId, condition = null, metadata = {}) {
    if (!this.nodes[fromId]) {
      throw new Error(`Source node ${fromId} does not exist`);
    }
    
    if (!this.nodes[toId]) {
      throw new Error(`Target node ${toId} does not exist`);
    }
    
    this.edges[fromId].push(new FlowEdge(fromId, toId, condition, metadata));
    return this;
  }
  
  /**
   * Execute the graph flow
   * @param {Object} initialContext - Initial context
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Final context and results
   */
  async execute(initialContext = {}, options = {}) {
    if (!this.startNodeId) {
      throw new Error('No start node defined for the flow');
    }
    
    if (this.isExecuting) {
      throw new Error('Flow is already executing');
    }
    
    this.isExecuting = true;
    this.executionHistory = [];
    
    const context = { 
      ...initialContext,
      flowId: this.id,
      startTime: Date.now(),
      nodeResults: {}
    };
    
    // Dispatch flow execution started event
    document.dispatchEvent(new CustomEvent('flow-graph:execution-started', {
      detail: { flowId: this.id, context }
    }));
    
    // Set up the execution trace
    const executionTrace = {
      flowId: this.id,
      startTime: Date.now(),
      initialContext,
      steps: [],
      finalContext: null,
      endTime: null,
      status: 'running'
    };
    
    let currentNodeId = this.startNodeId;
    let result = null;
    
    try {
      while (currentNodeId) {
        const node = this.nodes[currentNodeId];
        
        console.log(`🔄 Flow Graph: Executing node ${currentNodeId}`);
        
        // Record step start
        const stepStart = Date.now();
        
        // Dispatch node execution started event
        document.dispatchEvent(new CustomEvent('flow-graph:node-started', {
          detail: { flowId: this.id, nodeId: currentNodeId, context }
        }));
        
        // Execute the node
        const nodeResult = await node.execute(context);
        
        // Update context with result
        context.nodeResults[currentNodeId] = nodeResult;
        context.lastNodeResult = nodeResult;
        context.lastNodeId = currentNodeId;
        
        // Record step in execution trace
        executionTrace.steps.push({
          nodeId: currentNodeId,
          startTime: stepStart,
          endTime: Date.now(),
          result: nodeResult,
          duration: Date.now() - stepStart
        });
        
        // Dispatch node execution completed event
        document.dispatchEvent(new CustomEvent('flow-graph:node-completed', {
          detail: { flowId: this.id, nodeId: currentNodeId, result: nodeResult, context }
        }));
        
        // Find next node based on edge conditions
        let nextNodeId = null;
        
        // Check edges from current node
        for (const edge of this.edges[currentNodeId]) {
          if (edge.isValid(context)) {
            nextNodeId = edge.to;
            
            // Record edge traversal
            executionTrace.steps.push({
              type: 'edge',
              from: currentNodeId,
              to: nextNodeId,
              condition: edge.description || 'default'
            });
            
            break;
          }
        }
        
        // Move to next node or end execution
        currentNodeId = nextNodeId;
      }
      
      // Execution completed successfully
      result = {
        success: true,
        context,
        trace: executionTrace
      };
      
      executionTrace.status = 'completed';
      executionTrace.finalContext = context;
    } catch (error) {
      console.error('🔄 Flow Graph: Execution error', error);
      
      // Record error in trace
      executionTrace.status = 'failed';
      executionTrace.error = {
        message: error.message || 'Unknown error',
        stack: error.stack,
        nodeId: currentNodeId
      };
      
      // Execution failed
      result = {
        success: false,
        error: error.message || 'Execution failed',
        nodeId: currentNodeId,
        context,
        trace: executionTrace
      };
    } finally {
      // Finalize trace
      executionTrace.endTime = Date.now();
      executionTrace.duration = executionTrace.endTime - executionTrace.startTime;
      
      // Add to execution history
      this.executionHistory.push(executionTrace);
      
      // Reset execution state
      this.isExecuting = false;
      
      // Dispatch flow execution completed event
      document.dispatchEvent(new CustomEvent('flow-graph:execution-completed', {
        detail: { 
          flowId: this.id, 
          result, 
          context,
          trace: executionTrace
        }
      }));
    }
    
    return result;
  }
  
  /**
   * Get a visualization of the graph
   * @returns {Object} Graph visualization data
   */
  visualize() {
    const nodes = Object.values(this.nodes).map(node => ({
      id: node.id,
      label: node.id,
      type: node.type,
      description: node.description
    }));
    
    const edges = Object.values(this.edges).flatMap(edgeList => 
      edgeList.map(edge => ({
        from: edge.from,
        to: edge.to,
        label: edge.description || '',
        condition: edge.condition ? 'conditional' : 'always'
      }))
    );
    
    return { nodes, edges };
  }
  
  /**
   * Export the graph to JSON
   * @returns {Object} JSON representation of the graph
   */
  toJSON() {
    // We can't serialize functions directly, so we'll just store metadata
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      metadata: this.metadata,
      startNodeId: this.startNodeId,
      nodes: Object.values(this.nodes).map(node => ({
        id: node.id,
        type: node.type,
        description: node.description,
        metadata: node.metadata
      })),
      edges: Object.values(this.edges).flatMap(edgeList => 
        edgeList.map(edge => ({
          from: edge.from,
          to: edge.to,
          description: edge.description,
          metadata: edge.metadata,
          hasCondition: !!edge.condition
        }))
      ),
      executionHistory: this.executionHistory.slice(-5) // Keep last 5 executions
    };
  }
  
  /**
   * Import a graph from a template
   * @param {Object} template - Graph template
   * @param {Object} handlers - Node handlers
   * @returns {FlowGraph} A new graph instance
   */
  static fromTemplate(template, handlers = {}) {
    const graph = new FlowGraph(
      template.id || undefined,
      template.name,
      { 
        description: template.description,
        ...template.metadata 
      }
    );
    
    // Add nodes
    template.nodes.forEach(node => {
      const handler = handlers[node.id] || (() => ({ success: true }));
      graph.addNode(node.id, handler, { 
        type: node.type, 
        description: node.description,
        ...node.metadata
      });
    });
    
    // Add edges
    template.edges.forEach(edge => {
      // For conditions, we'll need to provide implementations from handlers
      const condition = edge.hasCondition ? handlers[`${edge.from}_to_${edge.to}_condition`] : null;
      graph.addEdge(edge.from, edge.to, condition, {
        description: edge.description,
        ...edge.metadata
      });
    });
    
    // Set start node
    if (template.startNodeId) {
      graph.startNodeId = template.startNodeId;
    }
    
    return graph;
  }
}

class FlowGraphManager {
  constructor() {
    this.graphs = {};
    this.templates = {};
    this.isInitialized = false;
    
    // Bind methods
    this.createGraph = this.createGraph.bind(this);
    this.getGraph = this.getGraph.bind(this);
    this.deleteGraph = this.deleteGraph.bind(this);
    this.saveGraphTemplate = this.saveGraphTemplate.bind(this);
    this.loadGraphTemplates = this.loadGraphTemplates.bind(this);
    this.saveTemplates = this.saveTemplates.bind(this);
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the Flow Graph Manager
   */
  async init() {
    console.log('🔄 Flow Graph Manager: Initializing');
    
    try {
      // Load templates from storage
      await this.loadGraphTemplates();
      
      this.isInitialized = true;
      console.log('🔄 Flow Graph Manager: Initialized');
      
      // Dispatch ready event
      document.dispatchEvent(new CustomEvent('flow-graph:ready', {
        detail: { manager: this }
      }));
    } catch (error) {
      console.error('🔄 Flow Graph Manager: Initialization failed', error);
    }
  }
  
  /**
   * Create a new graph
   * @param {string} name - Graph name
   * @param {Object} metadata - Graph metadata
   * @returns {FlowGraph} New graph instance
   */
  createGraph(name, metadata = {}) {
    const id = `graph_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const graph = new FlowGraph(id, name, metadata);
    
    this.graphs[id] = graph;
    
    console.log(`🔄 Flow Graph Manager: Created graph "${name}" (${id})`);
    
    // Dispatch graph created event
    document.dispatchEvent(new CustomEvent('flow-graph:created', {
      detail: { graph }
    }));
    
    return graph;
  }
  
  /**
   * Get a graph by ID
   * @param {string} id - Graph ID
   * @returns {FlowGraph|null} Graph instance or null if not found
   */
  getGraph(id) {
    return this.graphs[id] || null;
  }
  
  /**
   * Delete a graph
   * @param {string} id - Graph ID
   * @returns {boolean} True if deleted, false if not found
   */
  deleteGraph(id) {
    if (!this.graphs[id]) return false;
    
    delete this.graphs[id];
    
    console.log(`🔄 Flow Graph Manager: Deleted graph ${id}`);
    
    // Dispatch graph deleted event
    document.dispatchEvent(new CustomEvent('flow-graph:deleted', {
      detail: { graphId: id }
    }));
    
    return true;
  }
  
  /**
   * Save a graph as a template
   * @param {string} graphId - Graph ID
   * @param {string} templateName - Template name
   * @returns {boolean} True if saved, false if not found
   */
  saveGraphTemplate(graphId, templateName) {
    const graph = this.graphs[graphId];
    if (!graph) return false;
    
    const template = graph.toJSON();
    template.name = templateName || template.name;
    
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.templates[templateId] = template;
    
    // Save to storage
    this.saveTemplates();
    
    console.log(`🔄 Flow Graph Manager: Saved template "${templateName}" (${templateId})`);
    
    // Dispatch template saved event
    document.dispatchEvent(new CustomEvent('flow-graph:template-saved', {
      detail: { templateId, template }
    }));
    
    return true;
  }
  
  /**
   * Create a graph from a template
   * @param {string} templateId - Template ID
   * @param {Object} handlers - Node handlers
   * @returns {FlowGraph|null} New graph instance or null if template not found
   */
  createGraphFromTemplate(templateId, handlers = {}) {
    const template = this.templates[templateId];
    if (!template) return null;
    
    const graph = FlowGraph.fromTemplate(template, handlers);
    this.graphs[graph.id] = graph;
    
    console.log(`🔄 Flow Graph Manager: Created graph from template "${template.name}" (${graph.id})`);
    
    // Dispatch graph created event
    document.dispatchEvent(new CustomEvent('flow-graph:created', {
      detail: { graph, fromTemplate: templateId }
    }));
    
    return graph;
  }
  
  /**
   * Get all templates
   * @returns {Array} Array of templates
   */
  getAllTemplates() {
    return Object.entries(this.templates).map(([id, template]) => ({
      id,
      ...template
    }));
  }
  
  /**
   * Get all graphs
   * @returns {Array} Array of graphs
   */
  getAllGraphs() {
    return Object.values(this.graphs);
  }
  
  /**
   * Save templates to storage
   */
  saveTemplates() {
    try {
      localStorage.setItem('podplay-flow-templates', JSON.stringify(this.templates));
      return true;
    } catch (error) {
      console.error('🔄 Flow Graph Manager: Error saving templates', error);
      return false;
    }
  }
  
  /**
   * Load templates from storage
   */
  async loadGraphTemplates() {
    try {
      const stored = localStorage.getItem('podplay-flow-templates');
      if (stored) {
        this.templates = JSON.parse(stored);
        console.log(`🔄 Flow Graph Manager: Loaded ${Object.keys(this.templates).length} templates`);
      } else {
        console.log('🔄 Flow Graph Manager: No stored templates found');
        this.templates = this.getDefaultTemplates();
        this.saveTemplates();
      }
      return true;
    } catch (error) {
      console.error('🔄 Flow Graph Manager: Error loading templates', error);
      this.templates = this.getDefaultTemplates();
      return false;
    }
  }
  
  /**
   * Get default templates
   * @returns {Object} Default templates
   */
  getDefaultTemplates() {
    return {
      'template_default_nextjs': {
        id: 'template_default_nextjs',
        name: 'Next.js Setup Flow',
        description: 'Setup a Next.js project with Tailwind CSS',
        startNodeId: 'check_environment',
        nodes: [
          {
            id: 'check_environment',
            type: 'tool',
            description: 'Check if Node.js is installed'
          },
          {
            id: 'create_project',
            type: 'tool',
            description: 'Create Next.js project'
          },
          {
            id: 'install_tailwind',
            type: 'tool',
            description: 'Install Tailwind CSS'
          },
          {
            id: 'setup_config',
            type: 'tool',
            description: 'Setup Tailwind config'
          },
          {
            id: 'create_homepage',
            type: 'tool',
            description: 'Create homepage with Tailwind styles'
          }
        ],
        edges: [
          {
            from: 'check_environment',
            to: 'create_project',
            hasCondition: true,
            description: 'If Node.js is installed'
          },
          {
            from: 'create_project',
            to: 'install_tailwind',
            hasCondition: false
          },
          {
            from: 'install_tailwind',
            to: 'setup_config',
            hasCondition: false
          },
          {
            from: 'setup_config',
            to: 'create_homepage',
            hasCondition: false
          }
        ]
      }
    };
  }
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
  window.flowGraphManager = new FlowGraphManager();
});
