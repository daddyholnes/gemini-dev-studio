# agentic_orchestration.py
import re
import json
from mcp_engine import get_genai_client

class AgenticOrchestration:
    def __init__(self, project_id):
        self.project_id = project_id
        self.genai_client = get_genai_client()
        self.tool_scores = self.load_tool_scores()

    def load_tool_scores(self):
        # Load from a JSON config or default scores
        return {
            'gemini': {'code': 0.9, 'research': 0.7, 'analysis': 0.8},
            'claude': {'code': 0.7, 'research': 0.6, 'analysis': 0.9},
            'mcp_search': {'research': 0.85}
        }

    def route_task(self, task_type, payload):
        # Classify task if task_type is not provided
        if not task_type:
            task_type = self.classify_task(payload)
        # Score available tools/models
        scores = self.tool_scores
        best_tool = None
        best_score = 0
        for tool, tool_scores in scores.items():
            score = tool_scores.get(task_type, 0)
            if score > best_score:
                best_score = score
                best_tool = tool
        # Route to the best tool
        if best_tool == 'gemini':
            result = self.genai_client.generate_code(payload)
        elif best_tool == 'claude':
            raise NotImplementedError('Claude model integration is not active. Use MCP marketplace for real tools.')
        elif best_tool == 'mcp_search':
            raise NotImplementedError('MCP search integration is not active. Use MCP marketplace for real tools.')
        else:
            result = self.genai_client.chat(payload)
        return {'result': result, 'tool': best_tool, 'confidence': best_score}

    def classify_task(self, payload):
        payload_lower = payload.lower()
        if re.search(r'\b(code|program|script)\b', payload_lower):
            return 'code'
        elif re.search(r'\b(search|research|find)\b', payload_lower):
            return 'research'
        elif re.search(r'\b(analyze|analysis|review)\b', payload_lower):
            return 'analysis'
        return 'chat'
