FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=backend/app.py

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    nodejs \
    npm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Wasmer for WebAssembly runtime
RUN curl https://get.wasmer.io -sSf | sh

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Install MCP Toolkit
RUN npm install -g @modelcontextprotocol/mcp-toolkit

# Copy the rest of the application
COPY . .

# Expose ports
EXPOSE 5000 3000-3100

# Start script that runs both Flask app and MCP servers
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

# Command to run when container starts
CMD ["/start.sh"]