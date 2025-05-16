/**
 * Podplay Build Sanctuary - Build Mode File System
 * 
 * Handles file system operations for the WebContainer environment:
 * - File creation and editing
 * - Directory management
 * - Project templates
 * 
 * Created by Mama Bear 🐻💜
 */

class BuildModeFileSystem {
  constructor(buildMode) {
    this.buildMode = buildMode;
    this.webContainer = null;
    this.fileTree = {};
    this.currentPath = '/';
    
    // Project templates
    this.templates = {
      node: {
        files: {
          'package.json': JSON.stringify({
            name: 'podplay-node-project',
            version: '1.0.0',
            description: 'Node.js project created in Podplay Build Mode',
            main: 'index.js',
            scripts: {
              start: 'node index.js'
            }
          }, null, 2),
          'index.js': 'console.log("Hello from Podplay Build Mode!");',
          'README.md': '# Node.js Project\n\nCreated with Podplay Build Mode 🐻💜'
        }
      },
      react: {
        files: {
          'package.json': JSON.stringify({
            name: 'podplay-react-project',
            version: '0.1.0',
            private: true,
            dependencies: {
              'react': '^18.2.0',
              'react-dom': '^18.2.0'
            },
            scripts: {
              'start': 'vite',
              'build': 'vite build'
            },
            devDependencies: {
              'vite': '^4.3.9'
            }
          }, null, 2),
          'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Podplay React App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>`,
          'src/main.jsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
          'src/App.jsx': `import React, { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Podplay Build Mode</h1>
        <p>Welcome to your React sanctuary, my precious cub! 🐻💜</p>
        <div>
          <button onClick={() => setCount(count + 1)}>
            Count is: {count}
          </button>
        </div>
      </header>
    </div>
  );
}

export default App;`,
          'README.md': '# React Project\n\nCreated with Podplay Build Mode 🐻💜'
        }
      },
      html: {
        files: {
          'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Podplay Web Project</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      background-color: #1e293b;
      color: #e2e8f0;
      margin: 0;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    
    .container {
      max-width: 800px;
      background-color: #0f172a;
      padding: 2rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    h1 {
      color: #8b5cf6;
    }
    
    .highlight {
      color: #8b5cf6;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Podplay Build Mode</h1>
    <p>Welcome to your web project sanctuary, my precious cub! 🐻💜</p>
    <p>Edit this file to start building your web project.</p>
  </div>
  
  <script>
    console.log("Podplay Build Mode is ready!");
  </script>
</body>
</html>`,
          'README.md': '# HTML Project\n\nCreated with Podplay Build Mode 🐻💜'
        }
      }
    };
  }
  
  // Initialize with WebContainer instance
  async initialize(webContainer) {
    this.webContainer = webContainer;
    await this.refreshFileTree();
    console.log('🛠️ Build Mode FS: Initialized');
  }
  
  // Refresh the file tree structure
  async refreshFileTree() {
    if (!this.webContainer) return;
    
    try {
      this.fileTree = await this.buildDirectoryTree('/');
    } catch (error) {
      console.error('🛠️ Build Mode FS: Error refreshing file tree', error);
    }
  }
  
  // Recursively build directory tree
  async buildDirectoryTree(path) {
    if (!this.webContainer) return {};
    
    try {
      const entries = await this.webContainer.fs.readdir(path, { withFileTypes: true });
      const result = {};
      
      for (const entry of entries) {
        const fullPath = `${path}${path.endsWith('/') ? '' : '/'}${entry.name}`;
        
        if (entry.isDirectory()) {
          result[entry.name] = {
            type: 'directory',
            path: fullPath,
            children: await this.buildDirectoryTree(fullPath)
          };
        } else {
          result[entry.name] = {
            type: 'file',
            path: fullPath
          };
        }
      }
      
      return result;
    } catch (error) {
      console.error(`🛠️ Build Mode FS: Error building directory tree for ${path}`, error);
      return {};
    }
  }
  
  // Create a directory
  async createDirectory(path) {
    if (!this.webContainer) return false;
    
    try {
      await this.webContainer.fs.mkdir(path, { recursive: true });
      await this.refreshFileTree();
      return true;
    } catch (error) {
      console.error(`🛠️ Build Mode FS: Error creating directory ${path}`, error);
      return false;
    }
  }
  
  // Create a file
  async createFile(path, content = '') {
    if (!this.webContainer) return false;
    
    try {
      // Ensure parent directory exists
      const parentDir = path.substring(0, path.lastIndexOf('/'));
      if (parentDir) {
        await this.createDirectory(parentDir);
      }
      
      // Write the file
      await this.webContainer.fs.writeFile(path, content);
      await this.refreshFileTree();
      return true;
    } catch (error) {
      console.error(`🛠️ Build Mode FS: Error creating file ${path}`, error);
      return false;
    }
  }
  
  // Read file content
  async readFile(path) {
    if (!this.webContainer) return null;
    
    try {
      return await this.webContainer.fs.readFile(path, 'utf-8');
    } catch (error) {
      console.error(`🛠️ Build Mode FS: Error reading file ${path}`, error);
      return null;
    }
  }
  
  // Create a project from template
  async createProject(template = 'node', projectName = 'my-project') {
    if (!this.webContainer) return false;
    
    try {
      const templateData = this.templates[template];
      if (!templateData) {
        throw new Error(`Template ${template} not found`);
      }
      
      // Create project directory
      await this.createDirectory(`/${projectName}`);
      
      // Create files from template
      for (const [filePath, content] of Object.entries(templateData.files)) {
        await this.createFile(`/${projectName}/${filePath}`, content);
      }
      
      // Set as current path
      this.currentPath = `/${projectName}`;
      
      return true;
    } catch (error) {
      console.error(`🛠️ Build Mode FS: Error creating project from template ${template}`, error);
      return false;
    }
  }
  
  // Get current file tree
  getFileTree() {
    return this.fileTree;
  }
  
  // Get current path
  getCurrentPath() {
    return this.currentPath;
  }
  
  // Set current path
  setCurrentPath(path) {
    this.currentPath = path;
  }
  
  // Get available templates
  getTemplates() {
    return Object.keys(this.templates);
  }
  
  // Helper: Render file tree as HTML
  renderFileTreeHtml() {
    const treeContainer = document.createElement('div');
    treeContainer.className = 'file-tree';
    
    const renderNode = (node, name, container, level = 0) => {
      const item = document.createElement('div');
      item.className = `file-tree-item ${node.type}`;
      item.style.paddingLeft = `${level * 16}px`;
      
      // Icon
      const icon = document.createElement('span');
      icon.className = 'file-tree-icon';
      icon.textContent = node.type === 'directory' ? '📁 ' : '📄 ';
      
      // Name
      const nameSpan = document.createElement('span');
      nameSpan.className = 'file-tree-name';
      nameSpan.textContent = name;
      
      item.appendChild(icon);
      item.appendChild(nameSpan);
      container.appendChild(item);
      
      // Add click event
      item.addEventListener('click', () => {
        if (node.type === 'directory') {
          // Toggle children
          if (item.classList.contains('open')) {
            item.classList.remove('open');
          } else {
            item.classList.add('open');
          }
        } else {
          // File click - dispatch event
          const event = new CustomEvent('buildmode:fileselected', { 
            detail: { path: node.path } 
          });
          document.dispatchEvent(event);
        }
      });
      
      // Recursively render children for directories
      if (node.type === 'directory' && node.children) {
        const childContainer = document.createElement('div');
        childContainer.className = 'file-tree-children';
        
        Object.entries(node.children).forEach(([childName, childNode]) => {
          renderNode(childNode, childName, childContainer, level + 1);
        });
        
        item.appendChild(childContainer);
      }
    };
    
    // Start rendering from root
    Object.entries(this.fileTree).forEach(([name, node]) => {
      renderNode(node, name, treeContainer);
    });
    
    return treeContainer;
  }
}

// Initialize when BuildMode is ready
document.addEventListener('buildmode:ready', (event) => {
  if (event.detail && event.detail.buildMode) {
    const fs = new BuildModeFileSystem(event.detail.buildMode);
    event.detail.buildMode.fs = fs;
    
    console.log('🛠️ Build Mode FS: Ready');
  }
});
