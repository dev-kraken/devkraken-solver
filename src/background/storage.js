/**
 * Storage management for background service
 * @author Dev Kraken <soman@devkraken.com>
 */

import { STORAGE_KEYS } from '../shared/constants.js';
import { getStorageData, saveStorageData } from '../shared/utils/storage-utils.js';

/**
 * Initializes storage with default values
 * @returns {Promise<void>}
 */
export async function initializeStorage() {
    const data = await getStorageData([
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
        await saveStorageData(updateNeeded);
    }
}
