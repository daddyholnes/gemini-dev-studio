"""
Agent Bridge Module

This module provides a bridge between Mama Bear (the AI agent) and the development environment,
allowing her to programmatically control the terminal, file system, editor, and preview components.
"""

from .agent_bridge import init_agent_bridge, AgentBridgeAPI

__all__ = ['init_agent_bridge', 'AgentBridgeAPI']