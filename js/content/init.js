/**
 * Quiz Solver with Gemini - Content Script Initializer
 * This script loads the extension functionality into the page
 */

// Load constants and initialize the app
async function initializeApp() {
    try {
        console.log('Initializing Quiz Solver extension...');
        
        // Load constants
        const constants = await import(chrome.runtime.getURL('js/constants.js'));
        
        // Make constants available globally
        window.__CONSTANTS__ = {
            CLASSES: constants.CLASSES,
            STORAGE_KEYS: constants.STORAGE_KEYS,
            API_ENDPOINT: constants.API_ENDPOINT,
            MESSAGE_TYPES: constants.MESSAGE_TYPES
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
        
        console.log('Quiz Solver extension initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Quiz Solver extension:', error);
    }
}

// Start the extension
initializeApp();