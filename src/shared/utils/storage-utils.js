/**
 * Chrome storage utilities
 * @author Dev Kraken <soman@devkraken.com>
 */

/**
 * Checks if code is running in extension context
 * @returns {boolean} True if in extension context
 */
function isExtensionContext() {
    return typeof chrome !== 'undefined' && chrome.storage !== undefined;
}

/**
 * Gets data from Chrome sync storage
 * @param {string|Array<string>} keys - Keys to retrieve from storage
 * @returns {Promise<Object>} Object containing the requested data
 */
export async function getStorageData(keys) {
    console.log('getStorageData called with keys:', keys);
    
    // If in extension context, use Chrome API directly
    if (isExtensionContext()) {
        console.log('Using direct Chrome storage API');
        return new Promise(resolve => {
            chrome.storage.sync.get(keys, data => {
                console.log('Retrieved data from Chrome storage:', data);
                resolve(data);
            });
        });
    } 
    
    // Otherwise, use message passing
    console.log('Using message passing for storage access');
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            console.error('Storage request timed out');
            reject(new Error('Storage request timed out'));
        }, 5000);
        
        window.addEventListener('quiz-solver-storage-response', function handler(event) {
            window.removeEventListener('quiz-solver-storage-response', handler);
            clearTimeout(timeoutId);
            
            const data = event.detail;
            console.log('Received storage response:', data);
            
            if (data.error) {
                console.error('Storage error:', data.error);
                reject(new Error(data.error));
            } else {
                console.log('Storage data retrieved successfully');
                resolve(data.result);
            }
        }, { once: true });
        
        // Dispatch request to content script
        console.log('Dispatching storage request event');
        const requestEvent = new CustomEvent('quiz-solver-storage-request', {
            detail: {
                action: 'get',
                keys: keys
            }
        });
        window.dispatchEvent(requestEvent);
    });
}

/**
 * Saves data to Chrome sync storage
 * @param {Object} data - Data object to save to storage
 * @returns {Promise<void>} Promise that resolves when save is complete
 */
export async function saveStorageData(data) {
    console.log('saveStorageData called with data:', data);
    
    // If in extension context, use Chrome API directly
    if (isExtensionContext()) {
        console.log('Using direct Chrome storage API for saving');
        return new Promise(resolve => {
            chrome.storage.sync.set(data, () => {
                console.log('Data saved to Chrome storage');
                resolve();
            });
        });
    }
    
    // Otherwise, use message passing
    console.log('Using message passing for storage save');
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            console.error('Storage save request timed out');
            reject(new Error('Storage save request timed out'));
        }, 5000);
        
        window.addEventListener('quiz-solver-storage-response', function handler(event) {
            window.removeEventListener('quiz-solver-storage-response', handler);
            clearTimeout(timeoutId);
            
            const response = event.detail;
            console.log('Received storage save response:', response);
            
            if (response.error) {
                console.error('Storage save error:', response.error);
                reject(new Error(response.error));
            } else {
                console.log('Storage data saved successfully');
                resolve();
            }
        }, { once: true });
        
        // Dispatch request to content script
        console.log('Dispatching storage save request event');
        const requestEvent = new CustomEvent('quiz-solver-storage-request', {
            detail: {
                action: 'set',
                data: data
            }
        });
        window.dispatchEvent(requestEvent);
    });
}

/**
 * Removes data from Chrome sync storage
 * @param {string|Array<string>} keys - Keys to remove from storage
 * @returns {Promise<void>} Promise that resolves when removal is complete
 */
export async function removeStorageData(keys) {
    console.log('removeStorageData called with keys:', keys);
    
    // If in extension context, use Chrome API directly
    if (isExtensionContext()) {
        console.log('Using direct Chrome storage API for removal');
        return new Promise(resolve => {
            chrome.storage.sync.remove(keys, () => {
                console.log('Data removed from Chrome storage');
                resolve();
            });
        });
    }
    
    // Otherwise, use message passing
    console.log('Using message passing for storage removal');
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            console.error('Storage remove request timed out');
            reject(new Error('Storage remove request timed out'));
        }, 5000);
        
        window.addEventListener('quiz-solver-storage-response', function handler(event) {
            window.removeEventListener('quiz-solver-storage-response', handler);
            clearTimeout(timeoutId);
            
            const response = event.detail;
            console.log('Received storage remove response:', response);
            
            if (response.error) {
                console.error('Storage remove error:', response.error);
                reject(new Error(response.error));
            } else {
                console.log('Storage data removed successfully');
                resolve();
            }
        }, { once: true });
        
        // Dispatch request to content script
        console.log('Dispatching storage remove request event');
        const requestEvent = new CustomEvent('quiz-solver-storage-request', {
            detail: {
                action: 'remove',
                keys: keys
            }
        });
        window.dispatchEvent(requestEvent);
    });
}

/**
 * Broadcasts a storage update to all tabs
 * @param {Object} payload - The update payload containing key and value
 * @returns {Promise<void>} Promise that resolves when broadcast is complete
 */
export async function broadcastStorageUpdate(payload) {
    console.log('broadcastStorageUpdate called with payload:', payload);
    
    // Only available in extension context
    if (!isExtensionContext()) {
        console.warn('broadcastStorageUpdate is only available in extension context');
        return;
    }
    
    try {
        const tabs = await chrome.tabs.query({});
        console.log(`Broadcasting to ${tabs.length} tabs`);
        
        const promises = tabs.map(tab => {
            return chrome.tabs.sendMessage(tab.id, {
                type: 'STORAGE_UPDATE',
                payload
            }).catch(() => {
                // Ignore errors from inactive tabs
            });
        });
        
        await Promise.allSettled(promises);
        console.log('Broadcast complete');
    } catch (error) {
        console.error('Error broadcasting storage update:', error);
    }
}
