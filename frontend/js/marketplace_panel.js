// marketplace_panel.js
// Handles the contextual MCP marketplace panel with DaisyUI and htmx integration

document.addEventListener('DOMContentLoaded', function () {
    const toolsList = document.getElementById('marketplace-tools');
    const searchInput = document.getElementById('marketplace-search');
    const searchBtn = document.getElementById('marketplace-search-btn');

    function renderToolCard(tool) {
        return `
            <div class="card bg-white shadow-md fade-in">
                <div class="card-body">
                    <h3 class="card-title text-lg font-semibold text-blue-900">${tool.name || 'Unnamed Tool'}</h3>
                    <p class="text-gray-600">${tool.description || 'No description provided.'}</p>
                    <div class="flex justify-between items-center mt-2">
                        <span class="badge badge-info">${tool.category || 'Tool'}</span>
                        <button class="btn btn-sm btn-success" onclick="alert('Install coming soon')">Install</button>
                    </div>
                </div>
            </div>
        `;
    }

    function fetchTools(query = '') {
        toolsList.innerHTML = '<div class="skeleton h-12 w-full mb-2"></div>';
        let url = '/api/agentic/marketplace';
        fetch(url)
            .then(response => response.json())
            .then(data => {
                toolsList.innerHTML = '';
                (data.tools || []).forEach(tool => {
                    toolsList.innerHTML += renderToolCard(tool);
                });
                if ((data.tools || []).length === 0) {
                    toolsList.innerHTML = '<div class="text-gray-500">No tools found.</div>';
                }
            });
    }

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', function () {
            // For now, just refetch all tools (implement search API later)
            fetchTools(searchInput.value);
        });
    }

    // Open marketplace drawer loads tools
    const drawerToggle = document.getElementById('marketplace-drawer');
    if (drawerToggle) {
        drawerToggle.addEventListener('change', function () {
            if (drawerToggle.checked) fetchTools();
        });
    }
});
