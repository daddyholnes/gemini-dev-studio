/**
 * Podplay Build Sanctuary - MCP Dashboard
 * 
 * Controls the MCP (Model Context Protocol) dashboard that allows
 * environment control and Docker service management.
 * 
 * Features:
 * - Start/stop MCP services (Docker containers)
 * - Monitor service status
 * - Configure MCP settings
 * - Launch interactive tools
 * 
 * Created by Mama Bear 🐻💜
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔌 MCP Dashboard: Initializing');
    
    // Get dashboard elements
    const mcpDashboardBtn = document.getElementById('mcp-dashboard-btn');
    const mcpDashboard = document.getElementById('mcp-dashboard');
    const mcpCloseBtn = document.getElementById('mcp-close-btn');
    const mcpServiceList = document.getElementById('mcp-service-list');
    const mcpRefreshBtn = document.getElementById('mcp-refresh-btn');
    
    // Check if elements exist
    if (!mcpDashboardBtn || !mcpDashboard) {
        console.warn('🔌 MCP Dashboard: Required elements not found');
        return;
    }
    
    // Dashboard state
    let dashboardVisible = false;
    let mcpServices = [];
    let lastUpdateTime = null;
    
    // Initialize
    initDashboard();
    
    /**
     * Initialize the MCP Dashboard
     */
    function initDashboard() {
        // Set up event listeners
        mcpDashboardBtn.addEventListener('click', toggleDashboard);
        
        if (mcpCloseBtn) {
            mcpCloseBtn.addEventListener('click', toggleDashboard);
        }
        
        if (mcpRefreshBtn) {
            mcpRefreshBtn.addEventListener('click', refreshServices);
        }
        
        // Initial load of services
        refreshServices();
        
        // Set up auto-refresh
        setInterval(refreshServices, 30000);
    }
    
    /**
     * Toggle dashboard visibility
     */
    function toggleDashboard() {
        dashboardVisible = !dashboardVisible;
        
        if (dashboardVisible) {
            mcpDashboard.classList.add('visible');
            refreshServices();
        } else {
            mcpDashboard.classList.remove('visible');
        }
    }
    
    /**
     * Refresh MCP services
     */
    function refreshServices() {
        // Don't refresh if dashboard isn't visible
        if (!dashboardVisible) return;
        
        // Update status indicator
        const statusElement = document.getElementById('mcp-status');
        if (statusElement) {
            statusElement.innerHTML = '⏳ Refreshing...';
            statusElement.className = 'mcp-status refreshing';
        }
        
        // Make API call to get service status
        fetch('/api/mcp/services')
            .then(response => response.json())
            .then(data => {
                mcpServices = data.services || [];
                updateServiceList();
                
                // Update status
                if (statusElement) {
                    const runningCount = mcpServices.filter(s => s.status === 'running').length;
                    statusElement.innerHTML = `✅ ${runningCount}/${mcpServices.length} services running`;
                    statusElement.className = 'mcp-status online';
                }
                
                // Update timestamp
                lastUpdateTime = new Date();
                const timestampElement = document.getElementById('mcp-timestamp');
                if (timestampElement) {
                    timestampElement.textContent = formatTime(lastUpdateTime);
                }
            })
            .catch(error => {
                console.error('🔌 MCP Dashboard: Error fetching services', error);
                
                // Update status on error
                if (statusElement) {
                    statusElement.innerHTML = '❌ Connection error';
                    statusElement.className = 'mcp-status error';
                }
                
                // Show mockup data in development
                if (process.env.NODE_ENV === 'development') {
                    mcpServices = getMockServices();
                    updateServiceList();
                }
            });
    }
    
    /**
     * Update the service list in the dashboard
     */
    function updateServiceList() {
        if (!mcpServiceList) return;
        
        // Clear existing items
        mcpServiceList.innerHTML = '';
        
        // Handle empty state
        if (mcpServices.length === 0) {
            mcpServiceList.innerHTML = '<div class="mcp-empty">No MCP services found</div>';
            return;
        }
        
        // Create service items
        mcpServices.forEach(service => {
            const serviceItem = document.createElement('div');
            serviceItem.className = `mcp-service-item ${service.status}`;
            
            // Status indicator
            const statusIcon = service.status === 'running' ? '🟢' :
                service.status === 'stopped' ? '🔴' :
                service.status === 'restarting' ? '🟠' : '⚪';
            
            serviceItem.innerHTML = `
                <div class="mcp-service-name">
                    <span class="mcp-status-icon">${statusIcon}</span>
                    ${service.name}
                </div>
                <div class="mcp-service-actions">
                    <button class="mcp-action-btn ${service.status === 'running' ? 'stop' : 'start'}"
                        data-service="${service.id}"
                        data-action="${service.status === 'running' ? 'stop' : 'start'}">
                        ${service.status === 'running' ? 'Stop' : 'Start'}
                    </button>
                    <button class="mcp-action-btn restart"
                        data-service="${service.id}" 
                        data-action="restart">
                        Restart
                    </button>
                </div>
            `;
            
            mcpServiceList.appendChild(serviceItem);
            
            // Add event listeners for buttons
            const buttons = serviceItem.querySelectorAll('.mcp-action-btn');
            buttons.forEach(button => {
                button.addEventListener('click', handleServiceAction);
            });
        });
    }
    
    /**
     * Handle service actions (start, stop, restart)
     */
    function handleServiceAction(event) {
        const button = event.currentTarget;
        const serviceId = button.dataset.service;
        const action = button.dataset.action;
        
        // Disable button during action
        button.disabled = true;
        button.textContent = '...';
        
        console.log(`🔌 MCP Dashboard: ${action} service ${serviceId}`);
        
        // Make API call
        fetch(`/api/mcp/service/${serviceId}/${action}`, {
            method: 'POST'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Refresh to get updated status
                    setTimeout(refreshServices, 1000);
                    
                    // Show feedback
                    const feedbackElement = document.getElementById('mcp-feedback');
                    if (feedbackElement) {
                        feedbackElement.textContent = `Service ${action} request successful`;
                        feedbackElement.className = 'mcp-feedback success';
                        setTimeout(() => {
                            feedbackElement.textContent = '';
                            feedbackElement.className = 'mcp-feedback';
                        }, 3000);
                    }
                } else {
                    console.error(`🔌 MCP Dashboard: ${action} failed`, data.error);
                    button.disabled = false;
                    button.textContent = action;
                    
                    // Show error feedback
                    const feedbackElement = document.getElementById('mcp-feedback');
                    if (feedbackElement) {
                        feedbackElement.textContent = `Error: ${data.error || 'Unknown error'}`;
                        feedbackElement.className = 'mcp-feedback error';
                        setTimeout(() => {
                            feedbackElement.textContent = '';
                            feedbackElement.className = 'mcp-feedback';
                        }, 3000);
                    }
                }
            })
            .catch(error => {
                console.error(`🔌 MCP Dashboard: ${action} error`, error);
                button.disabled = false;
                button.textContent = action;
                
                // Show error feedback
                const feedbackElement = document.getElementById('mcp-feedback');
                if (feedbackElement) {
                    feedbackElement.textContent = 'Connection error';
                    feedbackElement.className = 'mcp-feedback error';
                    setTimeout(() => {
                        feedbackElement.textContent = '';
                        feedbackElement.className = 'mcp-feedback';
                    }, 3000);
                }
            });
    }
    
    /**
     * Format time for display
     */
    function formatTime(date) {
        if (!date) return '';
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }
    
    /**
     * Get mock services for development
     */
    function getMockServices() {
        return [
            { id: 'brave-search', name: 'Brave Search', status: 'running' },
            { id: 'filesystem', name: 'Filesystem', status: 'running' },
            { id: 'github', name: 'GitHub', status: 'stopped' },
            { id: 'time', name: 'Time Service', status: 'running' },
            { id: 'code', name: 'Code Runner', status: 'running' },
            { id: 'data-viz', name: 'Data Visualization', status: 'stopped' }
        ];
    }
    
    // Expose public methods
    window.MCPDashboard = {
        toggle: toggleDashboard,
        refresh: refreshServices
    };
});
