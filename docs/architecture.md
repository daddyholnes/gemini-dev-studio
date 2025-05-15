# Podplay Build Architecture

## System Overview

Podplay Build is architected as a modern web application with a Python Flask backend and a vanilla JavaScript frontend, creating a lightweight yet powerful AI development sanctuary. This document outlines the core architectural components and their interactions.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                            │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────────┐ │
│ │ Chat      │ │ Terminal  │ │ Code      │ │ File Explorer     │ │
│ │ Interface │ │ Component │ │ Editor    │ │ Component         │ │
│ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────────┬─────────┘ │
│       │             │             │                 │           │
│ ┌─────▼─────────────▼─────────────▼─────────────────▼─────────┐ │
│ │                  WebSocket & HTTP API Layer                  │ │
│ └───────────────────────────────┬───────────────────────────┬─┘ │
└────────────────────────────────┬┴───────────────────────────┘───┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│                         BACKEND LAYER                            │
│ ┌────────────────┐ ┌────────────────┐ ┌─────────────────────┐   │
│ │ Flask Web      │ │ WebSocket      │ │ MCP Toolkit Bridge  │   │
│ │ Server         │ │ Server         │ │                     │   │
│ └───────┬────────┘ └────────┬───────┘ └─────────┬───────────┘   │
│         │                   │                   │               │
│ ┌───────▼───────────────────▼───────────────────▼─────────────┐ │
│ │                     Core Services Layer                      │ │
│ │ ┌──────────────┐ ┌────────────┐ ┌─────────────┐ ┌─────────┐ │ │
│ │ │ Gemini/Vertex│ │ Terminal   │ │ Docker MCP  │ │ File    │ │ │
│ │ │ AI Bridge    │ │ Handler    │ │ Handler     │ │ Manager │ │ │
│ │ └──────────────┘ └────────────┘ └─────────────┘ └─────────┘ │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│ ┌────────────────────────────▼────────────────────────────────┐ │
│ │                      Storage Layer                           │ │
│ │  ┌───────────┐  ┌──────────────┐  ┌──────────────────────┐  │ │
│ │  │ SQLite DB │  │ File System  │  │  Memory Store        │  │ │
│ │  └───────────┘  └──────────────┘  └──────────────────────┘  │ │
│ └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

             ▲                                   ▲
             │                                   │
┌────────────┼───────────────────┐ ┌─────────────┼─────────────────┐
│  Google Gemini/Vertex AI API   │ │  Docker MCP Services          │
└────────────────────────────────┘ └───────────────────────────────┘
```

## Key Components

### Frontend Layer

1. **Chat Interface**: Provides the primary conversational interface with Mama Bear.
   - Located in: `frontend/index.html` (chat component)
   - Key files: `frontend/js/chat-interface.js`

2. **Terminal Component**: WebSocket-powered terminal for command execution.
   - Located in: `frontend/js/terminal/`
   - Key files: `terminal.js`, `command-handlers.js`

3. **Code Editor**: Monaco-based code editor for creating and editing files.
   - Located in: `frontend/js/code-editor/`
   - Key files: `code-editor.js`

4. **File Explorer**: Interface for navigating and managing project files.
   - Located in: `frontend/js/file-explorer/`
   - Key files: `file-explorer.js`

5. **MCP Dashboard**: UI for managing MCP servers and tools.
   - Located in: `frontend/js/mcp/`
   - Key files: `mcp-dashboard.js`, `docker-mcp-manager.js`

### Backend Layer

1. **Flask Web Server**: Main application server handling HTTP requests.
   - Located in: `backend/app.py`
   - Core routes: `/api/agentic/chat`, `/api/files/*`, etc.

2. **WebSocket Server**: Manages real-time communication for terminal.
   - Located in: `backend/app.py` (within Flask using Flask-Sock)
   - Key endpoints: `/terminal`

3. **MCP Toolkit Bridge**: Interface to the Model Context Protocol toolkit.
   - Located in: `backend/mcp_toolkit_bridge.py`
   - Connects to both native and Docker MCP servers

4. **Core Services**:
   - **Gemini/Vertex AI Bridge**: Integration with Google's AI models.
     - Located in: `backend/gemini_bridge.py`
   - **Terminal Handler**: Manages terminal sessions and command execution.
     - Located in: `backend/terminal_handler.py`
   - **Docker MCP Handler**: Manages Docker-based MCP services.
     - Located in: `backend/docker_mcp_handler.py`
   - **File Manager**: Handles file system operations.
     - Located in: `backend/file_manager.py`

5. **Storage Layer**:
   - **SQLite Database**: Stores chat history, session data, and settings.
     - Located in: `~/.podplay/podplay_data.db`
   - **File System**: Stores project files and temporary data.
   - **Memory Store**: In-memory storage for session management.

## Communication Flow

1. **User Interaction**: User interacts with the frontend interface (chat, terminal, editor).

2. **Frontend to Backend Communication**:
   - **HTTP API Calls**: For most operations (file management, chat, settings).
   - **WebSocket Communication**: For real-time terminal operations.

3. **Backend Processing**:
   - Chat messages are processed through the Gemini/Vertex AI Bridge.
   - File operations are handled by the File Manager.
   - Terminal commands are executed by the Terminal Handler.
   - MCP tools are accessed through the MCP Toolkit Bridge.

4. **External Service Communication**:
   - Google Gemini/Vertex AI: For AI model queries.
   - Docker: For managing containerized MCP services.

5. **Response to Frontend**: Results are returned to the frontend and displayed to the user.

## Data Flow

1. **Chat Sessions**:
   - User messages → Flask API → Gemini Bridge → AI Model → Response → Frontend Display
   - Chat history is stored in SQLite DB for persistence.

2. **Terminal Commands**:
   - User commands → WebSocket → Terminal Handler → Command Execution → Response → Terminal Display
   - Terminal state is ephemeral and not persisted between sessions.

3. **File Operations**:
   - File requests → Flask API → File Manager → File System → Response → File Explorer/Editor Display
   - Files are stored on the local file system.

4. **MCP Tool Execution**:
   - Tool request → Flask API → MCP Toolkit Bridge → MCP Server (Native or Docker) → Tool Execution → Response → Frontend Display

## Security Architecture

1. **API Key Management**:
   - All keys stored in environment variables (.env file)
   - Never exposed to frontend
   - Accessed via os.environ in backend code

2. **Terminal Isolation**:
   - Commands executed in controlled environment
   - Limited to specified working directories
   - Potentially dangerous commands are restricted

3. **File System Security**:
   - Operations limited to project directory
   - Path traversal attacks prevented
   - Permissions enforced for file operations

4. **Docker Containerization**:
   - MCP services run in isolated containers
   - Limited port exposure
   - Resource constraints enforced

5. **Input Validation**:
   - All user inputs sanitized
   - API parameters validated
   - JSON data schema-validated

## Technology Stack

### Frontend
- Vanilla JavaScript (ES6+)
- HTML5/CSS3
- Monaco Editor (for code editing)
- XTerm.js (for terminal emulation)
- WebSockets (for real-time communication)

### Backend
- Python 3.8+
- Flask (web framework)
- Flask-Sock (WebSocket support)
- SQLite (database)
- Docker SDK for Python (container management)
- Gemini/Vertex AI Python Client

### External Services
- Google Gemini Pro / Vertex AI
- Docker (for MCP services)
- Model Context Protocol (MCP) Tools

## Development & Extension

See [Development Guide](./development.md) for information on extending Podplay Build with new features, MCP tools, or integrations.
