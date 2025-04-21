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
        console.log('Quiz Solver: Background script initializing');
        
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
            if (!tab || !tab.id) return;
            
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
            broadcastStorageUpdate(message.payload)
                .then(() => sendResponse({ success: true }))
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
