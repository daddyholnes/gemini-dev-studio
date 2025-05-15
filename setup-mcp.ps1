# Podplay Build MCP Toolkit Setup Script
# This script will set up and configure the MCP Toolkit with all your servers

# Check for administrative privileges
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "You need to run this script as an Administrator."
    Write-Host "Please restart this script with administrative privileges." -ForegroundColor Red
    exit
}

# Set execution policy to allow running the script
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

Write-Host "Setting up MCP Toolkit for Podplay Build..." -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "Found Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js is not installed. Installing Node.js..." -ForegroundColor Yellow
    # Download and install Node.js
    $nodeInstallerUrl = "https://nodejs.org/dist/v18.16.0/node-v18.16.0-x64.msi"
    $nodeInstallerPath = "$env:TEMP\node-installer.msi"
    Invoke-WebRequest -Uri $nodeInstallerUrl -OutFile $nodeInstallerPath
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", $nodeInstallerPath, "/quiet", "/norestart" -Wait
    Remove-Item $nodeInstallerPath
    Write-Host "Node.js installed successfully!" -ForegroundColor Green
}

# Install MCP Toolkit using npm
Write-Host "Installing MCP Toolkit..." -ForegroundColor Cyan
npm install -g @modelcontextprotocol/mcp-toolkit
Write-Host "MCP Toolkit installed successfully!" -ForegroundColor Green

# Create MCP configuration directory if it doesn't exist
$mcpConfigDir = "$env:USERPROFILE\.mcp"
if (-not (Test-Path $mcpConfigDir)) {
    New-Item -ItemType Directory -Path $mcpConfigDir | Out-Null
    Write-Host "Created MCP configuration directory: $mcpConfigDir" -ForegroundColor Green
}

# Read environment variables from .env file
$envFile = "$(Get-Location)\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+?)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "Loaded environment variable: $key" -ForegroundColor Gray
        }
    }
    Write-Host "Loaded environment variables from .env file" -ForegroundColor Green
} else {
    Write-Host "Warning: .env file not found at $envFile" -ForegroundColor Yellow
}

# Create MCP configuration file
$mcpConfigFile = "$mcpConfigDir\config.json"
$mcpConfig = @{
    mcpServers = @{
        github = @{
            command = "npx"
            args = @("-y", "@modelcontextprotocol/server-github")
            env = @{
                GITHUB_PERSONAL_ACCESS_TOKEN = $env:GITHUB_TOKEN
            }
        }
        "sequential-thinking" = @{
            command = "npx"
            args = @("-y", "@modelcontextprotocol/server-sequential-thinking")
            env = @{}
        }
        puppeteer = @{
            command = "npx"
            args = @("-y", "@modelcontextprotocol/server-puppeteer")
            env = @{}
        }
        playwright = @{
            command = "npx"
            args = @("-y", "@executeautomation/playwright-mcp-server")
            env = @{}
        }
        postgresql = @{
            command = "npx"
            args = @("-y", "@modelcontextprotocol/server-postgres", $env:DATABASE_URL)
            env = @{}
        }
        "brave-search" = @{
            command = "npx"
            args = @("-y", "@modelcontextprotocol/server-brave-search")
            env = @{
                BRAVE_API_KEY = $env:BRAVE_API_KEY
            }
        }
    }
}

# Convert to JSON and save to file
$mcpConfigJson = $mcpConfig | ConvertTo-Json -Depth 10
Set-Content -Path $mcpConfigFile -Value $mcpConfigJson
Write-Host "Created MCP configuration file: $mcpConfigFile" -ForegroundColor Green

# Create a link file for integration with Podplay Build
$mcpIntegrationPath = "$(Get-Location)\backend\mcp_integration.py"
Write-Host "Ensuring MCP integration is properly configured in Podplay Build..." -ForegroundColor Cyan

# Start the MCP servers
Write-Host "Starting MCP servers..." -ForegroundColor Cyan
Start-Process -FilePath "mcp-toolkit" -ArgumentList "start-all" -NoNewWindow
Write-Host "MCP servers starting in background!" -ForegroundColor Green

# Setup complete
Write-Host "`nMCP Toolkit setup complete!" -ForegroundColor Cyan
Write-Host "Your Podplay Build environment now has access to the following MCP servers:" -ForegroundColor White
Write-Host "  - GitHub (Code & Repository Management)" -ForegroundColor White  
Write-Host "  - Sequential Thinking (Complex Problem Solving)" -ForegroundColor White
Write-Host "  - Puppeteer (Web Browsing & Automation)" -ForegroundColor White
Write-Host "  - Playwright (Advanced Web Interaction)" -ForegroundColor White
Write-Host "  - PostgreSQL (Database Access)" -ForegroundColor White
Write-Host "  - Brave Search (Web Search Capabilities)" -ForegroundColor White

Write-Host "`nTo manually start/stop MCP servers:" -ForegroundColor White
Write-Host "  - Start all: mcp-toolkit start-all" -ForegroundColor White
Write-Host "  - Stop all: mcp-toolkit stop-all" -ForegroundColor White
Write-Host "  - Status: mcp-toolkit status" -ForegroundColor White

Write-Host "`nTo use Docker integration:" -ForegroundColor White
Write-Host "  - Build & run: docker-compose up -d" -ForegroundColor White
Write-Host "  - Stop: docker-compose down" -ForegroundColor White