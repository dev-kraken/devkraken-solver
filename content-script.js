/**
 * Content script for Quiz Solver extension
 * @author Dev Kraken <soman@devkraken.com>
 */

// Inject page script for UI interaction
let isScriptInjected = false;

/**
 * Shows a direct toast notification without relying on the UI framework
 * @param {string} message - Message to show
 * @param {'success'|'error'|'info'} type - Toast type
 */
function showDirectToast(message, type = 'info') {
    try {
        const toastId = 'direct-quiz-solver-toast-' + Date.now();
        
        // Create toast element
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.padding = '12px 20px';
        toast.style.borderRadius = '4px';
        toast.style.zIndex = '10000';
        toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        toast.style.fontFamily = 'Arial, sans-serif';
        toast.style.fontSize = '14px';
        toast.style.color = 'white';
        toast.style.maxWidth = '300px';
        toast.style.wordBreak = 'break-word';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'opacity 0.3s, transform 0.3s';
        
        // Set color based on type
        if (type === 'success') {
            toast.style.backgroundColor = '#4caf50';
            message = '✓ ' + message;
        } else if (type === 'error') {
            toast.style.backgroundColor = '#f44336';
            message = '✗ ' + message;
        } else {
            toast.style.backgroundColor = '#8e24aa';
            message = 'ℹ ' + message;
        }
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Force reflow
        toast.getBoundingClientRect();
        
        // Show toast
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 5000);
    } catch (error) {
        console.error('Failed to show toast:', error);
        
        // Last resort fallback
        try {
            console.log('[Quiz Solver] ' + message);
        } catch (e) {
            // Silent fail
        }
    }
}

/**
 * Injects a script into the page context
 */
function injectScript() {
    if (isScriptInjected) return;
    
    try {
        // Create script element
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('src/content/index.js');
        script.type = 'module';
        
        // Listen for load and error events
        script.onload = () => {
            isScriptInjected = true;
            script.remove(); // Clean up after successful loading
        };
        
        script.onerror = (error) => {
            console.error('Error loading script:', error);
            showDirectToast('Failed to load quiz solver script', 'error');
        };
        
        // Add to page
        (document.head || document.documentElement).appendChild(script);
    } catch (error) {
        console.error('Error injecting script:', error);
        showDirectToast('Failed to inject quiz solver script', 'error');
    }
}

/**
 * Sets up messaging between content script and background script
 */
function setupMessaging() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // Relay message to the page script
        const event = new CustomEvent('quiz-solver-content-message', {
            detail: request
        });
        
        document.dispatchEvent(event);
        
        // Set up response listener
        document.addEventListener('quiz-solver-content-response', function handler(e) {
            document.removeEventListener('quiz-solver-content-response', handler);
            sendResponse(e.detail);
        }, { once: true });
        
        return true;
    });
}

/**
 * Sets up storage request handling
 */
function setupStorageRequestHandling() {
    // Listen for storage requests from the page
    window.addEventListener('quiz-solver-storage-request', async (event) => {
        try {
            const detail = event.detail;
            let response = {};
            
            // Handle different actions
            if (detail.action === 'get') {
                try {
                    const data = await new Promise(resolve => {
                        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                            chrome.storage.sync.get(detail.keys, result => {
                                resolve(result);
                            });
                        } else {
                            resolve({});
                        }
                    });
                    response = { result: data };
                } catch (err) {
                    console.error('Error getting storage data:', err);
                    response = { error: err.message, result: {} };
                }
            } else if (detail.action === 'set') {
                try {
                    await new Promise(resolve => {
                        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                            chrome.storage.sync.set(detail.data, () => {
                                resolve();
                            });
                        } else {
                            resolve();
                        }
                    });
                    response = { success: true };
                } catch (err) {
                    console.error('Error setting storage data:', err);
                    response = { error: err.message };
                }
            } else if (detail.action === 'remove') {
                try {
                    await new Promise(resolve => {
                        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                            chrome.storage.sync.remove(detail.keys, () => {
                                resolve();
                            });
                        } else {
                            resolve();
                        }
                    });
                    response = { success: true };
                } catch (err) {
                    console.error('Error removing storage data:', err);
                    response = { error: err.message };
                }
            } else {
                console.error('Invalid storage action:', detail.action);
                response = { error: 'Invalid action' };
            }
            
            // Send the response back to the page
            window.dispatchEvent(new CustomEvent('quiz-solver-storage-response', { 
                detail: response 
            }));
        } catch (error) {
            console.error('Error handling storage request:', error);
            // Send error back to the page
            window.dispatchEvent(new CustomEvent('quiz-solver-storage-response', { 
                detail: { error: error.message, result: {} } 
            }));
        }
    });
}

/**
 * Initialize the content script
 */
function initialize() {
    try {
        // Don't initialize in iframes to avoid multiple instances
        if (window !== window.top) {
            return;
        }
        
        // Set up storage request handling
        setupStorageRequestHandling();
        
        // Set up messaging
        setupMessaging();
        
        // Inject script
        injectScript();
        
        // Add a click handler to show the API key message when clicking the extension button
        document.addEventListener('click', function(e) {
            if (e.target && (e.target.id === 'solveQuizBtn' || e.target.closest('#solveQuizBtn'))) {
                // Check if API key exists
                chrome.storage.sync.get('geminiApiKey', function(result) {
                    if (!result || !result.geminiApiKey) {
                        showDirectToast('Please set your Gemini API key in the extension popup', 'error');
                    } else {
                        // API key exists, trigger solve action
                        document.dispatchEvent(new CustomEvent('quiz-solver-button-clicked'));
                    }
                });
            }
        }, true);
    } catch (error) {
        console.error('Error initializing Quiz Solver:', error);
        showDirectToast('Error initializing Quiz Solver: ' + error.message);
    }
}

// Make sure the document is ready before injecting
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
