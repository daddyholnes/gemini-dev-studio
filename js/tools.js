// tools.js - Handles loading, displaying, and invoking MCP tools in the UI

async function fetchAndDisplayTools() {
  try {
    const response = await fetch('/api/agentic/code_agent/tools');
    const data = await response.json();
    const toolsList = document.getElementById('tools-list');
    if (!toolsList) return;
    toolsList.innerHTML = '';
    if (data.tools && data.tools.length > 0) {
      data.tools.forEach(tool => {
        const li = document.createElement('li');
        li.className = 'tool-item';
        li.tabIndex = 0;
        li.innerHTML = `<strong>${tool.name}</strong><br><span>${tool.description}</span>`;
        li.addEventListener('click', () => showToolModal(tool));
        li.addEventListener('keypress', (e) => { if (e.key === 'Enter') showToolModal(tool); });
        toolsList.appendChild(li);
      });
    } else {
      toolsList.innerHTML = '<li>No tools available</li>';
    }
  } catch (e) {
    console.error('Failed to fetch tools:', e);
  }
}

// Modal logic (MVP)
function showToolModal(tool) {
  let modal = document.getElementById('tool-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'tool-modal';
    modal.className = 'tool-modal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div class="modal-content">
    <button class="close-modal" aria-label="Close">&times;</button>
    <h3>${tool.name}</h3>
    <p>${tool.description}</p>
    <form id="tool-invoke-form">
      <input type="text" id="tool-args" placeholder="Enter arguments (JSON or text)" autocomplete="off" />
      <button type="submit">Invoke</button>
    </form>
    <div id="tool-result"></div>
  </div>`;
  modal.style.display = 'block';
  modal.querySelector('.close-modal').onclick = () => { modal.style.display = 'none'; };
  modal.querySelector('#tool-invoke-form').onsubmit = async (e) => {
    e.preventDefault();
    const args = modal.querySelector('#tool-args').value;
    let parsedArgs;
    try {
      parsedArgs = args ? JSON.parse(args) : {};
    } catch {
      parsedArgs = { args };
    }
    const resultDiv = modal.querySelector('#tool-result');
    resultDiv.textContent = 'Invoking...';
    try {
      const resp = await fetch('/api/agentic/code_agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: 'default',
          user_prompt: `[TOOL:${tool.name}|${JSON.stringify(parsedArgs)}]`,
        })
      });
      const data = await resp.json();
      resultDiv.textContent = data.assistant_response || JSON.stringify(data);
    } catch (err) {
      resultDiv.textContent = 'Error invoking tool.';
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  fetchAndDisplayTools();
});
