/**
 * Podplay Build File Explorer
 * 
 * A powerful file explorer component that integrates with the terminal
 * and allows browsing, creating, and editing files in the workspace.
 */

class FileExplorer {
  constructor(options = {}) {
    this.options = {
      containerId: 'podplay-file-explorer',
      wsUrl: `ws://${window.location.host}/files`,
      rootPath: '/',
      ...options
    };
    
    this.container = null;
    this.tree = null;
    this.socket = null;
    this.isInitialized = false;
    this.currentPath = this.options.rootPath;
    this.files = [];
    this.selectedFile = null;
    this.eventListeners = {};
  }
  
  async init() {
    if (this.isInitialized) return this;
    
    // Create UI elements
    this.createElements();
    
    // Try to connect to WebSocket
    this.connectWebSocket();
    
    // Load initial files
    await this.loadFiles(this.currentPath);
    
    // Register event handlers
    this.registerEventHandlers();
    
    this.isInitialized = true;
    return this;
  }
  
  createElements() {
    // Check if container already exists
    let container = document.getElementById(this.options.containerId);
    if (container) {
      this.container = container;
      return;
    }
    
    // Create container
    container = document.createElement('div');
    container.id = this.options.containerId;
    container.className = 'podplay-file-explorer';
    
    // Apply styles
    Object.assign(container.style, {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#1a1a1a',
      color: '#e0e0e0',
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: '14px',
      borderRight: '1px solid #333',
      overflow: 'hidden'
    });
    
    // Create header
    const header = document.createElement('div');
    header.className = 'file-explorer-header';
    header.innerHTML = `
      <div class="file-explorer-title">📁 Files</div>
      <div class="file-explorer-controls">
        <button id="file-explorer-refresh" title="Refresh">🔄</button>
        <button id="file-explorer-create" title="New File">+</button>
      </div>
    `;
    
    // Style header
    Object.assign(header.style, {
      padding: '8px',
      borderBottom: '1px solid #333',
      backgroundColor: '#252525',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    });
    
    // Create tree container
    const treeContainer = document.createElement('div');
    treeContainer.id = `${this.options.containerId}-tree`;
    treeContainer.className = 'file-explorer-tree';
    
    // Style tree container
    Object.assign(treeContainer.style, {
      flex: '1',
      overflow: 'auto',
      padding: '8px'
    });
    
    // Assemble container
    container.appendChild(header);
    container.appendChild(treeContainer);
    
    // Add to document
    document.querySelector('.sidebar') ? 
      document.querySelector('.sidebar').appendChild(container) : 
      document.body.appendChild(container);
    
    this.container = container;
    this.tree = treeContainer;
  }
  
  connectWebSocket() {
    try {
      // For now, we'll use the terminal socket for simplicity
      // In a full implementation, there would be a dedicated file WebSocket
      this.socket = window.podplayTerminal ? 
        window.podplayTerminal.socket : null;
      
      if (!this.socket) {
        console.warn('File explorer WebSocket connection not available');
      }
    } catch (e) {
      console.error('Failed to connect WebSocket:', e);
    }
  }
  
  async loadFiles(path) {
    try {
      // For now, we'll use the terminal to get file listings
      if (window.podplayTerminal) {
        window.podplayTerminal.execute_command(`ls ${path}`);
        
        // In the future, we'd retrieve the file list directly
        // and update this.files with the results
        
        // For demo purposes, we'll create some dummy files
        this.files = [
          { name: 'index.html', type: 'file', path: '/index.html' },
          { name: 'styles.css', type: 'file', path: '/styles.css' },
          { name: 'app.js', type: 'file', path: '/app.js' },
          { name: 'images', type: 'directory', path: '/images' },
          { name: 'README.md', type: 'file', path: '/README.md' }
        ];
        
        this.renderFileTree();
      } else {
        console.warn('Terminal not available for file operations');
      }
    } catch (e) {
      console.error('Error loading files:', e);
    }
  }
  
  renderFileTree() {
    if (!this.tree) return;
    
    // Clear existing content
    this.tree.innerHTML = '';
    
    // Create file list
    const ul = document.createElement('ul');
    ul.className = 'file-tree';
    ul.style.listStyle = 'none';
    ul.style.padding = '0';
    ul.style.margin = '0';
    
    // Add parent directory (except at root)
    if (this.currentPath !== '/') {
      const parentPath = this.currentPath.split('/').slice(0, -1).join('/') || '/';
      const li = document.createElement('li');
      li.innerHTML = `<div class="file-item"><span class="file-icon">📁</span><span class="file-name">..</span></div>`;
      li.style.padding = '4px 0';
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => this.navigateTo(parentPath));
      ul.appendChild(li);
    }
    
    // Sort files (directories first, then alphabetically)
    const sortedFiles = [...this.files].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    
    // Add each file
    for (const file of sortedFiles) {
      const li = document.createElement('li');
      const isDirectory = file.type === 'directory';
      const icon = isDirectory ? '📁' : this.getFileIcon(file.name);
      
      li.innerHTML = `<div class="file-item"><span class="file-icon">${icon}</span><span class="file-name">${file.name}</span></div>`;
      li.style.padding = '4px 0';
      li.style.cursor = 'pointer';
      
      // Add click handler
      if (isDirectory) {
        li.addEventListener('click', () => this.navigateTo(file.path));
      } else {
        li.addEventListener('click', () => this.selectFile(file));
        
        // Add double click handler to open file
        li.addEventListener('dblclick', () => this.openFile(file));
      }
      
      // Add context menu
      li.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showContextMenu(e, file);
      });
      
      ul.appendChild(li);
    }
    
    this.tree.appendChild(ul);
  }
  
  navigateTo(path) {
    this.currentPath = path;
    this.loadFiles(path);
  }
  
  selectFile(file) {
    // Remove selection from previous file
    if (this.selectedFile) {
      const elements = document.querySelectorAll('.file-item.selected');
      elements.forEach(el => el.classList.remove('selected'));
    }
    
    this.selectedFile = file;
    
    // Add selection to new file
    const filename = file.name;
    const elements = Array.from(document.querySelectorAll('.file-name'))
      .filter(el => el.textContent === filename);
      
    elements.forEach(el => el.parentElement.classList.add('selected'));
    
    // Trigger selection event
    this.trigger('fileSelected', file);
  }
  
  openFile(file) {
    // In a full implementation, this would open the file in the editor
    this.trigger('fileOpened', file);
    
    // For now, we'll use the terminal to show the file contents
    if (window.podplayTerminal) {
      window.podplayTerminal.execute_command(`cat ${file.path}`);
    }
  }
  
  showContextMenu(event, file) {
    // Remove any existing context menus
    const existing = document.querySelector('.file-context-menu');
    if (existing) existing.remove();
    
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'file-context-menu';
    
    // Style the menu
    Object.assign(menu.style, {
      position: 'fixed',
      zIndex: '1000',
      backgroundColor: '#252525',
      border: '1px solid #333',
      borderRadius: '4px',
      padding: '4px 0',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
      minWidth: '150px'
    });
    
    // Position the menu
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    
    // Add menu items based on file type
    if (file.type === 'directory') {
      this.addMenuItem(menu, 'Open', () => this.navigateTo(file.path));
      this.addMenuItem(menu, 'New File', () => this.createNewFile(file.path));
      this.addMenuItem(menu, 'New Folder', () => this.createNewFolder(file.path));
    } else {
      this.addMenuItem(menu, 'Open', () => this.openFile(file));
      this.addMenuItem(menu, 'Edit', () => this.editFile(file));
      this.addMenuItem(menu, 'Rename', () => this.renameFile(file));
      this.addMenuItem(menu, 'Delete', () => this.deleteFile(file));
    }
    
    // Add the menu to the document
    document.body.appendChild(menu);
    
    // Close the menu when clicking outside
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    
    // Add a small delay before listening for clicks
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 10);
  }
  
  addMenuItem(menu, text, onClick) {
    const item = document.createElement('div');
    item.className = 'file-context-menu-item';
    item.textContent = text;
    
    // Style the menu item
    Object.assign(item.style, {
      padding: '6px 12px',
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    });
    
    // Add hover effect
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = '#333';
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
    });
    
    // Add click handler
    item.addEventListener('click', onClick);
    
    menu.appendChild(item);
  }
  
  createNewFile(path) {
    const filename = prompt('Enter file name:');
    if (!filename) return;
    
    const fullPath = path ? `${path}/${filename}` : `${this.currentPath}/${filename}`;
    
    // Execute the touch command in the terminal
    if (window.podplayTerminal) {
      window.podplayTerminal.execute_command(`touch ${fullPath}`);
      
      // Refresh the file list
      setTimeout(() => this.loadFiles(this.currentPath), 500);
    }
  }
  
  createNewFolder(path) {
    const foldername = prompt('Enter folder name:');
    if (!foldername) return;
    
    const fullPath = path ? `${path}/${foldername}` : `${this.currentPath}/${foldername}`;
    
    // Execute the mkdir command in the terminal
    if (window.podplayTerminal) {
      window.podplayTerminal.execute_command(`mkdir ${fullPath}`);
      
      // Refresh the file list
      setTimeout(() => this.loadFiles(this.currentPath), 500);
    }
  }
  
  editFile(file) {
    // In a full implementation, this would open the file in the editor
    // For now, we'll just display the file contents
    this.openFile(file);
  }
  
  renameFile(file) {
    const newName = prompt('Enter new name:', file.name);
    if (!newName || newName === file.name) return;
    
    // In a full implementation, we would execute a rename/mv command
    // For demo purposes, we'll just log it
    console.log(`Renaming ${file.path} to ${newName}`);
    
    // Refresh the file list
    setTimeout(() => this.loadFiles(this.currentPath), 500);
  }
  
  deleteFile(file) {
    if (!confirm(`Are you sure you want to delete ${file.name}?`)) return;
    
    // In a full implementation, we would execute a delete/rm command
    // For demo purposes, we'll just log it
    console.log(`Deleting ${file.path}`);
    
    // Refresh the file list
    setTimeout(() => this.loadFiles(this.currentPath), 500);
  }
  
  registerEventHandlers() {
    // Register refresh button handler
    const refreshBtn = document.getElementById('file-explorer-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadFiles(this.currentPath));
    }
    
    // Register create button handler
    const createBtn = document.getElementById('file-explorer-create');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.createNewFile());
    }
  }
  
  getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    
    // File icons based on extension
    const icons = {
      html: '🌐',
      htm: '🌐',
      css: '🎨',
      js: '📜',
      jsx: '⚛️',
      ts: '📘',
      tsx: '⚛️',
      json: '📋',
      md: '📝',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      svg: '🖼️',
      pdf: '📄',
      txt: '📃',
      // Add more as needed
    };
    
    return icons[ext] || '📄';
  }
  
  // Event handling
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
    return this;
  }
  
  off(event, callback) {
    if (!this.eventListeners[event]) return this;
    
    if (callback) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    } else {
      delete this.eventListeners[event];
    }
    return this;
  }
  
  trigger(event, data) {
    if (!this.eventListeners[event]) return;
    
    this.eventListeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error(`Error in event handler for ${event}:`, e);
      }
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FileExplorer;
} else {
  window.FileExplorer = FileExplorer;
}