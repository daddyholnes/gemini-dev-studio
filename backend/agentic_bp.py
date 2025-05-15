# agentic_bp.py
"""
Flask Blueprint for Lead Developer Agent endpoints
- Integrates daily briefing, marketplace, and orchestration modules
"""
from flask import Blueprint, jsonify, request
from agentic_briefing import AgenticBriefing
from marketplace_panel import marketplace_bp
from agentic_orchestration import AgenticOrchestration

agentic_bp = Blueprint('agentic_bp', __name__)

@agentic_bp.route('/api/agentic/briefing', methods=['GET'])
def get_briefing():
    project_id = request.args.get('project_id', 'default')
    briefing = AgenticBriefing(project_id).compose_briefing()
    return jsonify({'briefing': briefing})


@agentic_bp.route('/api/agentic/route_task', methods=['POST'])
def route_task():
    data = request.json
    project_id = data.get('project_id', 'default')
    task_type = data.get('task_type')
    payload = data.get('payload')
    agent = AgenticOrchestration(project_id)
    result = agent.route_task(task_type, payload)
    report = agent.report_result(result)
    return jsonify({'result': report})
