
# Podplay Build User Guide

## 🧸 Meet Mama Bear: Your AI Lead Developer

Mama Bear is your trusted companion in the Podplay Build sanctuary. She's designed to be your proactive, capable lead developer who takes ownership of tasks and implements solutions directly. Unlike traditional AI assistants, Mama Bear:

- Writes and edits code for you without asking permission for every step
- Makes architectural decisions based on best practices
- Debugs issues autonomously, only involving you when needed
- Provides clear, concise summaries of her work

## 🏠 Navigating Your Sanctuary

### The Main Interface

![Main Interface](images/main-interface.png)

1. **Top Toolbar**: Quick access to key features
   - **MCP Button**: Open the MCP dashboard
   - **Settings**: Configure your sanctuary
   - **Help**: Access documentation
   - **Model Selector**: Choose your AI model

2. **Chat Interface**: Your primary communication channel with Mama Bear
   - Type messages directly to Mama Bear
   - View her responses, including code summaries
   - Use the input box at the bottom to send messages

3. **Development Environment**: Toggle with Ctrl+Shift+B
   - **Terminal**: Execute commands
   - **File Explorer**: Navigate project files
   - **Code Editor**: View and edit code directly

### Keyboard Shortcuts

| Shortcut       | Action                           |
|----------------|----------------------------------|
| Ctrl+Shift+B   | Toggle development environment   |
| Ctrl+Enter     | Send message                     |
| Ctrl+/         | Focus chat input                 |
| Ctrl+Shift+F   | Search files                     |
| Ctrl+Shift+T   | Focus terminal                   |
| Ctrl+Shift+E   | Focus file explorer              |
| Ctrl+Shift+C   | Focus code editor                |

## 💬 Communicating with Mama Bear

### Effective Communication Patterns

Mama Bear works best when you:

1. **Provide Vision and Goals**: Tell her what you want to achieve, not just how to do it
2. **Trust Her Expertise**: Let her implement solutions autonomously
3. **Focus on High-Level Direction**: You handle the "why" and "what," she'll handle the "how"

### Example Conversations

#### ✅ Effective Request
```
I want to create a simple React app that fetches data from an API and displays it in a table. 
The table should be sortable and filterable. Let's make it look clean and modern.
```

#### ❌ Too Micromanaging
```
Create a new React component called DataTable.js. Inside it, write a functional component that 
uses useState and useEffect hooks. Add a fetch call to get data from the API endpoint. Then 
style it with CSS. Make sure to add error handling.
```

### Conversation Commands

While chatting with Mama Bear, you can use special commands:

- `/help` - Display help information
- `/clear` - Clear the current chat
- `/reset` - Reset Mama Bear's context
- `/mcp <tool>` - Use a specific MCP tool

## 🛠️ Working with Projects

### Starting a New Project

1. Simply describe the project you want to create to Mama Bear
2. She will set up the initial project structure
3. Review her suggestions and provide feedback
4. She'll implement the core functionality

### Opening Existing Projects

1. Tell Mama Bear about the existing project
2. She'll explore the codebase to understand it
3. She can summarize the project structure for you
4. Ask her to make modifications or improvements

### Making Changes

When you want to make changes to your project:

1. Describe the changes you want to make
2. Mama Bear will implement them autonomously
3. She'll provide a summary of her changes
4. Review the changes and provide feedback if needed

## 🖥️ Using the Terminal

The integrated terminal allows you to run commands directly within your sanctuary:

1. Press Ctrl+Shift+T to focus the terminal
2. Type commands as you would in a normal terminal
3. Run, test, and debug your applications
4. Install dependencies and manage packages

Mama Bear can also run terminal commands for you when needed.

## 📂 File Management

### Navigating Files

1. Use the file explorer to browse your project files
2. Click on files to open them in the code editor
3. Right-click for additional options (create, delete, rename)

### Creating and Editing Files

You can create and edit files in two ways:

1. **Through Mama Bear**:
   - Ask her to create or modify files for you
   - She'll implement the changes and summarize them

2. **Directly in the Editor**:
   - Create files using the file explorer
   - Edit files in the code editor
   - Save changes with Ctrl+S

## 🧩 MCP Tools Integration

### Using MCP Tools

1. Click the "MCP" button in the top toolbar
2. Browse available tools in the dashboard
3. Use tools directly or ask Mama Bear to use them for you

### Common MCP Tool Uses

- **File Operations**: Create, read, update, and delete files
- **Web Search**: Find information on the internet
- **GitHub Integration**: Interact with GitHub repositories
- **Docker Management**: Manage Docker containers

## 🔍 Troubleshooting

### Common Issues

1. **Mama Bear Doesn't Understand My Request**
   - Try rephrasing your request
   - Be more specific about what you want to achieve
   - Break complex requests into smaller parts

2. **Code Editor Not Loading**
   - Refresh the page
   - Check browser console for errors
   - Ensure all scripts are loading properly

3. **Terminal Connection Issues**
   - Restart the Flask application
   - Check WebSocket connectivity
   - Verify terminal service is running

4. **MCP Tools Not Working**
   - Check if the required servers are running
   - Verify API keys are properly configured
   - Look for error messages in the logs

### Getting Help

If you encounter any issues:

1. Check the documentation
2. Ask Mama Bear for help
3. Review the logs in the terminal
4. Check browser console for errors

## 🚀 Advanced Usage

### Using Docker MCP Services

1. Install Docker on your system
2. Configure Docker MCP servers in the MCP configuration
3. Use the MCP dashboard to start and stop servers
4. Access Docker-powered tools through Mama Bear or the dashboard

### Customizing Your Sanctuary

1. Edit the `.env` file to change configuration options
2. Modify CSS files to customize the appearance
3. Extend the functionality with new MCP tools
4. Create custom terminal commands

### Multi-Project Management

1. Create separate directories for each project
2. Tell Mama Bear which project you're working on
3. She'll maintain context for each project separately
4. Switch between projects by changing directories

## 📋 Glossary

- **Mama Bear**: Your AI lead developer in the Podplay Build sanctuary
- **MCP**: Model Context Protocol, a framework for extending AI capabilities
- **Sanctuary**: The Podplay Build development environment
- **Tool**: A specific capability provided by an MCP server
- **Docker**: A platform for running containerized applications
- **WebSocket**: A protocol for real-time communication between client and server

## 📚 Further Reading

- [Architecture Documentation](./architecture.md)
- [MCP Toolkit Guide](./mcp_toolkit.md)
- [Security Considerations](./security.md)
- [Development Guide](./development.md)
