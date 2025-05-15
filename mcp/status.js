/**
 * Check MCP Server Status
 * 
 * This script displays the status of all configured MCP servers for Podplay Build.
 */

import { getServerStatus, logger } from './index.js';

console.log('\n\x1b[36m===========================================\x1b[0m');
console.log('\x1b[32m   Podplay Build MCP Server Status   \x1b[0m');
console.log('\x1b[36m===========================================\x1b[0m\n');

(async () => {
  try {
    console.log('\x1b[33mChecking your MCP servers status...\x1b[0m\n');
    
    const status = getServerStatus();
    
    if (Object.keys(status).length === 0) {
      console.log('\x1b[33mNo MCP servers are configured.\x1b[0m\n');
      return;
    }
    
    console.log('\x1b[32mServer Status:\x1b[0m');
    Object.entries(status).forEach(([server, serverStatus]) => {
      const isRunning = serverStatus.running;
      const healthStatus = serverStatus.health || 'unknown';
      const statusColor = isRunning ? '\x1b[32m' : '\x1b[31m';
      const statusSymbol = isRunning ? '✓' : '✗';
      const healthColor = 
        healthStatus === 'healthy' ? '\x1b[32m' : 
        healthStatus === 'degraded' ? '\x1b[33m' : 
        healthStatus === 'unhealthy' ? '\x1b[31m' : '\x1b[90m';
      
      console.log(`  ${statusColor}${statusSymbol}\x1b[0m ${server.padEnd(20)} Status: ${statusColor}${isRunning ? 'Running' : 'Stopped'}\x1b[0m   Health: ${healthColor}${healthStatus}\x1b[0m`);
      
      if (serverStatus.port) {
        console.log(`    Port: ${serverStatus.port}`);
      }
      
      if (serverStatus.uptime) {
        const uptime = Math.floor(serverStatus.uptime / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;
        console.log(`    Uptime: ${hours}h ${minutes}m ${seconds}s`);
      }
      
      if (serverStatus.tools && serverStatus.tools.length > 0) {
        console.log(`    Available Tools: ${serverStatus.tools.length}`);
      }
      
      console.log('');
    });
    
    // Count running servers
    const runningCount = Object.values(status).filter(s => s.running).length;
    const totalCount = Object.keys(status).length;
    
    console.log('\x1b[36m===========================================\x1b[0m');
    console.log(`\x1b[32m   ${runningCount}/${totalCount} servers running\x1b[0m`);
    console.log('\x1b[36m===========================================\x1b[0m\n');
    
    if (runningCount < totalCount) {
      console.log('\x1b[33mStart all servers with: node start-all.js\x1b[0m\n');
    }
    
    if (runningCount > 0) {
      console.log('\x1b[33mStop all servers with: node stop-all.js\x1b[0m\n');
    }
    
  } catch (error) {
    logger.error('Failed to check server status:', error);
    console.error('\x1b[31mError checking MCP server status:\x1b[0m', error.message);
    process.exit(1);
  }
})();