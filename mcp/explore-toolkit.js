// Script to explore the mcp-toolkit package structure
import * as mcpToolkit from 'mcp-toolkit';

// Log available exports
console.log('MCP Toolkit Exports:');
console.log(Object.keys(mcpToolkit));

// Log detailed structure
console.log('\nDetailed Structure:');
for (const key of Object.keys(mcpToolkit)) {
  const value = mcpToolkit[key];
  const type = typeof value;
  
  console.log(`- ${key} (${type})`);
  
  if (type === 'object' && value !== null) {
    console.log('  Properties:', Object.keys(value));
  } else if (type === 'function') {
    console.log('  Function');
  }
}

// Test basic functionality
if (typeof mcpToolkit.createServer === 'function') {
  console.log('\nFound createServer function');
}

if (typeof mcpToolkit.startServer === 'function') {
  console.log('Found startServer function');
}

console.log('\nModule Path:', require.resolve('mcp-toolkit'));