/**
 * Start All MCP Servers
 * 
 * This script starts all configured MCP servers for Podplay Build.
 */

import { startAllServers, logger } from './index.js';

console.log('\n\x1b[36m===========================================\x1b[0m');
console.log('\x1b[32m   Starting All MCP Servers for Podplay   \x1b[0m');
console.log('\x1b[36m===========================================\x1b[0m\n');

(async () => {
  try {
    console.log('\x1b[33mLaunching your MCP servers...\x1b[0m\n');
    
    const results = await startAllServers();
    
    console.log('\n\x1b[32mResults:\x1b[0m');
    Object.entries(results).forEach(([server, success]) => {
      if (success) {
        console.log(`  \x1b[32m✓\x1b[0m ${server} started successfully`);
      } else {
        console.log(`  \x1b[31m✗\x1b[0m ${server} failed to start`);
      }
    });
    
    console.log('\n\x1b[36m===========================================\x1b[0m');
    console.log('\x1b[32m   Your Podplay Build sanctuary is now   \x1b[0m');
    console.log('\x1b[32m   connected to the MCP network! \x1b[0m');
    console.log('\x1b[36m===========================================\x1b[0m\n');
    
    console.log('\x1b[33mYou can check server status with: node status.js\x1b[0m\n');
    
    // If there were any failures, exit with error code
    const anyFailures = Object.values(results).some(success => !success);
    if (anyFailures) {
      process.exit(1);
    }
  } catch (error) {
    logger.error('Failed to start all servers:', error);
    console.error('\x1b[31mError starting MCP servers:\x1b[0m', error.message);
    process.exit(1);
  }
})();