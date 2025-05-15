// marketplace_panel.js
// Handles the contextual MCP marketplace panel

document.addEventListener('DOMContentLoaded', function () {
    const openBtn = document.getElementById('open-marketplace-panel');
    const panel = document.getElementById('marketplace-panel');
    const toolsList = document.getElementById('marketplace-tools-list');
    const searchInput = document.getElementById('marketplace-search');
    const searchBtn = document.getElementById('marketplace-search-btn');

    if (openBtn && panel) {
        openBtn.addEventListener('click', function () {
            panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
            if (panel.style.display === 'block') {
                fetchTools();
            }
        });
    }

    function fetchTools() {
        fetch('/api/agentic/marketplace')
            .then(response => response.json())
            .then(data => {
                toolsList.innerHTML = '';
                (data.active_tools || []).forEach(tool => {
                    const li = document.createElement('li');
                    li.textContent = tool.name || tool.id || 'Unnamed Tool';
                    toolsList.appendChild(li);
                });
            });
    }

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', function () {
            const query = searchInput.value;
            fetch(`/api/agentic/marketplace/search?query=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(data => {
                    toolsList.innerHTML = '';
                    (data.results || []).forEach(tool => {
                        const li = document.createElement('li');
                        li.textContent = tool.name || tool.id || 'Unnamed Tool';
                        toolsList.appendChild(li);
                    });
                });
        });
    }
});
