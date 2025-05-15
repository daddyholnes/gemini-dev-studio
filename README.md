# Podplay Build: Your AI Development Sanctuary

![Podplay Build](docs/images/podplay-banner.png)

## 📘 Overview

Podplay Build is a personal AI development sanctuary designed to provide a calm, empowering workflow through a persistent, agentic environment with full session memory, timeline navigation, and advanced AI capabilities. It serves as both a coding companion and a creative space for developing software projects with Mama Bear, your AI lead developer.

### 🎯 Purpose & Vision

Podplay Build transforms the software development experience by creating a stable, supportive sanctuary where ideas can flourish without the cognitive overhead typical of complex development environments. It provides an intuitive, conversation-based approach to coding backed by powerful AI capabilities, making development more accessible, enjoyable, and productive.

## ✨ Key Features

### Core Capabilities
- **Persistent Session Memory**: Every conversation, code exploration, and development decision is preserved
- **Timeline Navigation**: Visualize and revisit your development history with ease
- **Agentic Memory Management**: Branch, edit, and prune your AI's understanding of your project
- **Conversation-First Development**: Natural dialogue with Mama Bear, your Gemini-powered lead developer

### AI Integration
- **Gemini Pro Integration**: Leverages Google's advanced AI models
- **Vertex AI Support**: Enterprise-grade AI capabilities for larger projects
- **MCP (Model Context Protocol) Toolkit**: Extensible system for AI tools and capabilities

### Developer Experience
- **Docker MCP Integration**: Containerized services for extended AI capabilities
- **Web & Local Code Execution**: Run and test code directly in the environment
- **File Operations**: Create, edit, and manage project files seamlessly
- **Integrated Terminal**: Full terminal access with WebSocket connectivity

### User Interface
- **Beautiful, Calm Design**: Dark mode interface designed for long coding sessions
- **Keyboard Navigation**: Efficient shortcuts for all operations
- **ARIA Compliance**: Accessible design for all users
- **Customizable Layout**: Adapt the workspace to your preferences

## 🚀 Getting Started

### System Requirements
- **Operating System**: Windows 10/11, macOS, or Linux
- **Python**: 3.8 or higher
- **Browser**: Chrome, Firefox, Edge (latest versions)
- **Optional**: Docker for container-based MCP services

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/podplay-build.git
   cd podplay-build
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory with your API keys and configuration:
   ```env
   GEMINI_API_KEY=your-key-here
   VERTEX_PROJECT_ID=your-project-id
   SECRET_KEY=your-flask-secret
   # See docs/configuration.md for complete list
   ```

4. **Start the application**
   ```bash
   python backend/app.py
   ```

5. **Access the interface**
   Open your browser and navigate to: `http://localhost:5000`

## 🔐 Security Considerations

### API Keys & Credentials
- **Never commit** your `.env` file or any files containing credentials
- All sensitive values should be loaded via `os.environ.get('KEY')` or dotenv
- No secrets are hardcoded in the codebase

### Docker Security
- Docker containers run with minimal privileges
- MCP service containers are isolated from your system
- Review Docker security best practices in `docs/security.md`

### Code Execution Safety
- Local code execution is sandboxed
- File operations are limited to the project directory
- Security measures are detailed in `docs/security.md`

3. **Authentication**
   - If deploying publicly, add user authentication (Flask-Login, Auth0, etc.).
   - Consider OAuth for GitHub integration.

4. **Production Readiness**
   - Never run with `debug=True` in production.
   - Use HTTPS and secure cookies.
   - Review all endpoints for input validation and auth.

## Directory Structure

- `backend/` — Flask API, agentic core, session logic
- `js/` — Frontend chat, timeline, UI logic
- `css/` — Stylesheets (including `timeline.css`)
- `knowledge-base/`, `Perplexity/` — RAG and research data

## Usage
1. Install requirements: `pip install -r requirements.txt`
2. Copy `.env.example` to `.env` and fill in your secrets
3. Run Flask app: `python backend/app.py`
4. Open in browser: `http://localhost:5000`

---

## Security Checklist (Pre-GitHub Upload)
- [ ] No secrets in code or logs
- [ ] `.env` and other sensitive files in `.gitignore`
- [ ] All API keys loaded via environment variables
- [ ] Remove any test/demo keys from codebase
- [ ] Review for accidental info leaks (logging, error messages)

---

## Contributing
PRs welcome! Please open issues for suggestions, bugs, or feature requests.

---

## License
MIT (or as specified)
