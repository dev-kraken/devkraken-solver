document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save');
    const apiKeyInput = document.getElementById('apiKey');
    const statusDiv = document.getElementById('status');

    // Load existing API key
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
        apiKeyInput.value = result.geminiApiKey || '';
    });

    saveBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();

        if (!apiKey) {
            showStatus('Please enter a valid API key', 'error');
            return;
        }

        try {
            await chrome.storage.sync.set({ geminiApiKey: apiKey });
            showStatus('Settings saved successfully!', 'success');
        } catch (error) {
            showStatus('Error saving settings', 'error');
        }
    });

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status-message status-${type}`;
        setTimeout(() => statusDiv.textContent = '', 3000);
    }
});