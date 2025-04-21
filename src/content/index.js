/**
 * Content script entry point for Quiz Solver extension
 * @author Dev Kraken <soman@devkraken.com>
 */

// Add a global error handler
window.addEventListener('error', function(event) {
    console.error('Quiz Solver Extension Error:', event.error);
});

// Add a version marker
window.QUIZ_SOLVER_VERSION = '1.0.0';
console.log('Quiz Solver Extension v1.0.0 loading...');

import { UIManager } from './ui/ui-manager.js';
import { QuizService } from './services/quiz-service.js';

/**
 * Initializes the extension
 */
async function initializeApp() {
    try {
        console.log('Initializing Quiz Solver extension components...');
        
        // First initialize the UI manager
        console.log('Initializing UI Manager...');
        const uiManager = new UIManager();
        await uiManager.initialize();
        console.log('UI Manager initialized successfully');
        
        // Then initialize the quiz service with the UI manager
        console.log('Initializing Quiz Service...');
        const quizService = new QuizService(uiManager);
        await quizService.initialize();
        console.log('Quiz Service initialized successfully');
        
        // Store service reference for debugging
        window.__QUIZ_SOLVER__ = quizService;
        
        console.log('Quiz Solver extension initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Quiz Solver extension:', error);
    }
}

// Start the extension when the DOM is fully loaded
if (document.readyState === 'loading') {
    console.log('Document loading, will initialize on DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    console.log('Document already loaded, initializing now');
    initializeApp();
}
