import { STORAGE_KEYS, BRANDING } from './constants.js';

document.addEventListener('DOMContentLoaded', async () => {
    const saveBtn = document.getElementById('save');
    const apiKeyInput = document.getElementById('apiKey');
    const statusDiv = document.getElementById('status');
    const autoDetectCheckbox = document.getElementById('autoDetect');
    const sensitivitySelect = document.getElementById('sensitivity');
    const clearHistoryBtn = document.getElementById('clearHistory');
    const clearAllSavedElementsBtn = document.getElementById('clearAllSavedElements');
    const savedElementsList = document.getElementById('savedElementsList');

    // Load existing settings
    const settings = await chrome.storage.sync.get([
        STORAGE_KEYS.API_KEY,
        STORAGE_KEYS.AUTO_DETECT,
        STORAGE_KEYS.DETECTION_SENSITIVITY,
        STORAGE_KEYS.SAVED_ELEMENTS
    ]);
    
    // Set initial values
    apiKeyInput.value = settings[STORAGE_KEYS.API_KEY] || '';
    autoDetectCheckbox.checked = settings[STORAGE_KEYS.AUTO_DETECT] !== undefined 
        ? settings[STORAGE_KEYS.AUTO_DETECT] 
        : true;
    sensitivitySelect.value = settings[STORAGE_KEYS.DETECTION_SENSITIVITY] || 'medium';
    
    // Load saved elements
    loadSavedElements(settings[STORAGE_KEYS.SAVED_ELEMENTS] || {});

    // Save API key
    saveBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();

        if (!apiKey) {
            showStatus('Please enter a valid API key', 'error');
            return;
        }

        try {
            await chrome.storage.sync.set({ [STORAGE_KEYS.API_KEY]: apiKey });
            showStatus('API key saved successfully!', 'success');
        } catch (error) {
            showStatus('Error saving API key', 'error');
        }
    });
    
    // Save auto-detect setting
    autoDetectCheckbox.addEventListener('change', async () => {
        try {
            await chrome.storage.sync.set({ [STORAGE_KEYS.AUTO_DETECT]: autoDetectCheckbox.checked });
            showStatus('Auto-detect setting saved', 'success');
        } catch (error) {
            showStatus('Error saving setting', 'error');
        }
    });
    
    // Save sensitivity setting
    sensitivitySelect.addEventListener('change', async () => {
        try {
            await chrome.storage.sync.set({ [STORAGE_KEYS.DETECTION_SENSITIVITY]: sensitivitySelect.value });
            showStatus('Sensitivity setting saved', 'success');
        } catch (error) {
            showStatus('Error saving setting', 'error');
        }
    });
    
    // Clear history
    clearHistoryBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear your quiz history?')) {
            try {
                await chrome.storage.sync.set({ [STORAGE_KEYS.DETECTION_HISTORY]: [] });
                showStatus('Quiz history cleared', 'success');
            } catch (error) {
                showStatus('Error clearing history', 'error');
            }
        }
    });
    
    // Clear all saved elements
    clearAllSavedElementsBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear all saved elements? You will need to reselect elements for each website.')) {
            try {
                await chrome.storage.sync.set({ [STORAGE_KEYS.SAVED_ELEMENTS]: {} });
                loadSavedElements({});
                showStatus('All saved elements cleared', 'success');
            } catch (error) {
                showStatus('Error clearing saved elements', 'error');
            }
        }
    });
    
    // Function to load and display saved elements
    function loadSavedElements(savedElements) {
        // Clear the list
        savedElementsList.innerHTML = '';
        
        const domains = Object.keys(savedElements);
        
        if (domains.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'saved-element-item empty-message';
            emptyMessage.textContent = 'No saved elements yet';
            savedElementsList.appendChild(emptyMessage);
            return;
        }
        
        // Add each domain to the list
        domains.forEach(domain => {
            const item = document.createElement('div');
            item.className = 'saved-element-item';
            
            const domainText = document.createElement('span');
            domainText.textContent = domain;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', async () => {
                try {
                    // Remove this domain from saved elements
                    const result = await chrome.storage.sync.get([STORAGE_KEYS.SAVED_ELEMENTS]);
                    const currentSavedElements = result[STORAGE_KEYS.SAVED_ELEMENTS] || {};
                    
                    delete currentSavedElements[domain];
                    
                    await chrome.storage.sync.set({ [STORAGE_KEYS.SAVED_ELEMENTS]: currentSavedElements });
                    
                    // Refresh the list
                    loadSavedElements(currentSavedElements);
                    showStatus(`Removed saved element for ${domain}`, 'success');
                } catch (error) {
                    showStatus('Error removing saved element', 'error');
                }
            });
            
            item.appendChild(domainText);
            item.appendChild(deleteBtn);
            savedElementsList.appendChild(item);
        });
    }

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status-message status-${type}`;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.opacity = '0';
            setTimeout(() => {
                statusDiv.style.display = 'none';
                statusDiv.style.opacity = '1';
            }, 300);
        }, 3000);
    }
    
    // Add branding copyright year
    const brandingElement = document.querySelector('.branding p');
    if (brandingElement) {
        brandingElement.innerHTML = brandingElement.innerHTML.replace('2025', new Date().getFullYear());
    }
});