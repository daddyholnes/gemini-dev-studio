# Gemini Developer Studio (Podplay Build)

## Overview
A persistent, agentic developer environment with full session memory, timeline navigation, and Gemini/Vertex AI integration. Designed for calm, empowering developer workflows.

### Key Features
- Persistent session memory (chat & doc usage)
- Timeline visualization and navigation
- Branching, editing, and pruning of agentic memory
- Conversation-first Lead Developer Agent (Gemini-powered)
- MCP tool integration: code execution, file ops, web search, etc.
- Accessible, beautiful UI (dark mode, keyboard nav, ARIA)

## Setup & Security

1. **Environment Variables**
   - All sensitive keys (Gemini, Vertex, DB, etc.) must be set in a `.env` file (not checked in to GitHub).
   - Example `.env` (never commit this!):
     ```env
     GEMINI_API_KEY=your-key-here
     VERTEX_PROJECT_ID=your-project-id
     SECRET_KEY=your-flask-secret
     # ...other secrets
     ```
   - The backend loads secrets via `os.environ` or dotenv. No secrets are hardcoded.

2. **Sensitive Logic**
   - Remove any test/demo API keys or hardcoded secrets before production or GitHub upload.
   - Review code for accidental logging or exposure of sensitive info.
   - Use `os.environ.get('KEY')` everywhere for credentials.

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
