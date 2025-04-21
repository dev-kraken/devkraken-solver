// Background script for Quiz Solver with Gemini
import { STORAGE_KEYS, MESSAGE_TYPES, TIME_CONSTANTS, BRANDING } from './constants.js';

// Initialize extension
async function initialize() {
    try {
        // Initialize storage and context menu
        await initializeStorage();
        createContextMenu();
    } catch (error) {
        console.error('Failed to initialize extension:', error);
    }
}

// Initialize storage with default values
async function initializeStorage() {
    const data = await chrome.storage.sync.get([
        STORAGE_KEYS.API_KEY,
        STORAGE_KEYS.AUTO_DETECT,
        STORAGE_KEYS.DETECTION_SENSITIVITY,
        STORAGE_KEYS.DETECTION_HISTORY,
        STORAGE_KEYS.USER_PREFERENCES,
        STORAGE_KEYS.SAVED_ELEMENTS
    ]);
    
    // Default settings
    const defaults = {
        [STORAGE_KEYS.API_KEY]: '',
        [STORAGE_KEYS.AUTO_DETECT]: true,
        [STORAGE_KEYS.DETECTION_SENSITIVITY]: 'medium',
        [STORAGE_KEYS.DETECTION_HISTORY]: [],
        [STORAGE_KEYS.SAVED_ELEMENTS]: {},
        [STORAGE_KEYS.USER_PREFERENCES]: {
            showAnswerPanel: true,
            autoScrollToAnswer: true,
            highlightAnswer: true
        }
    };
    
    // Check which values need to be initialized
    const updateNeeded = {};
    let needsUpdate = false;
    
    for (const key in defaults) {
        if (data[key] === undefined) {
            updateNeeded[key] = defaults[key];
            needsUpdate = true;
        }
    }
    
    // Only update storage if necessary
    if (needsUpdate) {
        await chrome.storage.sync.set(updateNeeded);
    }
}

// Create right-click context menu
function createContextMenu() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "solveSelection",
            title: "Solve with Gemini AI",
            contexts: ["selection"]
        });
        
        chrome.contextMenus.create({
            id: "solveCurrentPage",
            title: "Solve Quiz on Current Page",
            contexts: ["page"]
        });
        
        chrome.contextMenus.create({
            id: "toggleAutoDetect",
            title: "Toggle Auto-Detection",
            contexts: ["page"]
        });
    });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || !tab.id) return;
    
    if (info.menuItemId === "solveSelection") {
        if (!info.selectionText) {
            // Show error if no text is selected
            chrome.tabs.sendMessage(tab.id, {
                action: "showError",
                message: "Please select a question text first"
            });
            return;
        }
        
        // Send the selected text to the content script
        chrome.tabs.sendMessage(tab.id, {
            action: "solveSelected",
            text: info.selectionText
        });
    }
    
    if (info.menuItemId === "solveCurrentPage") {
        chrome.tabs.sendMessage(tab.id, {
            action: "solveCurrentQuiz"
        });
    }
    
    if (info.menuItemId === "toggleAutoDetect") {
        chrome.tabs.sendMessage(tab.id, {
            type: MESSAGE_TYPES.TOGGLE_AUTO_DETECT
        });
    }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.type === MESSAGE_TYPES.VALIDATE_API_KEY) {
            validateApiKey(message.payload)
                .then(result => sendResponse(result))
                .catch(error => sendResponse({ valid: false, error: error.message }));
            return true; // Keep the message channel open for async response
        }
        
        if (message.type === MESSAGE_TYPES.STORAGE_UPDATE) {
            handleStorageUpdate(message.payload)
                .then(result => {
                    broadcastStorageUpdate(message.payload);
                    sendResponse(result);
                })
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Keep the message channel open for async response
        }
        
        if (message.type === MESSAGE_TYPES.AUTO_DETECT) {
            // Relay auto-detect message to all tabs in the current window
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs && tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: MESSAGE_TYPES.AUTO_DETECT
                    });
                }
            });
            sendResponse({status: 'triggered'});
            return true;
        }
        
        if (message.type === MESSAGE_TYPES.ADJUST_SENSITIVITY) {
            handleStorageUpdate({
                key: STORAGE_KEYS.DETECTION_SENSITIVITY,
                value: message.payload.sensitivity
            }).then(() => {
                broadcastStorageUpdate({
                    key: STORAGE_KEYS.DETECTION_SENSITIVITY,
                    value: message.payload.sensitivity
                });
                sendResponse({status: 'updated'});
            });
            return true;
        }
        
        if (message.action === "getQuizHistory") {
            chrome.storage.sync.get([STORAGE_KEYS.DETECTION_HISTORY], (data) => {
                sendResponse({
                    history: data[STORAGE_KEYS.DETECTION_HISTORY] || []
                });
            });
            return true;
        }
        
        if (message.action === "clearQuizHistory") {
            chrome.storage.sync.set({[STORAGE_KEYS.DETECTION_HISTORY]: []}, () => {
                sendResponse({status: 'cleared'});
            });
            return true;
        }
        
        if (message.action === "getUserPreferences") {
            chrome.storage.sync.get([STORAGE_KEYS.USER_PREFERENCES], (data) => {
                sendResponse({
                    preferences: data[STORAGE_KEYS.USER_PREFERENCES] || {}
                });
            });
            return true;
        }
        
        if (message.action === "updateUserPreferences") {
            chrome.storage.sync.get([STORAGE_KEYS.USER_PREFERENCES], (data) => {
                const currentPreferences = data[STORAGE_KEYS.USER_PREFERENCES] || {};
                const updatedPreferences = {...currentPreferences, ...message.preferences};
                
                chrome.storage.sync.set({
                    [STORAGE_KEYS.USER_PREFERENCES]: updatedPreferences
                }, () => {
                    sendResponse({status: 'updated'});
                });
            });
            return true;
        }
    } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({status: 'error', message: error.message});
        return true;
    }
});

// Broadcast storage update to all tabs
async function broadcastStorageUpdate(payload) {
    try {
        const tabs = await chrome.tabs.query({});
        
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                type: MESSAGE_TYPES.STORAGE_UPDATE,
                payload
            }).catch(() => {
                // Ignore errors from inactive tabs
            });
        });
    } catch (error) {
        console.error('Error broadcasting storage update:', error);
    }
}

// Validate API key existence
async function validateApiKey(payload) {
    try {
        if (!payload || !payload.apiKey) {
            return { valid: false, error: 'API key is required' };
        }
        
        // Make a minimal request to the Gemini API to validate the key
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${payload.apiKey}`, {
            method: 'GET'
        });
        
        return { valid: response.ok };
    } catch (error) {
        console.error('API key validation error:', error);
        return { valid: false, error: error.message };
    }
}

// Handle storage update requests
async function handleStorageUpdate(payload) {
    try {
        if (!payload || !payload.key) {
            return { success: false, error: 'Invalid payload' };
        }
        
        await chrome.storage.sync.set({ [payload.key]: payload.value });
        return { success: true };
    } catch (error) {
        console.error('Storage update error:', error);
        return { success: false, error: error.message };
    }
}

// Listen for extension installation or update
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === 'install') {
        // Show onboarding page for new installations
        chrome.tabs.create({
            url: chrome.runtime.getURL('options.html')
        });
    }
});

// Initialize the extension
initialize();