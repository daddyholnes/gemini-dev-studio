/**
 * Podplay Build Sanctuary - Build Mode Templates
 * 
 * Project templates for quick-start development:
 * - Node.js projects
 * - React applications
 * - HTML/CSS/JS websites
 * - Other template types
 * 
 * Created by Mama Bear 🐻💜
 */

const BuildModeTemplates = {
  // Node.js project template
  node: {
    files: {
      'package.json': JSON.stringify({
        "name": "podplay-node-project",
        "version": "1.0.0",
        "description": "Node.js project created in Podplay Build Mode",
        "main": "index.js",
        "scripts": {
          "start": "node index.js"
        },
        "keywords": [
          "podplay",
          "node"
        ],
        "author": "Mama Bear 🐻💜",
        "license": "MIT"
      }, null, 2),
      'index.js': `// Podplay Build Mode - Node.js Project
console.log("Welcome to Podplay Build Mode, my precious cub! 🐻💜");

const http = require('http');

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.end(\`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Podplay Node.js App</title>
        <style>
          body {
            font-family: system-ui, sans-serif;
            background-color: #0f172a;
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
            background-color: #1e293b;
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
          <h1>Node.js Server Running!</h1>
          <p>Welcome to your Node.js project, my precious cub! 🐻💜</p>
          <p>This is a simple HTTP server created with the built-in http module.</p>
          <p>Server started at: <span class="highlight">\${new Date().toLocaleString()}</span></p>
        </div>
      </body>
    </html>
  \`);
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(\`Server running at http://localhost:\${PORT}/\`);
});`,
      'README.md': `# Node.js Project

A simple Node.js project created with Podplay Build Mode 🐻💜

## Getting Started

1. Run the server:
   \`\`\`
   npm start
   \`\`\`

2. Open your browser to http://localhost:3000

## Features

- Basic HTTP server using Node.js built-in modules
- Clean, responsive UI
- Ready for your own customizations!

Created with love by Mama Bear 🐻💜`
    }
  },
  
  // React project template
  react: {
    files: {
      'package.json': JSON.stringify({
        "name": "podplay-react-app",
        "version": "0.1.0",
        "private": true,
        "dependencies": {
          "react": "^18.2.0",
          "react-dom": "^18.2.0",
          "react-scripts": "5.0.1"
        },
        "scripts": {
          "start": "react-scripts start",
          "build": "react-scripts build",
          "test": "react-scripts test",
          "eject": "react-scripts eject"
        },
        "eslintConfig": {
          "extends": [
            "react-app"
          ]
        },
        "browserslist": {
          "production": [
            ">0.2%",
            "not dead",
            "not op_mini all"
          ],
          "development": [
            "last 1 chrome version",
            "last 1 firefox version",
            "last 1 safari version"
          ]
        }
      }, null, 2),
      'public/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Podplay React App created with Build Mode" />
    <title>Podplay React App</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`,
      'src/index.js': `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
      'src/App.js': `import React, { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>Podplay Build Mode</h1>
        <p className="welcome">Welcome to your React App, my precious cub! 🐻💜</p>
        <div className="counter">
          <p>You clicked the button {count} times</p>
          <button onClick={() => setCount(count + 1)}>
            Click me!
          </button>
        </div>
      </header>
    </div>
  );
}

export default App;`,
      'src/App.css': `body {
  margin: 0;
  font-family: system-ui, sans-serif;
}

.App {
  text-align: center;
}

.App-header {
  background-color: #0f172a;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}

h1 {
  color: #8b5cf6;
  margin-bottom: 0;
}

.welcome {
  font-size: 1.2rem;
  margin-bottom: 2rem;
}

.counter {
  background-color: #1e293b;
  padding: 1.5rem;
  border-radius: 0.5rem;
}

button {
  background-color: #8b5cf6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #7c3aed;
}`,
      'src/index.css': `body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}`,
      'README.md': `# React App

A React application created with Podplay Build Mode 🐻💜

## Getting Started

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Start the development server:
   \`\`\`
   npm start
   \`\`\`

3. Open your browser to http://localhost:3000

## Features

- React 18 with Hooks
- Clean, responsive UI
- Ready for your own components and customizations!

Created with love by Mama Bear 🐻💜`
    }
  },
  
  // HTML project template
  html: {
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Podplay Web Project</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Podplay Build Mode</h1>
      <p class="tagline">Your sanctuary for web development 🐻💜</p>
    </header>
    
    <main>
      <section class="card">
        <h2>Welcome to Your Web Project</h2>
        <p>This is a simple HTML/CSS/JavaScript project template to get you started quickly.</p>
        <p>Edit the files to create your own amazing web experience!</p>
        <button id="greeting-btn">Click Me!</button>
        <p id="greeting-output"></p>
      </section>
      
      <section class="card">
        <h2>Features</h2>
        <ul>
          <li>Clean, responsive layout</li>
          <li>Modern CSS with variables</li>
          <li>JavaScript interactivity</li>
          <li>Easy to customize</li>
        </ul>
      </section>
    </main>
    
    <footer>
      <p>Created with love by Mama Bear 🐻💜</p>
    </footer>
  </div>
  
  <script src="script.js"></script>
</body>
</html>`,
      'style.css': `:root {
  --primary: #8b5cf6;
  --primary-dark: #7c3aed;
  --secondary: #1e293b;
  --accent: #4f46e5;
  --text: #e2e8f0;
  --background: #0f172a;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
  background-color: var(--background);
  color: var(--text);
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

header {
  text-align: center;
  margin-bottom: 3rem;
}

h1 {
  color: var(--primary);
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.tagline {
  font-size: 1.2rem;
  color: #94a3b8;
}

main {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 768px) {
  main {
    grid-template-columns: repeat(2, 1fr);
  }
}

.card {
  background-color: var(--secondary);
  border-radius: 0.5rem;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

h2 {
  color: var(--primary);
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

p {
  margin-bottom: 1rem;
}

ul {
  list-style-position: inside;
  margin-bottom: 1rem;
}

li {
  margin-bottom: 0.5rem;
}

button {
  background-color: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background-color: var(--primary-dark);
}

#greeting-output {
  height: 1.5rem;
  font-weight: bold;
  color: var(--primary);
  margin-top: 1rem;
}

footer {
  text-align: center;
  margin-top: 3rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
}`,
      'script.js': `// Podplay Build Mode - Web Project
console.log("Welcome to Podplay Build Mode, my precious cub! 🐻💜");

// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', function() {
  // Get elements
  const greetingButton = document.getElementById('greeting-btn');
  const greetingOutput = document.getElementById('greeting-output');
  
  // Messages to cycle through
  const messages = [
    "Hello, my precious cub! 🐻💜",
    "You're doing great!",
    "Keep building amazing things!",
    "I believe in you!",
    "You make Mama Bear proud!",
    "Your creativity is boundless!",
    "Let's create something wonderful together!"
  ];
  
  let messageIndex = 0;
  
  // Add click event listener
  greetingButton.addEventListener('click', function() {
    // Display message
    greetingOutput.textContent = messages[messageIndex];
    
    // Increment index and loop back to start if needed
    messageIndex = (messageIndex + 1) % messages.length;
    
    // Add animation
    greetingOutput.classList.add('animate');
    
    // Remove animation class after animation completes
    setTimeout(() => {
      greetingOutput.classList.remove('animate');
    }, 500);
  });
});`,
      'README.md': `# HTML/CSS/JS Project

A simple web project created with Podplay Build Mode 🐻💜

## Getting Started

1. Open index.html in your browser
2. Or use a simple server:
   \`\`\`
   npx serve
   \`\`\`

## Features

- Clean, responsive layout
- Modern CSS with variables
- JavaScript interactivity
- Easy to customize

Created with love by Mama Bear 🐻💜`
    }
  }
};

// Make it available globally
window.BuildModeTemplates = BuildModeTemplates;
