# Core logic for Lead Developer Agent (Mama Bear Gem)
import os
from mcp_engine import get_genai_client, get_tool_registry
from mcp_tools import ToolRegistry

# Placeholder for persistent memory, RAG, and per-project state
class AgenticCore:
    _instances = {}
    @classmethod
    def get_instance(cls, project_id):
        if project_id not in cls._instances:
            cls._instances[project_id] = cls(project_id)
        return cls._instances[project_id]
    def __init__(self, project_id):
        self.project_id = project_id
        # Load API key from environment variable, never hardcode
        self.api_key = os.environ.get('GEMINI_API_KEY')
        self.memory = self.load_chat_history()  # Persistent chat log
        self.rag_store = self.load_rag_store()
        if not self.rag_store:
            self.rag_store = self.create_rag_store()
            self.save_rag_store(self.rag_store)

    # ... (rest of the code remains the same)

    @classmethod
    def handle_chat(cls, project_id, user_prompt, current_file_content=None, selected_code_snippet=None, file_tree_structure=None, conversation_history=None):
        agent = cls.get_instance(project_id or 'default')
        # Load recent doc usage (last 5)
        usage_path = os.path.join(os.path.dirname(__file__), f"doc_usage_{agent.project_id}.json")
        recent_docs = []
        if os.path.exists(usage_path):
            try:
                import json
                with open(usage_path, 'r', encoding='utf-8') as f:
                    all_usage = json.load(f)
                recent_docs = all_usage[-5:][::-1]
            except Exception:
                pass
        # Load recent chats (last 5 exchanges)
        recent_chats = agent.memory[-10:] if agent.memory else []
        # Assemble full context for the LLM
        context = {
            'user_prompt': user_prompt,
            'current_file_content': current_file_content,
            'selected_code_snippet': selected_code_snippet,
            'file_tree_structure': file_tree_structure,
            'conversation_history': conversation_history or agent.memory,
            'recent_docs': recent_docs,
            'recent_chats': recent_chats
        }
        # Load API key from environment variable, never hardcode
        api_key = os.environ.get('GEMINI_API_KEY')
        client = get_genai_client(api_key)
        tool_registry = get_tool_registry(project_id)
        prompt = cls.compose_prompt(context)
        tool_invocations = []
        max_loops = 3
        final_response = None
        research_citations = cls.search_docs(context)
        for _ in range(max_loops):
            response = client.models.generate_content(
                model='gemini-1.5-pro-latest',
                contents=prompt
            )
            tool_call = cls.parse_tool_call(response.text)
            if tool_call:
                tool_name, tool_args = tool_call
                tool_result = tool_registry.invoke_tool(tool_name, tool_args)
                tool_invocations.append({'tool': tool_name, 'args': tool_args, 'result': tool_result})
                prompt += f"\n[ToolResult for {tool_name}]: {tool_result}\n"
                continue
            else:
                final_response = response.text
                break
        agent.memory.append({'role': 'user', 'content': user_prompt})
        agent.memory.append({'role': 'assistant', 'content': final_response})
        agent.save_chat_history()
        return {
            'assistant_response': final_response,
            'code_changes': None,
            'terminal_output': None,
            'ui_actions': None,
            'tool_invocations': tool_invocations,
            'research_citations': research_citations,
            'recent_docs': recent_docs,
            'recent_chats': recent_chats
        }
    @classmethod
    def parse_tool_call(cls, text):
        import re
        match = re.search(r'\[TOOL:(\w+)\|(.*?)\]', text)
        if match:
            tool_name = match.group(1)
            try:
                import ast
                tool_args = ast.literal_eval(match.group(2))
            except Exception:
                tool_args = {'args': match.group(2)}
            return tool_name, tool_args
        return None
    @classmethod
    def compose_prompt(cls, context):
        # Compose a prompt for the LLM, including all provided context
        prompt = f"[User]: {context['user_prompt']}\n"
        if context.get('current_file_content'):
            prompt += f"[Current File]:\n{context['current_file_content']}\n"
        if context.get('selected_code_snippet'):
            prompt += f"[Selected Code]:\n{context['selected_code_snippet']}\n"
        if context.get('file_tree_structure'):
            prompt += f"[File Tree]:\n{context['file_tree_structure']}\n"
        if context.get('conversation_history'):
            prompt += "[History]:\n" + "\n".join([
                f"{msg['role']}: {msg['content']}" for msg in context['conversation_history']
            ]) + "\n"
        return prompt
    @classmethod
    def extract_code_changes(cls, response):
        # Extract code changes from LLM response (simplified MVP)
        if 'code:' in response:
            return response.split('code:')[1].strip()
        return None
    @classmethod
    def extract_terminal_output(cls, response):
        # Extract terminal output from LLM response (simplified MVP)
        if 'terminal:' in response:
            return response.split('terminal:')[1].strip()
        return None
    @classmethod
    def extract_ui_actions(cls, response):
        # Extract UI actions from LLM response (simplified MVP)
        if 'ui:' in response:
            return response.split('ui:')[1].strip()
        return None
    @classmethod
    def list_tools(cls):
        # List available MCP tools
        return get_tool_registry().list_tools()
    @classmethod
    def health(cls):
        try:
            client = get_genai_client()
            models = list(client.models.list())
            return {'status': 'ok', 'models': [m.name for m in models]}
        except Exception as e:
            return {'status': 'error', 'error': str(e)}

    @staticmethod
    def refresh_rag_index():
        core = AgenticCore.get_instance('default')
        core.rag_store = core.create_rag_store()
        core.save_rag_store(core.rag_store)
