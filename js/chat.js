// Gemini Developer Studio - Chat Handler
// Handles chat UI and message streaming with Gemini

// Session History Sidebar logic
const sessionBtn = document.getElementById('session-history-btn');
const sessionSidebar = document.getElementById('session-history-sidebar');
const sessionList = document.getElementById('session-history-list');
const closeSessionBtn = document.getElementById('close-session-history');

function openSessionSidebar() {
  sessionSidebar.style.display = 'block';
  document.body.style.overflow = 'hidden';
  fetchSessionHistory();
}
function closeSessionSidebar() {
  sessionSidebar.style.display = 'none';
  document.body.style.overflow = '';
}
sessionBtn.addEventListener('click', openSessionSidebar);
closeSessionBtn.addEventListener('click', closeSessionSidebar);

document.addEventListener('keydown', (e) => {
  if (sessionSidebar.style.display === 'block' && e.key === 'Escape') closeSessionSidebar();
});

document.addEventListener('click', (e) => {
  if (sessionSidebar.style.display === 'block' && !sessionSidebar.contains(e.target) && e.target !== sessionBtn) closeSessionSidebar();
});

async function fetchSessionHistory() {
  // Fetch chat histories
  const chatRes = await fetch('/api/agentic/code_agent/list_chat_histories');
  const chatData = await chatRes.json();
  // Fetch doc usage logs
  const docRes = await fetch('/api/agentic/code_agent/list_doc_usage_logs');
  const docData = await docRes.json();
  // Fetch timeline
  const timelineRes = await fetch('/api/agentic/code_agent/session_timeline');
  const timelineData = await timelineRes.json();

  // Timeline visualization with filter/search
  let timelineHtml = '<div class="timeline-section"><strong>Session Timeline</strong>' +
    '<input class="timeline-filter" id="timeline-filter" placeholder="Filter by type, date, or keyword..." aria-label="Filter timeline">' +
    '<div class="timeline-list" id="timeline-list">';
  if (timelineData.timeline && timelineData.timeline.length) {
    timelineHtml += timelineData.timeline.map((node, i) =>
      `<div class='timeline-node' tabindex="0" data-file='${node.file}' data-type='${node.type}' data-label='${node.timestamp} ${node.file}' title='${node.file}' aria-label='${node.type} session at ${node.timestamp}' data-idx='${i}'>
        <span class='timeline-dot ${node.type}'></span>
        <span class='timeline-label'>${node.timestamp}</span>
        <span class='timeline-type'>${node.type}</span>
        <button class='timeline-node-action load-session-btn' tabindex="-1">Load</button>
        <button class='timeline-node-action branch-session-btn' tabindex="-1">Branch</button>
      </div>`
    ).join('');
  } else {
    timelineHtml += '<div><em>No sessions found.</em></div>';
  }
  timelineHtml += '</div></div>';

  let html = timelineHtml;
  html += '<div style="margin-top:1.2em;"><strong>Chat Sessions</strong><ul>';

  // Onboarding modal for timeline (one-time)
  if (!localStorage.getItem('timelineOnboardingDismissed')) {
    const onboarding = document.createElement('div');
    onboarding.className = 'onboarding-modal';
    onboarding.innerHTML = `
      <div class='onboarding-content'>
        <h3>Session Timeline</h3>
        <p>Browse, filter, and branch your agentic memory!<br>
        <ul>
          <li><b>Filter</b> sessions by type, date, or keyword</li>
          <li><b>Tab/Arrow keys</b> to navigate timeline</li>
          <li><b>Load</b> or <b>Branch</b> from any session</li>
          <li>Edit/delete entries inside session modals</li>
        </ul>
        </p>
        <button id='dismiss-onboarding'>Got it!</button>
      </div>
    `;
    document.body.appendChild(onboarding);
    document.getElementById('dismiss-onboarding').onclick = () => {
      onboarding.remove();
      localStorage.setItem('timelineOnboardingDismissed', '1');
    };
  }

  // Timeline filter/search logic
  setTimeout(() => {
    const filterInput = document.getElementById('timeline-filter');
    const timelineNodes = Array.from(document.querySelectorAll('.timeline-node'));
    filterInput.addEventListener('input', () => {
      const val = filterInput.value.toLowerCase();
      timelineNodes.forEach(node => {
        const label = node.getAttribute('data-label').toLowerCase();
        const type = node.getAttribute('data-type').toLowerCase();
        if (label.includes(val) || type.includes(val)) {
          node.style.display = '';
        } else {
          node.style.display = 'none';
        }
      });
    });
    // Keyboard navigation for timeline nodes
    filterInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const first = timelineNodes.find(n => n.style.display !== 'none');
        if (first) first.focus();
      }
    });
    timelineNodes.forEach((node, idx) => {
      node.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          let next = timelineNodes.slice(idx+1).find(n => n.style.display !== 'none');
          if (next) next.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          let prev = timelineNodes.slice(0, idx).reverse().find(n => n.style.display !== 'none');
          if (prev) prev.focus();
          else filterInput.focus();
        } else if (e.key === 'Enter') {
          node.querySelector('.load-session-btn').click();
        }
      });
    });
    // Timeline node actions
    document.querySelectorAll('.load-session-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const node = btn.closest('.timeline-node');
        const file = node.getAttribute('data-file');
        const type = node.getAttribute('data-type');
        if (type === 'chat') {
          const res = await fetch(`/api/agentic/code_agent/set_session_memory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file, type })
          });
          const data = await res.json();
          addMessage('system', data.success ? 'Session loaded.' : 'Failed to load session.');
        } else if (type === 'doc') {
          const res = await fetch(`/api/agentic/code_agent/set_session_memory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file, type })
          });
          const data = await res.json();
          addMessage('system', data.success ? 'Doc usage loaded.' : 'Failed to load doc usage.');
        }
      };
    });
    document.querySelectorAll('.branch-session-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const node = btn.closest('.timeline-node');
        const file = node.getAttribute('data-file');
        const type = node.getAttribute('data-type');
        const res = await fetch(`/api/agentic/code_agent/branch_session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file, type })
        });
        const data = await res.json();
        addMessage('system', data.success ? 'Branched new session.' : 'Failed to branch session.');
        fetchSessionHistory();
      };
    });
  }, 150);
  if (chatData.files && chatData.files.length) {
    html += chatData.files.map(f => `<li><button class='session-file-btn' data-type='chat' data-file='${f}'>${f}</button></li>`).join('');
  } else {
    html += '<li><em>No chat sessions found.</em></li>';
  }
  html += '</ul></div>';
  html += '<div style="margin-top:1.2em;"><strong>Doc Usage Logs</strong><ul>';
  if (docData.files && docData.files.length) {
    html += docData.files.map(f => `<li><button class='session-file-btn' data-type='doc' data-file='${f}'>${f}</button></li>`).join('');
  } else {
    html += '<li><em>No doc usage logs found.</em></li>';
  }
  html += '</ul></div>';
  sessionList.innerHTML = html;

  // Timeline node click handlers
  document.querySelectorAll('.timeline-node').forEach(node => {
    node.addEventListener('click', async (e) => {
      const file = node.getAttribute('data-file');
      const type = node.getAttribute('data-type');
      let data = null;
      let title = file;
      if (type === 'chat') {
        const res = await fetch(`/api/agentic/code_agent/load_chat_history?filename=${encodeURIComponent(file)}`);
        data = (await res.json()).history || [];
        showSessionModal(title, renderChatHistory(data, file), file, type);
        setTimeout(() => attachEditDeleteListeners('chat', file, data), 100);
      } else if (type === 'doc') {
        const res = await fetch(`/api/agentic/code_agent/load_doc_usage?filename=${encodeURIComponent(file)}`);
        data = (await res.json()).usage || [];
        showSessionModal(title, renderDocUsage(data, file), file, type);
        setTimeout(() => attachEditDeleteListeners('doc', file, data), 100);
      }
    });
  });

  // Attach click handlers for session file buttons
  document.querySelectorAll('.session-file-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const file = btn.getAttribute('data-file');
      const type = btn.getAttribute('data-type');
      let data = null;
      let title = file;
      if (type === 'chat') {
        const res = await fetch(`/api/agentic/code_agent/load_chat_history?filename=${encodeURIComponent(file)}`);
        data = (await res.json()).history || [];
        showSessionModal(title, renderChatHistory(data, file), file, type);
        setTimeout(() => attachEditDeleteListeners('chat', file, data), 100);
      } else if (type === 'doc') {
        const res = await fetch(`/api/agentic/code_agent/load_doc_usage?filename=${encodeURIComponent(file)}`);
        data = (await res.json()).usage || [];
        showSessionModal(title, renderDocUsage(data, file), file, type);
        setTimeout(() => attachEditDeleteListeners('doc', file, data), 100);
      }
    });
  });
}

function attachEditDeleteListeners(type, file, data) {
  // Edit
  if (type === 'chat') {
    document.querySelectorAll('.edit-msg-btn').forEach(btn => {
      btn.onclick = (e) => {
        const idx = btn.getAttribute('data-idx');
        const li = btn.closest('li');
        const span = li.querySelector('.msg-content');
        const oldVal = span.textContent;
        span.innerHTML = `<input type='text' value="${oldVal.replace(/"/g, '&quot;')}" class='edit-msg-input' style='width:70%;'> <button class='save-edit-btn'>Save</button>`;
        li.querySelector('.save-edit-btn').onclick = async () => {
          const newVal = li.querySelector('.edit-msg-input').value;
          const idxNum = parseInt(idx, 10);
          const res = await fetch('/api/agentic/code_agent/update_session_entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file, type: 'chat', idx: idxNum, new_value: newVal })
          });
          const data = await res.json();
          if (data.success) {
            span.textContent = newVal;
            addMessage('system', 'Message updated.');
          } else {
            addMessage('system', 'Failed to update message.');
          }
          btn.focus();
        };
      };
    });
    document.querySelectorAll('.delete-msg-btn').forEach(btn => {
      btn.onclick = async (e) => {
        if (!confirm('Delete this message?')) return;
        const idx = btn.getAttribute('data-idx');
        // TODO: Call backend to delete entry
        btn.closest('li').remove();
      };
    });
  } else if (type === 'doc') {
    document.querySelectorAll('.edit-doc-btn').forEach(btn => {
      btn.onclick = (e) => {
        const idx = btn.getAttribute('data-idx');
        const li = btn.closest('li');
        const strong = li.querySelector('strong');
        const oldVal = strong.textContent;
        strong.innerHTML = `<input type='text' value="${oldVal.replace(/"/g, '&quot;')}" class='edit-doc-input' style='width:70%;'> <button class='save-edit-btn'>Save</button>`;
        li.querySelector('.save-edit-btn').onclick = async () => {
          const newVal = li.querySelector('.edit-doc-input').value;
          const idxNum = parseInt(idx, 10);
          const res = await fetch('/api/agentic/code_agent/update_session_entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file, type: 'doc', idx: idxNum, new_value: newVal })
          });
          const data = await res.json();
          if (data.success) {
            strong.textContent = newVal;
            addMessage('system', 'Doc usage entry updated.');
          } else {
            addMessage('system', 'Failed to update doc usage entry.');
          }
          btn.focus();
        };
      };
    });
    document.querySelectorAll('.delete-doc-btn').forEach(btn => {
      btn.onclick = async (e) => {
        if (!confirm('Delete this doc usage entry?')) return;
        const idx = btn.getAttribute('data-idx');
        // TODO: Call backend to delete entry
        btn.closest('li').remove();
      };
    });
  }
}

function showSessionModal(title, contentHtml, file = '', type = '') {
  let actionBtns = '';
  if (file && type) {
    actionBtns = `
      <div style='margin-top:1.2em;text-align:right;'>
        <button class='primary-button' id='load-session-btn' data-file='${file}' data-type='${type}'>Load as Current Session</button>
        <button class='secondary-button' id='branch-session-btn' data-file='${file}' data-type='${type}' style='margin-left:0.5em;'>Branch from Here</button>
      </div>
    `;
  }
  openModal(`<div class='modal-header'><button class='close-modal' aria-label='Close'>&times;</button><h3>${title}</h3></div><div class='modal-body' style='max-height:60vh;overflow:auto;'>${contentHtml}${actionBtns}</div>`);
  if (file && type) {
    document.getElementById('load-session-btn').onclick = () => handleSessionLoad(file, type, false);
    document.getElementById('branch-session-btn').onclick = () => handleSessionLoad(file, type, true);
  }
}

async function handleSessionLoad(file, type, branch) {
  closeModal();
  let url = branch ? '/api/agentic/code_agent/branch_session' : '/api/agentic/code_agent/set_session_memory';
  let body = { filename: file, type, project_id: 'default' };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.success) {
    addMessage('system', branch ? `Branched from session: ${data.newfile || file}` : `Loaded session: ${file}`);
    // For chat sessions, update in-memory chatHistory
    if (type === 'chat') {
      let loadFile = branch && data.newfile ? data.newfile : file;
      const histRes = await fetch(`/api/agentic/code_agent/load_chat_history?filename=${encodeURIComponent(loadFile)}`);
      const histData = await histRes.json();
      chatHistory = histData.history || [];
      // Optionally, re-render chat UI from new chatHistory
      messagesContainer.innerHTML = '';
      chatHistory.forEach(msg => addMessage(msg.role, msg.content));
    }
  } else {
    addMessage('system', `Failed to ${branch ? 'branch' : 'load'} session: ${file}`);
  }
}

function renderChatHistory(history, file = '') {
  if (!history.length) return '<em>No chat history in this session.</em>';
  return '<ul>' + history.map((msg, idx) => `
    <li>
      <span class='${msg.role}'>${msg.role}:</span> 
      <span class='msg-content' data-idx='${idx}'>${escapeHtml(msg.content)}</span>
      <button class='edit-msg-btn' data-idx='${idx}' data-file='${file}' title='Edit'><span class='material-icons' style='font-size:1em;'>edit</span></button>
      <button class='delete-msg-btn' data-idx='${idx}' data-file='${file}' title='Delete'><span class='material-icons' style='font-size:1em;'>delete</span></button>
    </li>`).join('') + '</ul>';
}

function renderDocUsage(usage, file = '') {
  if (!usage.length) return '<em>No doc usage in this log.</em>';
  return '<ul>' + usage.map((u, idx) => `
    <li>
      <strong>${u.doc_title || u.doc_path}</strong> 
      <span style='color:var(--text-secondary);font-size:0.95em;'>${u.timestamp ? new Date(u.timestamp).toLocaleString() : ''}</span>
      <button class='edit-doc-btn' data-idx='${idx}' data-file='${file}' title='Edit'><span class='material-icons' style='font-size:1em;'>edit</span></button>
      <button class='delete-doc-btn' data-idx='${idx}' data-file='${file}' title='Delete'><span class='material-icons' style='font-size:1em;'>delete</span></button>
    </li>`).join('') + '</ul>';
}

// Onboarding tooltip/help logic
const helpBtn = document.getElementById('help-tooltip-btn');
const helpTooltip = document.getElementById('help-tooltip');
let tooltipOpen = false;
function showHelpTooltip() {
  helpTooltip.style.display = 'block';
  tooltipOpen = true;
  helpBtn.setAttribute('aria-expanded', 'true');
}
function hideHelpTooltip() {
  helpTooltip.style.display = 'none';
  tooltipOpen = false;
  helpBtn.setAttribute('aria-expanded', 'false');
}
helpBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (tooltipOpen) hideHelpTooltip(); else showHelpTooltip();
});
helpBtn.addEventListener('focus', showHelpTooltip);
helpBtn.addEventListener('blur', hideHelpTooltip);
document.addEventListener('click', (e) => {
  if (tooltipOpen && !helpTooltip.contains(e.target) && e.target !== helpBtn) hideHelpTooltip();
});
document.addEventListener('keydown', (e) => {
  if (tooltipOpen && e.key === 'Escape') hideHelpTooltip();
});

const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const uploadButton = document.getElementById('upload-button');
const refreshButton = document.getElementById('refresh-button');
const uploadModal = document.getElementById('upload-modal');
const uploadStatus = document.getElementById('upload-status');

let chatHistory = [];

function addMessage(role, content) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${role}`;
  msgDiv.innerHTML = `<div class="message-content">${content}</div>`;
  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function setInputDisabled(disabled) {
  messageInput.disabled = disabled;
  sendButton.disabled = disabled;
}

function openModal(content) {
  modalContent.innerHTML = content;
  modalContainer.style.display = 'block';
}

function closeModal() {
  modalContainer.style.display = 'none';
}

function openUploadModal() {
  uploadModal.style.display = 'block';
}

function closeUploadModal() {
  uploadModal.style.display = 'none';
}

function showDocPreviewModal(path, title) {
  const modal = createDocPreviewModal();
  const contentDiv = modal.querySelector('.modal-content');
  modal.style.display = 'block';
  contentDiv.innerHTML = `<div class=\"modal-header\"><button class=\"close-modal\" aria-label=\"Close\">&times;</button><h3>${title}</h3></div><div class=\"modal-body\">Loading...</div>`;
  fetch(`/api/agentic/code_agent/doc_preview?path=${encodeURIComponent(path)}`)
    .then(resp => resp.json())
    .then(data => {
      contentDiv.querySelector('.modal-body').innerHTML = `
        <pre>${escapeHtml(data.content)}</pre>
        <div class='doc-feedback' style='margin-top:1rem;'>
          <span>Was this doc helpful?</span>
          <button class='feedback-thumb' aria-label='Helpful' data-val='up'>&#128077;</button>
          <button class='feedback-thumb' aria-label='Not helpful' data-val='down'>&#128078;</button>
          <span class='feedback-status' style='margin-left:1rem;color:var(--text-secondary);'></span>
        </div>
      `;
      contentDiv.querySelectorAll('.feedback-thumb').forEach(btn => {
        btn.onclick = async () => {
          const val = btn.getAttribute('data-val');
          const res = await fetch('/api/agentic/code_agent/doc_feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, title, feedback: val })
          });
          const status = contentDiv.querySelector('.feedback-status');
          if (res.ok) status.textContent = 'Thank you for your feedback!';
          else status.textContent = 'Error submitting feedback.';
        };
      });
    })
    .catch(() => {
      contentDiv.querySelector('.modal-body').textContent = 'Failed to load document.';
    });
  // Close modal logic
  contentDiv.querySelector('.close-modal').onclick = () => { modal.style.display = 'none'; };
  modal.onkeydown = (e) => {
    if (e.key === 'Escape') modal.style.display = 'none';
  };
  // Trap focus for accessibility
  setTimeout(() => { contentDiv.querySelector('.close-modal').focus(); }, 100);
}

async function handleSend() {
  const content = messageInput.value.trim();
  if (!content) return;
  addMessage('user', content);
  chatHistory.push({ role: 'user', content });
  messageInput.value = '';
  setInputDisabled(true);
  // Streaming Gemini API response
  let assistantContent = '';
  addMessage('assistant', '<span class="typing">...</span>');
  const lastMsg = messagesContainer.lastChild;
  await window.GeminiAPI.streamMessage(chatHistory, null, (chunk) => {
    assistantContent += chunk;
    lastMsg.innerHTML = `<div class="message-content">${assistantContent}</div>`;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
  const response = JSON.parse(assistantContent);
  chatHistory.push({ role: 'assistant', content: response.message });
  if (response.research_citations) {
    const citationsHtml = response.research_citations.map((citation) => {
      return `
        <div class="suggested-doc">
          <h4><a href="#" onclick="openModal('${citation.path}')">${citation.title}</a></h4>
          <p>${citation.excerpt}</p>
          <a href="${citation.link}" target="_blank">Read more</a>
          <button class="upload-refresh-button" onclick="openUploadModal()">Upload/Refresh</button>
        </div>
      `;
    }).join('');
    addMessage('assistant', citationsHtml);
  }
  // Show recently used docs
  if (response.recent_docs && response.recent_docs.length) {
    const docsHtml = response.recent_docs.map(doc =>
      `<li><strong>${doc.doc_title || doc.doc_path}</strong> <span style='color:var(--text-secondary);font-size:0.95em;'>${doc.timestamp ? new Date(doc.timestamp).toLocaleString() : ''}</span></li>`
    ).join('');
    addMessage('assistant', `<div class="recent-section"><strong>Recently Used Docs:</strong><ul>${docsHtml}</ul></div>`);
  }
  // Show recent conversations
  if (response.recent_chats && response.recent_chats.length) {
    const chatsHtml = response.recent_chats.map(msg =>
      `<li><span class='${msg.role}'>${msg.role}:</span> <span>${escapeHtml(msg.content)}</span></li>`
    ).join('');
    addMessage('assistant', `<div class="recent-section"><strong>Recent Conversations:</strong><ul>${chatsHtml}</ul></div>`);
  }
  setInputDisabled(false);
}

async function fetchDocPreview(path) {
  const response = await fetch(`/api/agentic/code_agent/doc_preview?path=${path}`);
  const content = await response.text();
  return content;
}

modalClose.addEventListener('click', closeModal);
modalContainer.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});

sendButton.addEventListener('click', handleSend);
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('suggested-doc')) {
    const path = e.target.querySelector('a').getAttribute('onclick').replace("openModal('", '').replace("')", '');
    fetchDocPreview(path).then((content) => {
      openModal(content);
    });
  }
});
