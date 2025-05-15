# mcp_client.py
import requests
import os

def get_mcp_catalog():
    # Docker MCP Catalog API endpoint (unofficial, but works for public catalog)
    url = 'https://hub.docker.com/api/content/v1/products/search'
    params = {
        'type': 'image',
        'namespace': 'mcp',
        'page_size': 50,
        'page': 1
    }
    try:
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        # Extract tool metadata
        tools = []
        for r in data.get('summaries', []):
            tools.append({
                'name': r.get('name'),
                'description': r.get('short_description'),
                'repo_url': f"https://hub.docker.com/r/{r.get('slug')}",
                'last_updated': r.get('updated_at'),
                'pulls': r.get('pull_count'),
                'star_count': r.get('star_count'),
                'version': r.get('version', 'latest')
            })
        return tools
    except Exception as e:
        print(f"Error fetching MCP catalog: {e}")
        return []

# For launching Docker MCP tools (run a tool by image name)
def run_mcp_tool(image_name, args=None, env=None):
    import subprocess
    docker_cmd = ["docker", "run", "--rm"]
    if env:
        for k, v in env.items():
            docker_cmd += ["-e", f"{k}={v}"]
    docker_cmd.append(image_name)
    if args:
        docker_cmd += args
    try:
        result = subprocess.run(docker_cmd, capture_output=True, text=True, timeout=60)
        return {'stdout': result.stdout, 'stderr': result.stderr, 'returncode': result.returncode}
    except Exception as e:
        return {'stdout': '', 'stderr': str(e), 'returncode': 1}
