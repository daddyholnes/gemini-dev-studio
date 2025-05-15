/**
 * Stop All MCP Servers
 * 
 * This script stops all running MCP servers for Podplay Build.
 */

import { stopAllServers, logger } from './index.js';

console.log('\n\x1b[36m===========================================\x1b[0m');
console.log('\x1b[32m   Stopping All MCP Servers for Podplay   \x1b[0m');
console.log('\x1b[36m===========================================\x1b[0m\n');

(async () => {
  try {
    console.log('\x1b[33mShutting down your MCP servers...\x1b[0m\n');
    
    const results = await stopAllServers();
    
    console.log('\n\x1b[32mResults:\x1b[0m');
    Object.entries(results).forEach(([server, success]) => {
      if (success) {
        console.log(`  \x1b[32m✓\x1b[0m ${server} stopped successfully`);
      } else {
        console.log(`  \x1b[31m✗\x1b[0m ${server} failed to stop`);
      }
    });
    
    console.log('\n\x1b[36m===========================================\x1b[0m');
    console.log('\x1b[32m   Your Podplay Build sanctuary is now   \x1b[0m');
    console.log('\x1b[32m   disconnected from the MCP network     \x1b[0m');
    console.log('\x1b[36m===========================================\x1b[0m\n');
    
    console.log('\x1b[33mYou can start servers again with: node start-all.js\x1b[0m\n');
    
    // If there were any failures, exit with error code
    const anyFailures = Object.values(results).some(success => !success);
    if (anyFailures) {
      process.exit(1);
    }
  } catch (error) {
    logger.error('Failed to stop all servers:', error);
    console.error('\x1b[31mError stopping MCP servers:\x1b[0m', error.message);
    process.exit(1);
  }
})();