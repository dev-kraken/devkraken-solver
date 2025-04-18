import { STORAGE_KEYS, MESSAGE_TYPES } from './constants.js';

document.addEventListener('DOMContentLoaded', async () => {
    const apiKeyInput = document.getElementById('apiKey');
    const toggleVisibilityBtn = document.getElementById('toggleVisibility');
    const saveApiKeyBtn = document.getElementById('saveApiKey');
    const solveCurrentBtn = document.getElementById('solveCurrentBtn');
    const statusDiv = document.getElementById('status');

    // Load existing API key
    const result = await chrome.storage.sync.get([STORAGE_KEYS.API_KEY]);
    apiKeyInput.value = result[STORAGE_KEYS.API_KEY] || '';

    // Toggle API key visibility
    toggleVisibilityBtn.addEventListener('click', () => {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleVisibilityBtn.textContent = '🔒';
        } else {
            apiKeyInput.type = 'password';
            toggleVisibilityBtn.textContent = '👁️';
        }
    });

    // Save API key
    saveApiKeyBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();

        if (!apiKey) {
            showStatus('Please enter a valid API key', 'error');
            return;
        }

        try {
            // Validate API key before saving
            const isValid = await validateApiKey(apiKey);
            
            if (isValid) {
                await chrome.storage.sync.set({ [STORAGE_KEYS.API_KEY]: apiKey });
                showStatus('API key saved successfully!', 'success');
                
                // Notify other parts of the extension
                chrome.runtime.sendMessage({
                    type: MESSAGE_TYPES.STORAGE_UPDATE,
                    payload: { key: STORAGE_KEYS.API_KEY, value: apiKey }
                });
            } else {
                showStatus('Invalid API key. Please check and try again.', 'error');
            }
        } catch (error) {
            showStatus('Error saving API key: ' + error.message, 'error');
        }
    });

    // Solve current quiz
    solveCurrentBtn.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab) {
                chrome.tabs.sendMessage(tab.id, { action: "solveCurrentQuiz" });
                window.close(); // Close popup after sending command
            }
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
        }
    });

    // Helper function to validate API key
    async function validateApiKey(apiKey) {
        try {
            // Make a minimal request to the Gemini API to validate the key
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
                method: 'GET'
            });
            
            return response.ok;
        } catch (error) {
            console.error('API key validation error:', error);
            return false;
        }
    }

    // Helper function to show status messages
    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = 'status-message visible ' + type;
        
        setTimeout(() => {
            statusDiv.classList.remove('visible');
        }, 3000);
    }
});
