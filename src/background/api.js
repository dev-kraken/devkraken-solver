/**
 * API-related functions for background service
 * @author Dev Kraken <soman@devkraken.com>
 */

/**
 * Validates a Gemini API key
 * @param {Object} payload - Payload containing the API key
 * @returns {Promise<Object>} Validation result
 */
export async function validateApiKey(payload) {
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
