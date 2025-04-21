/**
 * Options page script for Quiz Solver extension
 * @author Dev Kraken <soman@devkraken.com>
 */

import { STORAGE_KEYS, MESSAGE_TYPES, BRANDING } from '../shared/constants.js';
import { getStorageData, saveStorageData } from '../shared/utils/storage-utils.js';

/**
 * Initializes the options page
 */
async function initialize() {
    const saveBtn = document.getElementById('save');
    const apiKeyInput = document.getElementById('apiKey');
    const statusDiv = document.getElementById('status');
    const autoDetectCheckbox = document.getElementById('autoDetect');
    const sensitivitySelect = document.getElementById('sensitivity');
    const clearHistoryBtn = document.getElementById('clearHistory');
    const clearAllSavedElementsBtn = document.getElementById('clearAllSavedElements');
    const savedElementsList = document.getElementById('savedElementsList');

    // Load existing settings
    const settings = await getStorageData([
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
            await saveStorageData({ [STORAGE_KEYS.API_KEY]: apiKey });
            showStatus('API key saved successfully!', 'success');
            
            // Notify other parts of the extension
            chrome.runtime.sendMessage({
                type: MESSAGE_TYPES.STORAGE_UPDATE,
                payload: { key: STORAGE_KEYS.API_KEY, value: apiKey }
            });
        } catch (error) {
            showStatus('Error saving API key', 'error');
        }
    });
    
    // Save auto-detect setting
    autoDetectCheckbox.addEventListener('change', async () => {
        try {
            await saveStorageData({ [STORAGE_KEYS.AUTO_DETECT]: autoDetectCheckbox.checked });
            
            // Notify other parts of the extension
            chrome.runtime.sendMessage({
                type: MESSAGE_TYPES.STORAGE_UPDATE,
                payload: { key: STORAGE_KEYS.AUTO_DETECT, value: autoDetectCheckbox.checked }
            });
            
            showStatus('Auto-detect setting saved', 'success');
        } catch (error) {
            showStatus('Error saving setting', 'error');
        }
    });
    
    // Save sensitivity setting
    sensitivitySelect.addEventListener('change', async () => {
        try {
            await saveStorageData({ [STORAGE_KEYS.DETECTION_SENSITIVITY]: sensitivitySelect.value });
            
            // Notify other parts of the extension
            chrome.runtime.sendMessage({
                type: MESSAGE_TYPES.STORAGE_UPDATE,
                payload: { key: STORAGE_KEYS.DETECTION_SENSITIVITY, value: sensitivitySelect.value }
            });
            
            showStatus('Sensitivity setting saved', 'success');
        } catch (error) {
            showStatus('Error saving setting', 'error');
        }
    });
    
    // Clear history
    clearHistoryBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear your quiz history?')) {
            try {
                await saveStorageData({ [STORAGE_KEYS.DETECTION_HISTORY]: [] });
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
                await saveStorageData({ [STORAGE_KEYS.SAVED_ELEMENTS]: {} });
                loadSavedElements({});
                showStatus('All saved elements cleared', 'success');
            } catch (error) {
                showStatus('Error clearing saved elements', 'error');
            }
        }
    });
    
    // Update copyright year
    updateCopyrightYear();
}

/**
 * Updates the copyright year in branding
 */
function updateCopyrightYear() {
    const brandingElement = document.querySelector('.branding p');
    if (brandingElement) {
        brandingElement.innerHTML = brandingElement.innerHTML.replace(/\d{4}/, new Date().getFullYear());
    }
}

/**
 * Shows a status message
 * @param {string} message - Message to display
 * @param {'success'|'error'} type - Message type
 */
function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
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

/**
 * Loads and displays saved elements
 * @param {Object} savedElements - Saved elements object
 */
function loadSavedElements(savedElements) {
    // Get the list element
    const savedElementsList = document.getElementById('savedElementsList');
    
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
                const result = await getStorageData([STORAGE_KEYS.SAVED_ELEMENTS]);
                const currentSavedElements = result[STORAGE_KEYS.SAVED_ELEMENTS] || {};
                
                delete currentSavedElements[domain];
                
                await saveStorageData({ [STORAGE_KEYS.SAVED_ELEMENTS]: currentSavedElements });
                
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

// Initialize the options page when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);
