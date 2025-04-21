// Content script loader
// This file loads the actual module content script

// Simple toast function that doesn't rely on modules
function showDirectToast(message, type = 'error') {
    try {
        console.log(`Direct Toast: ${message} (${type})`);
        
        // Remove any existing toast
        const existingToast = document.getElementById('quiz-solver-direct-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.id = 'quiz-solver-direct-toast';
        toast.textContent = message;
        
        // Style the toast
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '4px',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            zIndex: '10001',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            maxWidth: '300px',
            wordBreak: 'break-word',
            opacity: '0',
            transform: 'translateY(20px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease'
        });
        
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
        
        // Add to document
        document.body.appendChild(toast);
        
        // Force reflow and animate in
        toast.getBoundingClientRect();
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 5000);
        
        return true;
    } catch (error) {
        console.error('Error showing direct toast:', error);
        // Last resort
        try {
            alert('Quiz Solver: ' + message);
        } catch (e) {
            console.error('Even alert failed:', e);
        }
        return false;
    }
}

// Function to inject the module script
function injectScript() {
    try {
        // Check if we have access to document and document.head
        if (!document || !document.head) {
            console.warn('Quiz Solver: Cannot access document head, possibly in an iframe');
            return;
        }
        
        // Create a script element to load the real content script as a module
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('src/content/index.js');
        script.type = 'module';
        document.head.appendChild(script);

        // Inject CSS - note that the CSS is already injected by the manifest's content_scripts
        // but we also inject it here for completeness in case we need dynamic styles later
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL('css/content.css');
        document.head.appendChild(link);
        
        console.log('Quiz Solver scripts injected successfully');
        
        // No longer showing initialization toast
        // setTimeout(() => {
        //     showDirectToast('Quiz Solver initialized', 'info');
        // }, 2000);
    } catch (error) {
        console.error('Error injecting Quiz Solver scripts:', error);
        showDirectToast('Failed to initialize Quiz Solver: ' + error.message);
    }
}

// Set up storage request handling
function setupStorageRequestHandling() {
    console.log('Setting up storage request handling');
    
    // Listen for storage requests from the page
    window.addEventListener('quiz-solver-storage-request', async (event) => {
        try {
            console.log('Content script: Received storage request:', event.detail);
            const detail = event.detail;
            let response = {};
            
            // Handle different actions
            if (detail.action === 'get') {
                console.log('Content script: Processing GET storage request for keys:', detail.keys);
                
                try {
                    const data = await new Promise(resolve => {
                        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                            chrome.storage.sync.get(detail.keys, result => {
                                console.log('Content script: Storage GET result:', result);
                                resolve(result);
                            });
                        } else {
                            console.warn('Content script: chrome.storage.sync not available, returning empty result');
                            resolve({});
                        }
                    });
                    response = { result: data };
                } catch (err) {
                    console.error('Error getting storage data:', err);
                    response = { error: err.message, result: {} };
                }
            } else if (detail.action === 'set') {
                console.log('Content script: Processing SET storage request with data:', detail.data);
                
                try {
                    await new Promise(resolve => {
                        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                            chrome.storage.sync.set(detail.data, () => {
                                console.log('Content script: Storage SET completed');
                                resolve();
                            });
                        } else {
                            console.warn('Content script: chrome.storage.sync not available, skipping SET');
                            resolve();
                        }
                    });
                    response = { success: true };
                } catch (err) {
                    console.error('Error setting storage data:', err);
                    response = { error: err.message };
                }
            } else if (detail.action === 'remove') {
                console.log('Content script: Processing REMOVE storage request for keys:', detail.keys);
                
                try {
                    await new Promise(resolve => {
                        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                            chrome.storage.sync.remove(detail.keys, () => {
                                console.log('Content script: Storage REMOVE completed');
                                resolve();
                            });
                        } else {
                            console.warn('Content script: chrome.storage.sync not available, skipping REMOVE');
                            resolve();
                        }
                    });
                    response = { success: true };
                } catch (err) {
                    console.error('Error removing storage data:', err);
                    response = { error: err.message };
                }
            } else {
                console.error('Content script: Invalid storage action:', detail.action);
                response = { error: 'Invalid action' };
            }
            
            // Send the response back to the page
            console.log('Content script: Sending storage response:', response);
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
    
    console.log('Storage request handling set up successfully');
}

// Set up messaging between content script and background script
function setupMessaging() {
    // Listen for messages from the injected script
    window.addEventListener('quiz-solver-background-request', (event) => {
        // Forward to background script
        chrome.runtime.sendMessage(event.detail, (response) => {
            // Send response back to page
            window.dispatchEvent(new CustomEvent('quiz-solver-background-response', {
                detail: response
            }));
        });
    });
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Forward to page
        window.dispatchEvent(new CustomEvent('quiz-solver-content-message', {
            detail: message
        }));
        
        // Show direct toast for API key messages
        if (message.action === "showError" && message.message && message.message.includes('API key')) {
            showDirectToast(message.message, 'error');
        }
        
        return true;
    });
}

// Initialize
function initialize() {
    try {
        // Don't initialize in iframes to avoid multiple instances
        if (window !== window.top) {
            console.log('Quiz Solver: Not initializing in iframe');
            return;
        }
        
        console.log('Initializing Quiz Solver content script');
        
        // Set up storage request handling
        setupStorageRequestHandling();
        
        // Set up messaging
        setupMessaging();
        
        // Inject script
        injectScript();
        
        // Add a click handler to show the API key message when clicking the extension button
        document.addEventListener('click', function(e) {
            if (e.target && (e.target.id === 'solveQuizBtn' || e.target.closest('#solveQuizBtn'))) {
                console.log('Content script: Detected click on solver button');
                
                // Check if API key exists
                chrome.storage.sync.get('geminiApiKey', function(result) {
                    console.log('API key check result:', result);
                    
                    if (!result || !result.geminiApiKey) {
                        showDirectToast('Please set your Gemini API key in the extension popup', 'error');
                    } else {
                        console.log('API key found, proceeding with solve');
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
