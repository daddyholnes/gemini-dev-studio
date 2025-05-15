# agentic_briefing.py
import os
import datetime
import json
from mcp_client import get_mcp_catalog

class AgenticBriefing:
    def __init__(self, project_id):
        self.project_id = project_id
        self.today = datetime.date.today().isoformat()

    def get_new_tools(self):
        tools = get_mcp_catalog()
        new_tools = [t for t in tools if self.is_new(t)]
        return new_tools

    def is_new(self, resource):
        last_check_file = f"last_check_{self.project_id}.json"
        last_check = {}
        if os.path.exists(last_check_file):
            with open(last_check_file, 'r') as f:
                last_check = json.load(f)
        resource_id = resource.get('id')
        current_version = resource.get('version')
        last_version = last_check.get(resource_id, {}).get('version')
        if not last_version or current_version > last_version:
            last_check[resource_id] = {'version': current_version, 'checked': self.today}
            with open(last_check_file, 'w') as f:
                json.dump(last_check, f)
            return True
        return False

    def get_project_priorities(self):
        return [
            f"Continue development on {self.project_id}",
            "Review new MCP tools integration",
            "Polish Code Build UI"
        ]

    def compose_briefing(self):
        new_tools = self.get_new_tools()
        priorities = self.get_project_priorities()
        briefing = f"Good morning, Nathan. Here’s your coffee ☕.\n"
        if new_tools:
            briefing += f"I’ve checked the MCP marketplace—here are new tools/models you can use: {', '.join([t['name'] for t in new_tools])}.\n"
        else:
            briefing += "No new MCP tools/models found today.\n"
        briefing += "Today’s priorities:\n"
        for p in priorities:
            briefing += f"- {p}\n"
        return briefing
