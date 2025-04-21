/**
 * Quiz Solver with Gemini - Content Script Initializer
 * This script loads the extension functionality into the page
 * Developed by Dev Kraken (soman@devkraken.com)
 */

// Load constants and initialize the app
async function initializeApp() {
    try {
        // Load constants
        const constants = await import(chrome.runtime.getURL('js/constants.js'));
        
        // Make constants available globally
        window.__CONSTANTS__ = {
            CLASSES: constants.CLASSES,
            STORAGE_KEYS: constants.STORAGE_KEYS,
            API_ENDPOINT: constants.API_ENDPOINT,
            MESSAGE_TYPES: constants.MESSAGE_TYPES,
            BRANDING: constants.BRANDING
        };
        
        // Load and initialize the UIManager
        const { UIManager } = await import(chrome.runtime.getURL('js/content/UIManager.js'));
        const uiManager = new UIManager();
        await uiManager.initialize();
        
        // Load and initialize the QuizService
        const { QuizService } = await import(chrome.runtime.getURL('js/content/QuizService.js'));
        const quizService = new QuizService();
        await quizService.initialize();
        
        // Store service reference for debugging
        window.__QUIZ_SOLVER__ = quizService;
    } catch (error) {
        console.error('Failed to initialize Quiz Solver extension:', error);
    }
}

// Start the extension
initializeApp();