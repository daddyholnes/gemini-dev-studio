// Gemini Developer Studio - UI Logic
// Handles theme toggling, panel switching, and modal logic

document.getElementById('theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  document.body.classList.toggle('light-theme');
});

// Tool panel switching
const toolButtons = document.querySelectorAll('.tool-button');
const toolPanels = document.querySelectorAll('.tool-panel');
toolButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    toolPanels.forEach(panel => panel.classList.add('hidden'));
    const tool = btn.dataset.tool;
    const panel = document.getElementById(`${tool}-panel`);
    if (panel) panel.classList.remove('hidden');
  });
});
// Close panel buttons
const closePanelBtns = document.querySelectorAll('.close-panel-btn');
closePanelBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.tool-panel').classList.add('hidden');
  });
});
