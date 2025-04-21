/**
 * Popup script for Quiz Solver extension
 * @author Dev Kraken <soman@devkraken.com>
 */

// Define constants directly instead of importing them
const STORAGE_KEYS = {
    API_KEY: 'geminiApiKey'
};

const MESSAGE_TYPES = {
    VALIDATE_API_KEY: 'VALIDATE_API_KEY',
    STORAGE_UPDATE: 'STORAGE_UPDATE'
};

/**
 * Gets data from Chrome sync storage
 * @param {string|Array<string>} keys - Keys to retrieve from storage
 * @returns {Promise<Object>} Object containing the requested data
 */
async function getStorageData(keys) {
    console.log('Popup: Getting storage data for keys:', keys);
    return new Promise(resolve => {
        chrome.storage.sync.get(keys, data => {
            console.log('Popup: Retrieved storage data:', data);
            resolve(data);
        });
    });
}

/**
 * Saves data to Chrome sync storage
 * @param {Object} data - Data object to save to storage
 * @returns {Promise<void>} Promise that resolves when save is complete
 */
async function saveStorageData(data) {
    console.log('Popup: Saving storage data:', data);
    return new Promise(resolve => {
        chrome.storage.sync.set(data, () => {
            console.log('Popup: Data saved successfully');
            resolve();
        });
    });
}

/**
 * Initializes the popup
 */
async function initialize() {
    const apiKeyInput = document.getElementById('apiKey');
    const toggleVisibilityBtn = document.getElementById('toggleVisibility');
    const saveApiKeyBtn = document.getElementById('saveApiKey');
    const solveCurrentBtn = document.getElementById('solveCurrentBtn');
    const statusDiv = document.getElementById('status');

    console.log('Popup: Initializing');

    // Load existing API key
    const result = await getStorageData([STORAGE_KEYS.API_KEY]);
    apiKeyInput.value = result[STORAGE_KEYS.API_KEY] || '';
    console.log('Popup: Loaded API key:', !!result[STORAGE_KEYS.API_KEY]);

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
            showStatus('Saving API key...', 'info');
            console.log('Popup: Saving API key');
            
            // Save directly without validation for now
            await saveStorageData({ [STORAGE_KEYS.API_KEY]: apiKey });
            showStatus('API key saved successfully!', 'success');
            
            // Notify other parts of the extension
            chrome.runtime.sendMessage({
                type: MESSAGE_TYPES.STORAGE_UPDATE,
                payload: { key: STORAGE_KEYS.API_KEY, value: apiKey }
            });
            
            console.log('Popup: API key saved and notification sent');
        } catch (error) {
            console.error('Popup: Error saving API key:', error);
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
}

/**
 * Shows a status message
 * @param {string} message - Message to display
 * @param {'success'|'error'|'info'} type - Message type
 */
function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
        statusDiv.style.opacity = '0';
        setTimeout(() => {
            statusDiv.style.display = 'none';
            statusDiv.style.opacity = '1';
        }, 300);
    }, 3000);
}

// Initialize the popup when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);
