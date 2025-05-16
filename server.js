/**
 * Podplay Build - Development Server
 * 
 * Serves static files with proper CORS and security headers required for:
 * - WebContainer API (SharedArrayBuffer)
 * - MCP functionality
 * - API proxying
 * - Firebase config management
 * 
 * Created by Mama Bear 🐻💜
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration directory
const CONFIG_DIR = path.join(__dirname, 'config');

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  console.log(`Created config directory at ${CONFIG_DIR}`);
}

// Logger middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Set security headers required for WebContainer API
app.use((req, res, next) => {
  // Required for SharedArrayBuffer
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  
  // Standard CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  next();
});

// Parse JSON request bodies
app.use(express.json());

// Mock API endpoints for development
app.post('/api/chat', (req, res) => {
  const { message, model_name } = req.body || {};
  
  console.log(`Chat request received with model: ${model_name}`);
  
  if (model_name && model_name.includes('gemini')) {
    // Send a mock response to avoid API rate limits
    return res.json({
      response: "I'm responding as a local mock for Gemini to avoid rate limits. Your message: " + message,
      model: model_name,
      timestamp: new Date().toISOString()
    });
  }
  
  // Default response
  res.json({
    response: "Hello from Mama Bear! I'm here to help with Podplay Build.",
    model: model_name || 'mama-bear-local',
    timestamp: new Date().toISOString()
  });
});

// Firebase config endpoint
app.get('/api/firebase-config', (req, res) => {
  const configPath = path.join(CONFIG_DIR, 'firebase-config.json');
  
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      res.json(config);
    } catch (error) {
      console.error('Error reading Firebase config:', error);
      res.status(500).json({ error: 'Failed to read Firebase config' });
    }
  } else {
    // Return default config if no custom config exists
    res.json({
      apiKey: "",
      authDomain: "",
      projectId: "", 
      storageBucket: "",
      messagingSenderId: "",
      appId: ""
    });
  }
});

// Update Firebase config endpoint
app.post('/api/firebase-config', express.json(), (req, res) => {
  const config = req.body;
  
  if (!config || !config.apiKey || !config.projectId) {
    return res.status(400).json({ error: 'Invalid Firebase configuration' });
  }
  
  const configPath = path.join(CONFIG_DIR, 'firebase-config.json');
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('Firebase config updated');
    res.json({ success: true, message: 'Firebase configuration updated' });
  } catch (error) {
    console.error('Error saving Firebase config:', error);
    res.status(500).json({ error: 'Failed to save Firebase config' });
  }
});

// Firebase service account endpoint
app.post('/api/firebase-service-account', express.json(), (req, res) => {
  const serviceAccount = req.body;
  
  if (!serviceAccount || !serviceAccount.project_id) {
    return res.status(400).json({ error: 'Invalid service account' });
  }
  
  const saPath = path.join(CONFIG_DIR, 'firebase-service-account.json');
  
  try {
    fs.writeFileSync(saPath, JSON.stringify(serviceAccount, null, 2));
    console.log('Firebase service account updated');
    res.json({ success: true, message: 'Firebase service account updated' });
  } catch (error) {
    console.error('Error saving service account:', error);
    res.status(500).json({ error: 'Failed to save service account' });
  }
});

// Mock MCP endpoints
app.post('/api/mcp/:server/:action', (req, res) => {
  const { server, action } = req.params;
  res.json({
    success: true,
    server,
    action,
    status: 'active',
    message: `MCP Server ${server} ${action} successful`
  });
});

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, 'frontend')));

// Serve the main index.html for all routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🐻💜 Podplay Build server running at http://localhost:${PORT}`);
  console.log('With proper headers for WebContainer API support.');
  console.log('Chat API mocked to avoid rate limits');
  
  // Check if we have firebase config
  const firebaseConfigPath = path.join(CONFIG_DIR, 'firebase-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    console.log('Firebase config found');
  } else {
    console.log('No Firebase config found - using defaults');
  }
  
  // Check for missing CSS files and create them if needed
  const cssDir = path.join(__dirname, 'frontend', 'css');
  const missingCssFiles = [
    'build-mode.css',
    'build-mode-explorer.css',
    'build-mode-terminal.css'
  ];
  
  missingCssFiles.forEach(file => {
    const filePath = path.join(cssDir, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, `/* ${file} - Created by Mama Bear 🐻💜 */\n\n`);
      console.log(`Created missing file: ${file}`);
    }
  });
});
