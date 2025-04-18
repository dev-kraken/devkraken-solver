// Background script for Quiz Solver with Gemini
import { STORAGE_KEYS, MESSAGE_TYPES, TIME_CONSTANTS } from './constants.js';

// Keep track of constants
let constants = null;

// Initialize extension
async function initialize() {
    try {
        // Load constants
        const module = await import(chrome.runtime.getURL('js/constants.js'));
        constants = module;
        
        // Initialize storage and context menu
        await initializeStorage();
        createContextMenu();
        
        console.log('Quiz Solver extension initialized successfully');
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
        STORAGE_KEYS.USER_PREFERENCES
    ]);
    
    // Default settings
    const defaults = {
        [STORAGE_KEYS.API_KEY]: '',
        [STORAGE_KEYS.AUTO_DETECT]: true,
        [STORAGE_KEYS.DETECTION_SENSITIVITY]: 'medium',
        [STORAGE_KEYS.DETECTION_HISTORY]: [],
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
        console.log('Initializing storage with default values');
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
    console.log('Background received message:', message.type || message.action);
    
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
                broadcastStorageUpdate({
                    key: STORAGE_KEYS.USER_PREFERENCES,
                    value: updatedPreferences
                });
                sendResponse({status: 'preferences updated'});
            });
        });
        return true;
    }
});

// Broadcast storage update to all tabs
function broadcastStorageUpdate(payload) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                type: MESSAGE_TYPES.STORAGE_UPDATE,
                payload: payload
            }).catch(() => {
                // Ignore errors from inactive tabs
            });
        });
    });
}

// Validate API key existence
async function validateApiKey(payload) {
    const data = await chrome.storage.sync.get([STORAGE_KEYS.API_KEY]);
    const apiKey = data[STORAGE_KEYS.API_KEY];
    
    if (!apiKey) {
        return { valid: false, message: 'API key not found' };
    }
    
    // Optional: Basic validation that it looks like a reasonable API key
    if (apiKey.length < 10) {
        return { valid: false, message: 'API key appears to be invalid (too short)' };
    }
    
    return { valid: true, key: apiKey };
}

// Handle storage update requests
async function handleStorageUpdate(payload) {
    if (!payload || !payload.key) {
        throw new Error('Invalid storage update payload');
    }
    
    await chrome.storage.sync.set({ [payload.key]: payload.value });
    return { success: true };
}

// Listen for extension installation or update
chrome.runtime.onInstalled.addListener(details => {
    if (details.reason === 'install') {
        // Show onboarding page for new installations
        chrome.tabs.create({
            url: chrome.runtime.getURL('onboarding.html')
        });
        initialize();
    } else if (details.reason === 'update') {
        initialize();
    }
});

// Handle extension updates
chrome.runtime.onUpdateAvailable.addListener(() => {
    chrome.runtime.reload();
});

// Listen for tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
        // Check if auto-detect is enabled
        chrome.storage.sync.get([STORAGE_KEYS.AUTO_DETECT], (data) => {
            const autoDetectEnabled = data[STORAGE_KEYS.AUTO_DETECT] !== undefined ? 
                data[STORAGE_KEYS.AUTO_DETECT] : true;
                
            if (autoDetectEnabled) {
                // Wait a moment for page to fully render
                setTimeout(() => {
                    chrome.tabs.sendMessage(tabId, {
                        type: MESSAGE_TYPES.AUTO_DETECT
                    }).catch(() => {
                        // Ignore errors if content script is not ready
                    });
                }, TIME_CONSTANTS.DEBOUNCE_DELAY);
            }
        });
    }
});

// Initialize the extension
initialize();