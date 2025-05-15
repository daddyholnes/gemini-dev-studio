# Podplay Build MCP Launcher
# This script launches all MCP servers from your configuration

param(
    [Parameter(Mandatory=$false)]
    [string]$Action = "start"
)

# Set execution policy for this script
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

# Function to display colored messages
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# Create MCP directory if it doesn't exist
$mcpDir = "$env:USERPROFILE\.mcp"
if (-not (Test-Path $mcpDir)) {
    New-Item -ItemType Directory -Path $mcpDir | Out-Null
    Write-ColorOutput Green "Created MCP directory: $mcpDir"
}

# Copy configuration file
$configSource = "$(Get-Location)\backend\config\mcp_config.json"
$configDest = "$mcpDir\config.json"
Copy-Item -Path $configSource -Destination $configDest -Force
Write-ColorOutput Green "Copied MCP configuration to: $configDest"

# Load configuration
$config = Get-Content -Path $configDest | ConvertFrom-Json

# Function to start a server
function Start-MCPServer($name, $serverConfig) {
    $command = $serverConfig.command
    $args = $serverConfig.args
    $env = $serverConfig.env
    
    # Create a unique log file for each server
    $logFile = "$mcpDir\$name.log"
    
    Write-ColorOutput Cyan "Starting MCP server: $name"
    
    # Set environment variables
    if ($env -ne $null) {
        foreach ($key in $env.PSObject.Properties.Name) {
            [Environment]::SetEnvironmentVariable($key, $env.$key, "Process")
        }
    }
    
    # Run the command in the background
    $serverProcess = Start-Process -FilePath $command -ArgumentList $args -NoNewWindow -PassThru -RedirectStandardOutput $logFile -RedirectStandardError "$mcpDir\$name-error.log"
    
    # Store the process ID
    $processInfo = @{
        "Name" = $name
        "PID" = $serverProcess.Id
        "LogFile" = $logFile
        "StartTime" = Get-Date
    }
    
    # Save process info to file
    $processInfo | ConvertTo-Json | Set-Content -Path "$mcpDir\$name.pid"
    
    Write-ColorOutput Green "Started server: $name (PID: $($serverProcess.Id))"
}

# Function to stop a server
function Stop-MCPServer($name) {
    $pidFile = "$mcpDir\$name.pid"
    if (Test-Path $pidFile) {
        $processInfo = Get-Content -Path $pidFile | ConvertFrom-Json
        try {
            $process = Get-Process -Id $processInfo.PID -ErrorAction SilentlyContinue
            if ($process) {
                Write-ColorOutput Cyan "Stopping MCP server: $name (PID: $($processInfo.PID))"
                Stop-Process -Id $processInfo.PID -Force
                Write-ColorOutput Green "Stopped server: $name"
            } else {
                Write-ColorOutput Yellow "Process for $name (PID: $($processInfo.PID)) is not running"
            }
        } catch {
            Write-ColorOutput Yellow "Could not find process for $name with PID: $($processInfo.PID)"
        }
        Remove-Item -Path $pidFile -Force
    } else {
        Write-ColorOutput Yellow "No PID file found for server: $name"
    }
}

# Function to check status of servers
function Get-MCPStatus {
    $allServers = $config.mcpServers.PSObject.Properties.Name
    Write-ColorOutput Cyan "MCP Server Status:"
    
    foreach ($name in $allServers) {
        $pidFile = "$mcpDir\$name.pid"
        if (Test-Path $pidFile) {
            $processInfo = Get-Content -Path $pidFile | ConvertFrom-Json
            try {
                $process = Get-Process -Id $processInfo.PID -ErrorAction SilentlyContinue
                if ($process) {
                    $runtime = (Get-Date) - [DateTime]$processInfo.StartTime
                    $formattedRuntime = "{0:D2}:{1:D2}:{2:D2}" -f $runtime.Hours, $runtime.Minutes, $runtime.Seconds
                    Write-ColorOutput Green "  ✅ $name (PID: $($processInfo.PID)) - Running for $formattedRuntime"
                } else {
                    Write-ColorOutput Red "  ❌ $name (PID: $($processInfo.PID)) - Not running"
                }
            } catch {
                Write-ColorOutput Red "  ❌ $name (PID: $($processInfo.PID)) - Error: $_"
            }
        } else {
            Write-ColorOutput Gray "  ⭕ $name - Not started"
        }
    }
}

# Main logic based on action parameter
switch ($Action.ToLower()) {
    "start" {
        Write-ColorOutput Cyan "Starting all MCP servers..."
        $allServers = $config.mcpServers.PSObject.Properties.Name
        foreach ($name in $allServers) {
            Start-MCPServer -name $name -serverConfig $config.mcpServers.$name
        }
        Write-ColorOutput Green "All MCP servers started!"
    }
    "stop" {
        Write-ColorOutput Cyan "Stopping all MCP servers..."
        $allServers = $config.mcpServers.PSObject.Properties.Name
        foreach ($name in $allServers) {
            Stop-MCPServer -name $name
        }
        Write-ColorOutput Green "All MCP servers stopped!"
    }
    "restart" {
        Write-ColorOutput Cyan "Restarting all MCP servers..."
        $allServers = $config.mcpServers.PSObject.Properties.Name
        foreach ($name in $allServers) {
            Stop-MCPServer -name $name
            Start-Sleep -Seconds 2
            Start-MCPServer -name $name -serverConfig $config.mcpServers.$name
        }
        Write-ColorOutput Green "All MCP servers restarted!"
    }
    "status" {
        Get-MCPStatus
    }
    default {
        Write-ColorOutput Red "Invalid action. Use: start, stop, restart, or status"
    }
}

# Final information
if ($Action.ToLower() -eq "start") {
    Write-ColorOutput Cyan "`nMCP servers are now running!"
    Write-ColorOutput White "Use these commands to manage MCP servers:"
    Write-ColorOutput White "  - Check status: .\mcp-launcher.ps1 status"
    Write-ColorOutput White "  - Stop servers: .\mcp-launcher.ps1 stop"
    Write-ColorOutput White "  - Restart servers: .\mcp-launcher.ps1 restart"
    Write-ColorOutput White "`nYour Podplay Build environment is now connected to all MCP servers!"
}