# MCP Tool Registry for Gemini Developer Studio
# Register tools/functions for Gemini function calling

from typing import Callable, Dict, Any

def get_boot_tools():
    # Define your boot set of MCP tools here
    return {
        'echo': {
            'name': 'Echo',
            'description': 'Echoes the input arguments',
            'args': {
                'type': 'string',
                'required': True
            },
            'type': 'utility',
            'func': lambda args: f"Echo: {args}"
        },
        'web_search': {
            'name': 'Web Search',
            'description': 'Performs a web search with the given query',
            'args': {
                'query': {
                    'type': 'string',
                    'required': True
                }
            },
            'type': 'search',
            'func': lambda args: f"[WebSearch] Results for '{args.get('query')}': ..."
        }
    }

class ToolRegistry:
    def __init__(self, tools: Dict[str, Dict[str, Any]]):
        self.tools = tools or {}
    def call(self, name, args):
        tool = self.tools.get(name)
        if tool:
            return tool['func'](args)
        return f"Tool '{name}' not found."
    def list_tools(self):
        # Return metadata for all tools
        return [{
            'name': name,
            'description': tool['description'],
            'args': tool['args'],
            'type': tool['type']
        } for name, tool in self.tools.items()]
    def invoke_tool(self, name, args):
        return self.call(name, args)
