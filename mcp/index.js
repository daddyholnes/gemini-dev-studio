/**
 * Custom MCP Toolkit Implementation for Podplay Build
 * 
 * This is a simplified implementation of MCP server management
 * designed specifically for the Podplay Build sanctuary.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import http from 'http';
import https from 'https';

// Set up directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, 'config.json');
const LOG_PATH = path.join(__dirname, 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_PATH)) {
  fs.mkdirSync(LOG_PATH, { recursive: true });
}

// Simple logger implementation
const logger = {
  info: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.log(`\x1b[36m[INFO] [${timestamp}]\x1b[0m ${message}`, ...args);
    appendToLogFile('info', message, args);
  },
  warn: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.log(`\x1b[33m[WARN] [${timestamp}]\x1b[0m ${message}`, ...args);
    appendToLogFile('warn', message, args);
  },
  error: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.error(`\x1b[31m[ERROR] [${timestamp}]\x1b[0m ${message}`, ...args);
    appendToLogFile('error', message, args);
  },
  debug: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.log(`\x1b[90m[DEBUG] [${timestamp}]\x1b[0m ${message}`, ...args);
    appendToLogFile('debug', message, args);
  }
};

// Append to log file
function appendToLogFile(level, message, args) {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({
      timestamp,
      level,
      message,
      args: args.map(arg => {
        try {
          return typeof arg === 'object' ? JSON.stringify(arg) : arg;
        } catch (e) {
          return String(arg);
        }
      })
    }) + '\n';
    
    const logFile = path.join(LOG_PATH, level === 'error' ? 'error.log' : 'combined.log');
    fs.appendFileSync(logFile, logEntry);
  } catch (error) {
    console.error('Error writing to log file:', error);
  }
}

// Default configuration if config file doesn't exist
const defaultConfig = {
  servers: {
    'brave-search': {
      port: 3001,
      config: {
        apiKey: process.env.BRAVE_API_KEY || ''
      }
    },
    'filesystem': {
      port: 3002,
      config: {
        allowedDirectories: [
          process.env.HOME || process.env.USERPROFILE || '~'
        ]
      }
    },
    'github': {
      port: 3003,
      config: {
        token: process.env.GITHUB_TOKEN || ''
      }
    },
    'memory': {
      port: 3004,
      config: {}
    }
  }
};

// Load or create configuration
let config;
try {
  if (fs.existsSync(CONFIG_PATH)) {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
    config = JSON.parse(configData);
    logger.info('Loaded configuration from config.json');
  } else {
    config = defaultConfig;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    logger.info('Created default configuration file');
  }
} catch (error) {
  logger.error('Error loading configuration:', error);
  config = defaultConfig;
}

// Track running server processes
const runningServers = new Map();

// State file for persistence
const STATE_FILE_PATH = path.join(__dirname, 'server-state.json');

// Load saved state if it exists
function loadServerState() {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const stateData = fs.readFileSync(STATE_FILE_PATH, 'utf8');
      const state = JSON.parse(stateData);
      logger.info('Loaded server state from file');
      return state;
    }
  } catch (error) {
    logger.error('Error loading server state:', error);
  }
  
  // Default state
  return {
    lastUpdated: new Date().toISOString(),
    servers: {}
  };
}

// Save current state to file
function saveServerState(state) {
  try {
    state.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2));
    logger.info('Saved server state to file');
  } catch (error) {
    logger.error('Error saving server state:', error);
  }
}

// Check if a port is in use
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
      server.close();
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    
    server.listen(port);
  });
}

// Simulate MCP server process
class MCPServerProcess {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.port = config.port || 3000;
    this.process = null;
    this.tools = this._generateMockTools();
    
    // Load state from file
    const state = loadServerState();
    const serverState = state.servers[name] || { running: false, startTime: null };
    
    if (serverState.running) {
      this.status = 'running';
      this.startTime = serverState.startTime ? new Date(serverState.startTime) : Date.now();
      logger.info(`Loaded running state for server ${name}`);
    } else {
      this.status = 'stopped';
      this.startTime = null;
    }
  }
  
  _generateMockTools() {
    // Generate mock tools based on server type
    const toolSets = {
      'brave-search': ['brave_web_search', 'brave_local_search'],
      'filesystem': ['read_file', 'write_file', 'list_directory', 'create_directory', 'delete_file', 'move_file'],
      'github': ['list_repositories', 'create_repository', 'fork_repository', 'create_issue', 'create_pull_request'],
      'memory': ['read_graph', 'create_entities', 'create_relations', 'search_nodes']
    };
    
    return toolSets[this.name] || [];
  }
  
  async start() {
    if (this.status === 'running') {
      logger.info(`Server ${this.name} is already running`);
      return true;
    }
    
    try {
      // Check if port is already in use
      const portInUse = await isPortInUse(this.port);
      if (portInUse) {
        logger.warn(`Port ${this.port} for server ${this.name} is already in use`);
        this.status = 'running'; // Assume it's our server already running
        this.startTime = Date.now();
        
        // Save the state
        this._updateServerState(true);
        
        return true;
      }
      
      // Simulate server start process
      logger.info(`Starting MCP server: ${this.name} on port ${this.port}`);
      
      // In a real implementation, you would start an actual process
      // For our simulation, we'll just create a mock process object
      this.status = 'running';
      this.startTime = Date.now();
      
      // Save the state
      this._updateServerState(true);
      
      logger.info(`MCP server ${this.name} started successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to start MCP server ${this.name}:`, error);
      this.status = 'error';
      
      // Save the error state
      this._updateServerState(false);
      
      return false;
    }
  }
  
  // Helper method to update server state in the state file
  _updateServerState(running) {
    try {
      const state = loadServerState();
      
      // Convert startTime to ISO string properly
      let startTimeStr = null;
      if (running) {
        if (this.startTime) {
          // Handle both Date objects and timestamps
          startTimeStr = this.startTime instanceof Date ? 
            this.startTime.toISOString() : 
            new Date(this.startTime).toISOString();
        } else {
          startTimeStr = new Date().toISOString();
        }
      }
      
      // Update the state for this server
      state.servers[this.name] = {
        running: running,
        startTime: startTimeStr
      };
      
      // Save the updated state
      saveServerState(state);
    } catch (error) {
      logger.error(`Error updating server state for ${this.name}:`, error);
    }
  }
  
  async stop() {
    if (this.status !== 'running') {
      logger.info(`Server ${this.name} is not running`);
      return true;
    }
    
    try {
      logger.info(`Stopping MCP server: ${this.name}`);
      
      // Clean up
      this.status = 'stopped';
      this.startTime = null;
      
      // Save the stopped state
      this._updateServerState(false);
      
      logger.info(`MCP server ${this.name} stopped successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to stop MCP server ${this.name}:`, error);
      return false;
    }
  }
  
  getStatus() {
    const status = {
      running: this.status === 'running',
      port: this.port,
      health: this.status === 'running' ? 'healthy' : 'stopped',
      tools: this.tools
    };
    
    if (this.startTime) {
      status.uptime = Date.now() - this.startTime;
    }
    
    return status;
  }
  
  async callTool(toolName, params) {
    if (this.status !== 'running') {
      throw new Error(`Server ${this.name} is not running`);
    }
    
    if (!this.tools.includes(toolName)) {
      throw new Error(`Tool ${toolName} not found on server ${this.name}`);
    }
    
    logger.info(`Calling tool ${toolName} on server ${this.name} with params:`, params);
    
    // Simulate tool execution with delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock result based on tool and server
    return {
      success: true,
      result: `Result from ${toolName} on ${this.name}`,
      params
    };
  }
}

// Initialize server processes
const serverProcesses = new Map();

Object.entries(config.servers).forEach(([name, settings]) => {
  try {
    const server = new MCPServerProcess(name, settings);
    serverProcesses.set(name, server);
    logger.info(`Registered MCP server: ${name}`);
  } catch (error) {
    logger.error(`Failed to initialize server ${name}:`, error);
  }
});

// Export functions for use in other modules
export const startServer = async (serverName) => {
  const server = serverProcesses.get(serverName);
  if (!server) {
    logger.error(`Server ${serverName} not found`);
    throw new Error(`Server ${serverName} not found`);
  }
  
  return await server.start();
};

export const stopServer = async (serverName) => {
  const server = serverProcesses.get(serverName);
  if (!server) {
    logger.error(`Server ${serverName} not found`);
    throw new Error(`Server ${serverName} not found`);
  }
  
  return await server.stop();
};

export const startAllServers = async () => {
  const results = {};
  
  for (const [name, server] of serverProcesses.entries()) {
    try {
      results[name] = await server.start();
    } catch (error) {
      logger.error(`Error starting server ${name}:`, error);
      results[name] = false;
    }
  }
  
  logger.info('Started all servers with results:', results);
  return results;
};

export const stopAllServers = async () => {
  const results = {};
  
  for (const [name, server] of serverProcesses.entries()) {
    try {
      results[name] = await server.stop();
    } catch (error) {
      logger.error(`Error stopping server ${name}:`, error);
      results[name] = false;
    }
  }
  
  logger.info('Stopped all servers with results:', results);
  return results;
};

export const getServerStatus = () => {
  const status = {};
  
  for (const [name, server] of serverProcesses.entries()) {
    status[name] = server.getStatus();
  }
  
  return status;
};

export const callTool = async (serverName, toolName, params) => {
  const server = serverProcesses.get(serverName);
  if (!server) {
    logger.error(`Server ${serverName} not found`);
    throw new Error(`Server ${serverName} not found`);
  }
  
  return await server.callTool(toolName, params);
};

// Export the logger
export { logger };

// Default export
export default {
  startServer,
  stopServer,
  startAllServers,
  stopAllServers,
  getServerStatus,
  callTool,
  logger
};