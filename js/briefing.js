// briefing.js
// Fetches and displays the daily briefing from Mama Bear

document.addEventListener('DOMContentLoaded', function () {
    fetch('/api/agentic/briefing')
        .then(response => response.json())
        .then(data => {
            const briefingBox = document.getElementById('briefing-box');
            if (briefingBox) {
                briefingBox.textContent = data.briefing;
                briefingBox.style.display = 'block';
            }
        });
});
