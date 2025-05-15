// briefing.js
// Fetches and displays the daily briefing from Mama Bear, styled for DaisyUI

document.addEventListener('DOMContentLoaded', function () {
    fetch('/api/agentic/briefing')
        .then(response => response.json())
        .then(data => {
            const briefingBox = document.getElementById('briefing');
            if (briefingBox) {
                briefingBox.innerHTML = `<div class='prose max-w-none text-blue-900'>${data.briefing || 'No briefing available.'}</div>`;
            }
        });
});
