/**
 * Main quiz service that coordinates all quiz solving functionality
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

const QUESTION_PATTERNS = [
    /\?$/,
    /what|how|why|when|where|which|who|describe|explain|list|define|compare|contrast|analyze|evaluate|discuss/i
];

const SITE_SPECIFIC_SELECTORS = {
    'udemy.com': {
        QUESTION: '.mcq--question-prompt--GVB5Z',
        OPTION: '.mcq--option-text--RBkgL'
    },
    'coursera.org': {
        QUESTION: '.rc-FormPartsQuestion',
        OPTION: '.rc-Option'
    },
    'quizlet.com': {
        QUESTION: '.FormattedText',
        OPTION: '.MultipleChoiceQuestionPrompt-term'
    }
};

const SUBJECT_PATTERNS = {
    'javascript': [/javascript|js|node|react|angular|vue/i],
    'python': [/python|django|flask|numpy|pandas/i],
    'java': [/java|spring|hibernate|maven|gradle/i],
    'csharp': [/c#|\.net|asp\.net|xamarin/i],
    'cpp': [/c\+\+|cpp|stl|boost/i],
    'php': [/php|laravel|symfony|wordpress/i],
    'sql': [/sql|database|mysql|postgresql|oracle|nosql|mongodb/i],
    'html': [/html|css|sass|scss|bootstrap|tailwind/i],
    'general': [/.*/]
};

// Common selectors
const QUESTION_SELECTORS = [
    '.question', 
    '.quiz-question', 
    '.question-text',
    '[data-testid="question"]',
    '[role="heading"]',
    'h3',
    'h4',
    '.stem',
    '.problem-statement',
    '.assessment-item',
    '[aria-label*="question"]',
    '.prompt'
];

const OPTION_SELECTORS = [
    '.question__single-answer',
    '.option',
    '.answer',
    '.answer-option',
    '.quiz-option',
    '.mcq-option',
    '.choice',
    '.choice-option',
    'input[type="radio"] + label',
    'input[type="checkbox"] + label',
    '[role="radio"]',
    '[role="checkbox"]',
    '.rc-Option',
    '.multiple-choice-option',
    '.multiple-choice-container'
];

import { extractAnswer } from './answer-extractor.js';
import { evaluateCode, isCodeEvaluationQuestion } from './code-evaluator.js';
import { fetchGeminiResponse } from './gemini-api.js';
import { getAllTextNodes } from '../../shared/utils/dom-utils.js';
import { getStorageData, saveStorageData } from '../../shared/utils/storage-utils.js';

/**
 * Main service for handling quiz questions and answers
 */
export class QuizService {
    /**
     * @param {import('../ui/ui-manager.js').UIManager} uiManager - UI manager instance
     */
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.apiKey = null;
        this.autoDetectEnabled = true;
        this.detectionSensitivity = 'medium';
        this.lastDetectedQuestion = null;
        this.lastDetectedOptions = [];
        this.siteSpecificSelectors = null;
        this.detectedSubject = null;
        this.selectionMode = false;
        this.savedElements = {};
        this.detectionHistory = [];
    }
    
    /**
     * Initializes the quiz service
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // Load settings
            await this.loadSettings();
            
            // Detect site-specific selectors
            this.detectSiteSpecificSelectors();
            
            // Set up UI event listeners
            this.setupListeners();
            
            // Auto-detect questions if enabled
            if (this.autoDetectEnabled) {
                setTimeout(() => this.detectQuestionsOnPage(), 1500);
            }
            
            return Promise.resolve();
        } catch (error) {
            console.error('Error initializing QuizService:', error);
            return Promise.reject(error);
        }
    }
    
    /**
     * Loads settings from storage
     * @returns {Promise<void>}
     */
    async loadSettings() {
        try {
            console.log('QuizService: Loading settings');
            
            // Use the storage utility to get data
            const data = await getStorageData([
                STORAGE_KEYS.API_KEY,
                STORAGE_KEYS.AUTO_DETECT,
                STORAGE_KEYS.DETECTION_SENSITIVITY,
                STORAGE_KEYS.DETECTION_HISTORY,
                STORAGE_KEYS.SAVED_ELEMENTS
            ]);
            
            console.log('QuizService: Settings loaded:', 
                { 
                    hasApiKey: !!data[STORAGE_KEYS.API_KEY],
                    autoDetect: data[STORAGE_KEYS.AUTO_DETECT],
                    sensitivity: data[STORAGE_KEYS.DETECTION_SENSITIVITY]
                }
            );
            
            this.apiKey = data[STORAGE_KEYS.API_KEY];
            this.autoDetectEnabled = data[STORAGE_KEYS.AUTO_DETECT] !== undefined 
                ? data[STORAGE_KEYS.AUTO_DETECT] 
                : true;
            this.detectionSensitivity = data[STORAGE_KEYS.DETECTION_SENSITIVITY] || 'medium';
            this.detectionHistory = data[STORAGE_KEYS.DETECTION_HISTORY] || [];
            this.savedElements = data[STORAGE_KEYS.SAVED_ELEMENTS] || {};
        } catch (error) {
            console.error('Error loading settings:', error);
            throw error;
        }
    }
    
    /**
     * Sets up site-specific selectors based on the current domain
     */
    detectSiteSpecificSelectors() {
        const hostname = window.location.hostname;
        for (const site in SITE_SPECIFIC_SELECTORS) {
            if (hostname.includes(site)) {
                this.siteSpecificSelectors = SITE_SPECIFIC_SELECTORS[site];
                break;
            }
        }
    }
    
    /**
     * Sets up event listeners
     */
    setupListeners() {
        console.log('QuizService: Setting up event listeners');
        
        // Set UI manager button click handler
        this.uiManager.setButtonClickHandler(() => {
            console.log('QuizService: Button click handler called');
            return this.handleSolveClick();
        });
        
        // Also listen for the custom event as a fallback
        document.addEventListener('quiz-solver-button-clicked', () => {
            console.log('QuizService: Received quiz-solver-button-clicked event');
            this.handleSolveClick();
        });
        
        // Listen for element selection events
        document.addEventListener('quiz-element-selected', (e) => {
            console.log('QuizService: Received quiz-element-selected event');
            this.handleElementSelected(e.detail.element);
        });
        
        // Listen for cancel selection events
        document.addEventListener('quiz-solver-cancel-selection', () => {
            console.log('QuizService: Received quiz-solver-cancel-selection event');
            this.cancelSelectionMode();
        });
        
        // Listen for messages from content script
        document.addEventListener('quiz-solver-content-message', (e) => {
            const message = e.detail;
            // Create a mock sendResponse function that uses CustomEvent to send the response
            const sendResponse = (response) => {
                document.dispatchEvent(new CustomEvent('quiz-solver-content-response', {
                    detail: response
                }));
            };
            this.handleChromeMessages(message, null, sendResponse);
        });
    }
    
    /**
     * Handles Chrome extension messages
     * @param {any} request - Message request
     * @param {any} sender - Message sender
     * @param {Function} sendResponse - Response callback
     * @returns {boolean} Whether to keep the message channel open
     */
    handleChromeMessages(request, sender, sendResponse) {
        try {
            // Handle selected text from context menu
            if (request.action === "solveSelected") {
                this.handleSelectedQuestion(request.text);
                sendResponse({status: 'processing'});
                return true;
            }
            
            // Handle solve current quiz request from popup
            if (request.action === "solveCurrentQuiz") {
                this.handleSolveClick();
                sendResponse({status: 'processing'});
                return true;
            }
            
            // Handle error display request
            if (request.action === "showError") {
                this.uiManager.showError(request.message);
                sendResponse({status: 'error shown'});
                return true;
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({status: 'error', message: error.message});
        }
        
        return false;
    }
    
    /**
     * Handles the solve button click
     */
    async handleSolveClick() {
        try {
            console.log('QuizService: Handle solve button click');
            
            // Check if we're already in selection mode
            if (this.selectionMode) {
                console.log('QuizService: Already in selection mode, ignoring click');
                return;
            }
            
            // Check if API key exists
            if (!this.apiKey) {
                await this.loadSettings();
                console.log('QuizService: API key after loading settings:', !!this.apiKey);
                
                if (!this.apiKey) {
                    console.warn('API key missing. Showing error message.');
                    this.uiManager.showError('Please set your Gemini API key in the extension popup');
                    return;
                }
            }
            
            console.log('QuizService: API key found, proceeding with solve');
            
            // Check if we have a saved element for this domain
            let savedElement = null;
            try {
                savedElement = await this.uiManager.getSavedElement();
                console.log('QuizService: Saved element retrieval result:', !!savedElement);
            } catch (error) {
                console.error('Error retrieving saved element:', error);
                // Continue without a saved element
            }
            
            if (savedElement) {
                // Use the saved element
                console.log('QuizService: Using saved element for domain:', window.location.hostname);
                this.uiManager.showToast(`Using saved element for ${window.location.hostname}`, 'info');
                
                // Highlight the saved element temporarily to show which one is being used
                this.flashElement(savedElement);
                
                // Process the saved element
                await this.handleElementSelected(savedElement);
                return;
            }
            
            // Enter selection mode
            console.log('QuizService: No saved element found, entering selection mode');
            this.uiManager.showToast('Please select the element containing the quiz question', 'info');
            this.enterSelectionMode();
        } catch (error) {
            this.handleError('handleSolveClick', error, 'Failed to enter selection mode');
        }
    }
    
    /**
     * Cancels selection mode
     */
    cancelSelectionMode() {
        this.selectionMode = false;
        this.uiManager.disableSelectionMode();
        this.uiManager.showToast('Selection mode canceled', 'info');
    }
    
    /**
     * Enters selection mode
     */
    enterSelectionMode() {
        this.selectionMode = true;
        this.uiManager.enableSelectionMode();
    }
    
    /**
     * Handles a selected element
     * @param {Element} element - The selected DOM element
     */
    async handleElementSelected(element) {
        try {
            console.log('QuizService: Element selected:', element);
            
            if (!element) {
                this.uiManager.showError('No element was selected');
                return;
            }
            
            // Exit selection mode if we're still in it
            if (this.selectionMode) {
                console.log('QuizService: Exiting selection mode');
                this.selectionMode = false;
                this.uiManager.disableSelectionMode(); // Make sure UI is updated
            }
            
            this.uiManager.showToast('Processing selected element...', 'info');
            this.uiManager.showLoader();
            
            if (!this.apiKey) {
                await this.loadSettings();
                console.log('QuizService: API key after loading settings:', !!this.apiKey);
                
                if (!this.apiKey) {
                    this.uiManager.hideLoader();
                    this.uiManager.showError('Please set your API key in the extension popup');
                    return;
                }
            }
            
            // Extract question and options from the selected element
            const { question, options } = this.extractContentFromElement(element);
            
            if (!question) {
                this.uiManager.hideLoader();
                this.uiManager.showError('Could not extract a question from the selected element');
                return;
            }
            
            console.log('QuizService: Extracted question:', question);
            console.log('QuizService: Extracted options:', options);
            
            // Save this element for future use
            try {
                const saved = await this.uiManager.saveElementXPath(element);
                if (saved) {
                    console.log('QuizService: Element saved successfully for future use');
                } else {
                    console.warn('QuizService: Failed to save element for future use');
                }
            } catch (error) {
                console.error('Error saving element XPath:', error);
                // Continue anyway, this is not critical
            }
            
            // Get the answer from Gemini
            const answer = await this.getAnswerFromGemini(question, options);
            
            this.uiManager.hideLoader();
            
            if (!answer) {
                this.uiManager.showError('Could not get an answer from Gemini');
                return;
            }
            
            // Show the results
            this.uiManager.showResults(question, answer);
            
            // Try to highlight the answer on the page
            this.uiManager.highlightAnswer(answer, options);
            
            // Add to detection history
            this.addToDetectionHistory(question, answer, options);
            
        } catch (error) {
            this.uiManager.hideLoader();
            this.handleError('handleElementSelected', error, 'Failed to process selected element');
        }
    }
    
    /**
     * Handles a selected question text
     * @param {string} text - Selected question text
     */
    async handleSelectedQuestion(text) {
        try {
            this.uiManager.showLoader();
            
            if (!this.apiKey) {
                await this.loadSettings();
                if (!this.apiKey) {
                    this.uiManager.showError('Please set your API key in the extension popup');
                    return;
                }
            }
            
            // Try to detect options on the page
            const options = this.detectOptionsOnPage();
            
            if (!options || options.length === 0) {
                this.uiManager.showError('No answer options detected on this page');
                return;
            }
            
            // Process the question and get the answer
            await this.processQuestionAndAnswer(text, options);
        } catch (error) {
            this.handleError('handleSelectedQuestion', error, 'Failed to solve selected question');
        } finally {
            this.cleanupAfterProcessing();
        }
    }
    
    /**
     * Processes a question and gets an answer
     * @param {string} question - Question text
     * @param {Array<string>} options - Answer options
     * @returns {Promise<string>} The answer
     */
    async processQuestionAndAnswer(question, options) {
        // Save the detected question and options
        this.lastDetectedQuestion = question;
        this.lastDetectedOptions = options;
        
        // Detect academic subject for better context
        this.detectSubject(question);
        
        // For code questions, try to evaluate the code directly
        if (isCodeEvaluationQuestion(question)) {
            const codeAnswer = evaluateCode(question, options);
            if (codeAnswer) {
                this.uiManager.highlightAnswer(codeAnswer, options);
                this.saveToHistory(question, codeAnswer);
                return codeAnswer;
            }
        }
        
        // If not a code question or code evaluation failed, use Gemini API
        const geminiResponse = await fetchGeminiResponse(
            question, 
            options, 
            this.apiKey, 
            this.detectedSubject
        );
        
        const answer = extractAnswer(geminiResponse, options);
        
        if (!answer) {
            throw new Error('Could not determine the answer from Gemini response');
        }
        
        // Highlight the answer on the page
        this.uiManager.highlightAnswer(answer, options);
        
        // Save to detection history
        this.saveToHistory(question, answer);
        
        return answer;
    }
    
    /**
     * Cleans up after processing
     */
    cleanupAfterProcessing() {
        this.uiManager.hideLoader();
        this.selectionMode = false;
    }
    
    /**
     * Handles errors in a consistent way
     * @param {string} methodName - Name of the method where the error occurred
     * @param {Error} error - Error object
     * @param {string} defaultMessage - Default message if error doesn't have one
     */
    handleError(methodName, error, defaultMessage) {
        console.error(`Error in ${methodName}:`, error);
        this.uiManager.showError(error.message || defaultMessage);
    }
    
    /**
     * Extracts content from an element
     * @param {Element} element - Element to extract from
     * @returns {Object} Object with question and options
     */
    extractContentFromElement(element) {
        if (!element) return { question: null, options: [] };
        
        let question = null;
        let options = [];
        
        // Try to find a question within the element
        // First, look for elements that match common question selectors
        const selectors = this.siteSpecificSelectors ? 
            [this.siteSpecificSelectors.QUESTION, ...QUESTION_SELECTORS] : 
            QUESTION_SELECTORS;
            
        for (const selector of selectors) {
            if (!selector) continue;
            
            try {
                const questionElement = element.querySelector(selector);
                if (questionElement) {
                    question = questionElement.textContent.trim();
                    break;
                }
            } catch (e) {
                // Skip invalid selector
            }
        }
        
        // If no question found with selectors, try to find text that looks like a question
        if (!question) {
            // Get all text nodes within the element
            const textNodes = getAllTextNodes(element);
            
            for (const node of textNodes) {
                const text = node.textContent.trim();
                if (text.length > 10 && this.isLikelyQuestion(text)) {
                    question = text;
                    break;
                }
            }
            
            // If still no question found, use the first substantial text as the question
            if (!question) {
                for (const node of textNodes) {
                    const text = node.textContent.trim();
                    if (text.length > 20) {
                        question = text;
                        break;
                    }
                }
            }
        }
        
        // Try to find options within the element
        // First, look for elements that match common option selectors
        const optionSelectors = this.siteSpecificSelectors ? 
            [this.siteSpecificSelectors.OPTION, ...OPTION_SELECTORS] : 
            OPTION_SELECTORS;
            
        for (const selector of optionSelectors) {
            if (!selector) continue;
            
            try {
                const optionElements = element.querySelectorAll(selector);
                if (optionElements.length >= 2) {
                    options = Array.from(optionElements)
                        .map(el => el.textContent.trim())
                        .filter(Boolean);
                    break;
                }
            } catch (e) {
                // Skip invalid selector
            }
        }
        
        // If no options found with selectors, try to find list items or labeled inputs
        if (options.length < 2) {
            // Try list items
            const listItems = element.querySelectorAll('li');
            if (listItems.length >= 2) {
                options = Array.from(listItems)
                    .map(el => el.textContent.trim())
                    .filter(Boolean);
            }
            
            // Try radio buttons and checkboxes
            if (options.length < 2) {
                const inputs = element.querySelectorAll('input[type="radio"], input[type="checkbox"]');
                if (inputs.length >= 2) {
                    options = Array.from(inputs)
                        .map(input => {
                            const label = this.uiManager.findAssociatedLabel(input);
                            return label ? label.textContent.trim() : null;
                        })
                        .filter(Boolean);
                }
            }
            
            // Try divs or spans with similar classes or structure
            if (options.length < 2) {
                const potentialOptions = this.findPotentialOptions(element);
                if (potentialOptions.length >= 2) {
                    options = potentialOptions;
                }
            }
        }
        
        return { question, options };
    }
    
    /**
     * Finds potential answer options based on similar structure
     * @param {Element} element - Element to search within
     * @returns {Array<string>} Potential options
     */
    findPotentialOptions(element) {
        const options = [];
        const allElements = element.querySelectorAll('*');
        const elementsByClass = {};
        
        // Group elements by class
        for (const el of allElements) {
            if (el.className) {
                const classes = el.className.split(' ');
                for (const cls of classes) {
                    if (!elementsByClass[cls]) elementsByClass[cls] = [];
                    elementsByClass[cls].push(el);
                }
            }
        }
        
        // Find classes with multiple elements (potential options)
        for (const cls in elementsByClass) {
            const elements = elementsByClass[cls];
            if (elements.length >= 2 && elements.length <= 10) {  // Reasonable number for options
                // Check if these elements have similar structure
                const firstEl = elements[0];
                const firstElText = firstEl.textContent.trim();
                
                // Skip if text is too short
                if (firstElText.length < 2) continue;
                
                // Check if all elements have text
                const allHaveText = elements.every(el => el.textContent.trim().length > 0);
                if (allHaveText) {
                    // Extract text from these elements
                    const texts = elements.map(el => el.textContent.trim());
                    
                    // If we found potential options, use them
                    if (texts.length >= 2) {
                        return texts;
                    }
                }
            }
        }
        
        return options;
    }
    
    /**
     * Checks if text is likely a question
     * @param {string} text - Text to check
     * @returns {boolean} Whether the text is likely a question
     */
    isLikelyQuestion(text) {
        // Check if the text matches any question patterns
        for (const pattern of QUESTION_PATTERNS) {
            if (pattern.test(text)) {
                return true;
            }
        }
        
        // Check for numbered questions (e.g., "1. What is...")
        if (/^\d+[\.\)]\s+.{10,}/.test(text)) {
            return true;
        }
        
        // Check for common question phrases
        const lowerText = text.toLowerCase();
        const questionPhrases = [
            'choose the', 'select the', 'identify the', 
            'which of the following', 'which one', 
            'true or false', 'correct answer'
        ];
        
        for (const phrase of questionPhrases) {
            if (lowerText.includes(phrase)) {
                return true;
            }
        }
        
        // Medium and high sensitivity: check for question mark
        if (this.detectionSensitivity !== 'low' && text.includes('?')) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Detects question subject
     * @param {string} questionText - Question text
     * @returns {string|null} Detected subject or null
     */
    detectSubject(questionText) {
        if (!questionText) return null;
        
        const text = questionText.toLowerCase();
        
        for (const subject in SUBJECT_PATTERNS) {
            const patterns = SUBJECT_PATTERNS[subject];
            for (const pattern of patterns) {
                if (pattern.test(text)) {
                    this.detectedSubject = subject;
                    return subject;
                }
            }
        }
        
        this.detectedSubject = null;
        return null;
    }
    
    /**
     * Saves a question and answer to history
     * @param {string} question - Question text
     * @param {string} answer - Answer text
     */
    async saveToHistory(question, answer) {
        if (!question || !answer) return;
        
        // Create history entry
        const historyEntry = {
            question: question,
            answer: answer,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            subject: this.detectedSubject
        };
        
        // Add to local history
        this.detectionHistory.unshift(historyEntry);
        
        // Keep only the most recent 50 entries
        if (this.detectionHistory.length > 50) {
            this.detectionHistory = this.detectionHistory.slice(0, 50);
        }
        
        // Save to storage
        await saveStorageData({
            [STORAGE_KEYS.DETECTION_HISTORY]: this.detectionHistory
        });
    }
    
    /**
     * Detects questions on the page
     * @returns {boolean} Whether questions were found
     */
    detectQuestionsOnPage() {
        // Implementation details left as an exercise for brevity
        // This would detect questions using similar logic to extractContentFromElement
        // but scanning the entire page instead of a specific element
        return false;
    }
    
    /**
     * Detects options on the page
     * @returns {Array<string>} Detected options
     */
    detectOptionsOnPage() {
        const options = [];
        
        // First try site-specific selectors if available
        if (this.siteSpecificSelectors) {
            const optionElements = document.querySelectorAll(this.siteSpecificSelectors.OPTION);
            if (optionElements.length > 0) {
                return Array.from(optionElements)
                    .map(el => el.textContent.trim())
                    .filter(Boolean);
            }
        }
        
        // Try common selectors
        for (const selector of OPTION_SELECTORS) {
            const elements = document.querySelectorAll(selector);
            if (elements.length >= 2) {
                return Array.from(elements)
                    .map(el => el.textContent.trim())
                    .filter(Boolean);
            }
        }
        
        // Try to find options based on common patterns
        const optionPatterns = [
            /^[A-D][\.\)]\s+.+/,  // A. Option text
            /^[1-4][\.\)]\s+.+/,  // 1. Option text
            /^[a-d][\.\)]\s+.+/   // a. Option text
        ];
        
        const allElements = document.querySelectorAll('*');
        
        for (const element of allElements) {
            const text = element.textContent.trim();
            for (const pattern of optionPatterns) {
                if (pattern.test(text)) {
                    options.push(text);
                    break;
                }
            }
        }
        
        return options;
    }
    
    /**
     * Gets an answer from Gemini
     * @param {string} question - Question text
     * @param {Array<string>} options - Answer options
     * @returns {Promise<string>} The answer
     */
    async getAnswerFromGemini(question, options) {
        try {
            console.log('QuizService: Getting answer from Gemini for question:', question);
            
            // Check if this is a code evaluation question
            const isCodeQuestion = isCodeEvaluationQuestion(question);
            console.log('QuizService: Is code question:', isCodeQuestion);
            
            // If it's a code question, try to evaluate it directly first
            if (isCodeQuestion) {
                console.log('QuizService: Attempting direct code evaluation');
                const codeAnswer = evaluateCode(question, options);
                
                if (codeAnswer) {
                    console.log('QuizService: Code evaluation successful, answer:', codeAnswer);
                    return codeAnswer;
                }
                
                console.log('QuizService: Direct code evaluation failed, falling back to Gemini');
            }
            
            // If not a code question or code evaluation failed, use Gemini API
            const geminiResponse = await fetchGeminiResponse(
                question, 
                options, 
                this.apiKey, 
                this.detectedSubject
            );
            
            const answer = extractAnswer(geminiResponse, options);
            
            if (!answer) {
                throw new Error('Could not determine the answer from Gemini response');
            }
            
            return answer;
        } catch (error) {
            console.error('Error getting answer from Gemini:', error);
            throw error;
        }
    }
    
    /**
     * Adds to detection history
     * @param {string} question - Question text
     * @param {string} answer - Answer text
     * @param {Array<string>} options - Answer options
     */
    addToDetectionHistory(question, answer, options) {
        // Create history entry
        const historyEntry = {
            question: question,
            answer: answer,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            subject: this.detectedSubject
        };
        
        // Add to local history
        this.detectionHistory.unshift(historyEntry);
        
        // Keep only the most recent 50 entries
        if (this.detectionHistory.length > 50) {
            this.detectionHistory = this.detectionHistory.slice(0, 50);
        }
        
        // Save to storage
        saveStorageData({
            [STORAGE_KEYS.DETECTION_HISTORY]: this.detectionHistory
        });
    }
    
    /**
     * Flashes an element temporarily to highlight it
     * @param {Element} element - Element to flash
     */
    flashElement(element) {
        if (!element) return;
        
        // Save original styles
        const originalOutline = element.style.outline;
        const originalBackground = element.style.backgroundColor;
        const originalTransition = element.style.transition;
        
        // Add highlight effect
        element.style.transition = 'all 0.5s ease';
        element.style.outline = '3px solid #8e24aa';
        element.style.backgroundColor = 'rgba(142, 36, 170, 0.1)';
        
        // Remove highlight after a delay
        setTimeout(() => {
            element.style.outline = originalOutline;
            element.style.backgroundColor = originalBackground;
            element.style.transition = originalTransition;
        }, 2000);
    }
}
