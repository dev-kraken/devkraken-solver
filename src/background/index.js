/**
 * Background service worker for Quiz Solver extension
 * @author Dev Kraken <soman@devkraken.com>
 */

// Define constants directly
const STORAGE_KEYS = {
    API_KEY: 'geminiApiKey',
    AUTO_DETECT: 'autoDetectEnabled',
    DETECTION_SENSITIVITY: 'detectionSensitivity',
    DETECTION_HISTORY: 'detectionHistory',
    USER_PREFERENCES: 'userPreferences',
    SAVED_ELEMENTS: 'savedElements'
};

const MESSAGE_TYPES = {
    VALIDATE_API_KEY: 'VALIDATE_API_KEY',
    STORAGE_UPDATE: 'STORAGE_UPDATE',
    TOGGLE_AUTO_DETECT: 'TOGGLE_AUTO_DETECT',
    AUTO_DETECT: 'AUTO_DETECT',
    ADJUST_SENSITIVITY: 'ADJUST_SENSITIVITY'
};

/**
 * Initializes the background service
 */
function initialize() {
    try {
        // Initialize storage with default values
        initializeStorage();
        
        // Set up context menus
        createContextMenu();
        
        // Set up message listeners
        setupMessageListeners();
        
        console.log('Quiz Solver extension initialized successfully');
    } catch (error) {
        console.error('Failed to initialize extension:', error);
    }
}

/**
 * Creates right-click context menu items
 */
function createContextMenu() {
    try {
        // Remove existing items
        chrome.contextMenus.removeAll();
        
        // Create menu item for selected text
        chrome.contextMenus.create({
            id: 'solveSelection',
            title: 'Solve with Gemini AI',
            contexts: ['selection']
        });
        
        // Create menu item for current page
        chrome.contextMenus.create({
            id: 'solveCurrentPage',
            title: 'Solve Quiz on Current Page',
            contexts: ['page']
        });
        
        // Create menu item for toggle auto-detect
        chrome.contextMenus.create({
            id: 'toggleAutoDetect',
            title: 'Toggle Auto-Detection',
            contexts: ['page']
        });
        
        // Set up click handler
        chrome.contextMenus.onClicked.addListener((info, tab) => {
            if (info.menuItemId === 'solveSelection' && info.selectionText) {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'solveSelected',
                    text: info.selectionText
                });
            }
            
            if (info.menuItemId === 'solveCurrentPage') {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'solveCurrentQuiz'
                });
            }
            
            if (info.menuItemId === 'toggleAutoDetect') {
                chrome.tabs.sendMessage(tab.id, {
                    type: MESSAGE_TYPES.TOGGLE_AUTO_DETECT
                });
            }
        });
        
        console.log('Context menu created successfully');
    } catch (error) {
        console.error('Error creating context menu:', error);
    }
}

/**
 * Sets up message listeners
 */
function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Background received message:', message);
        
        // Handle API key validation
        if (message.type === MESSAGE_TYPES.VALIDATE_API_KEY) {
            validateApiKey(message.payload.apiKey)
                .then(result => sendResponse(result))
                .catch(error => sendResponse({ valid: false, error: error.message }));
            return true; // Keep the message channel open
        }
        
        // Handle storage updates
        if (message.type === MESSAGE_TYPES.STORAGE_UPDATE) {
            handleStorageUpdate(message.payload)
                .then(result => {
                    broadcastStorageUpdate(message.payload);
                    sendResponse(result);
                })
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Keep the message channel open
        }
        
        // Handle solve current quiz action
        if (message.action === "solveCurrentQuiz") {
            if (sender.tab) {
                chrome.tabs.sendMessage(sender.tab.id, { action: "solveCurrentQuiz" });
                sendResponse({ status: 'processing' });
            }
            return true;
        }
        
        // Handle auto-detect message
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
        
        // Handle adjust sensitivity message
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
        
        // Handle get quiz history action
        if (message.action === "getQuizHistory") {
            getStorageData([STORAGE_KEYS.DETECTION_HISTORY]).then((data) => {
                sendResponse({
                    history: data[STORAGE_KEYS.DETECTION_HISTORY] || []
                });
            });
            return true;
        }
        
        // Handle clear quiz history action
        if (message.action === "clearQuizHistory") {
            saveStorageData({[STORAGE_KEYS.DETECTION_HISTORY]: []}).then(() => {
                sendResponse({status: 'cleared'});
            });
            return true;
        }
        
        // Handle get user preferences action
        if (message.action === "getUserPreferences") {
            getStorageData([STORAGE_KEYS.USER_PREFERENCES]).then((data) => {
                sendResponse({
                    preferences: data[STORAGE_KEYS.USER_PREFERENCES] || {}
                });
            });
            return true;
        }
        
        // Handle update user preferences action
        if (message.action === "updateUserPreferences") {
            getStorageData([STORAGE_KEYS.USER_PREFERENCES]).then((data) => {
                const currentPreferences = data[STORAGE_KEYS.USER_PREFERENCES] || {};
                const updatedPreferences = {...currentPreferences, ...message.preferences};
                
                saveStorageData({
                    [STORAGE_KEYS.USER_PREFERENCES]: updatedPreferences
                }).then(() => {
                    sendResponse({status: 'updated'});
                });
            });
            return true;
        }
    });
}

/**
 * Validates an API key
 * @param {string} apiKey - API key to validate
 * @returns {Promise<Object>} Validation result
 */
async function validateApiKey(apiKey) {
    try {
        // For now, just do basic validation
        if (!apiKey || apiKey.length < 10) {
            return { valid: false, error: 'API key is too short' };
        }
        
        // In a real implementation, we would make a test API call here
        return { valid: true };
    } catch (error) {
        console.error('Error validating API key:', error);
        return { valid: false, error: error.message };
    }
}

/**
 * Initializes storage with default values
 */
function initializeStorage() {
    // Get current storage
    chrome.storage.sync.get(null, (data) => {
        const updates = {};
        
        // Set default values if not already set
        if (data[STORAGE_KEYS.AUTO_DETECT] === undefined) {
            updates[STORAGE_KEYS.AUTO_DETECT] = true;
        }
        
        if (!data[STORAGE_KEYS.DETECTION_SENSITIVITY]) {
            updates[STORAGE_KEYS.DETECTION_SENSITIVITY] = 'medium';
        }
        
        if (!data[STORAGE_KEYS.DETECTION_HISTORY]) {
            updates[STORAGE_KEYS.DETECTION_HISTORY] = [];
        }
        
        if (!data[STORAGE_KEYS.USER_PREFERENCES]) {
            updates[STORAGE_KEYS.USER_PREFERENCES] = {
                theme: 'light',
                fontSize: 'medium',
                autoSolve: false
            };
        }
        
        if (!data[STORAGE_KEYS.SAVED_ELEMENTS]) {
            updates[STORAGE_KEYS.SAVED_ELEMENTS] = {};
        }
        
        // Save updates if any
        if (Object.keys(updates).length > 0) {
            chrome.storage.sync.set(updates, () => {
                console.log('Storage initialized with defaults');
            });
        }
    });
}

/**
 * Handles storage updates
 * @param {Object} payload - Update payload with key and value
 * @returns {Promise<Object>} Update result
 */
async function handleStorageUpdate(payload) {
    try {
        if (!payload || !payload.key) {
            return { success: false, error: 'Invalid payload' };
        }
        
        await saveStorageData({ [payload.key]: payload.value });
        return { success: true };
    } catch (error) {
        console.error('Storage update error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Saves data to storage
 * @param {Object} data - Data to save
 * @returns {Promise<void>} Promise that resolves when data is saved
 */
function saveStorageData(data) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set(data, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Retrieves data from storage
 * @param {Array<string>} keys - Keys to retrieve
 * @returns {Promise<Object>} Promise that resolves with retrieved data
 */
function getStorageData(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(keys, (data) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(data);
            }
        });
    });
}

/**
 * Broadcasts a storage update to all tabs
 * @param {Object} payload - The update payload containing key and value
 * @returns {Promise<void>} Promise that resolves when broadcast is complete
 */
async function broadcastStorageUpdate(payload) {
    try {
        const tabs = await chrome.tabs.query({});
        console.log(`Broadcasting to ${tabs.length} tabs`);
        
        for (const tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'STORAGE_UPDATE',
                    payload
                });
            } catch (error) {
                // Ignore errors from inactive tabs
            }
        }
        
        console.log('Broadcast complete');
        return { success: true };
    } catch (error) {
        console.error('Error broadcasting storage update:', error);
        return { success: false, error: error.message };
    }
}

// Initialize the background script
initialize();
