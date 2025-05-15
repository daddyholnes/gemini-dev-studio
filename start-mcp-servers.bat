@echo off
echo [32m===========================================[0m
echo [36m   Podplay Build MCP Servers Launcher    [0m
echo [32m===========================================[0m
echo.
echo [33mStarting all MCP servers for your sanctuary...[0m
echo.

cd %~dp0\mcp
echo [36mDirectory: %CD%[0m
echo.

echo [33mInstalling dependencies if needed...[0m
call npm install mcp-toolkit --silent

echo.
echo [32mLaunching MCP servers...[0m
echo.

call node start-all.js

echo.
echo [32m===========================================[0m
echo [36m    Your Podplay Build sanctuary is now   [0m
echo [36m    connected to the MCP network! [0m
echo [32m===========================================[0m
echo.
echo [33mCheck server status with: cd mcp && node status.js[0m
echo.

pause