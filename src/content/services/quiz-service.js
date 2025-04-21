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
            // Use the storage utility to get data
            const data = await getStorageData([
                STORAGE_KEYS.API_KEY,
                STORAGE_KEYS.AUTO_DETECT,
                STORAGE_KEYS.DETECTION_SENSITIVITY,
                STORAGE_KEYS.DETECTION_HISTORY,
                STORAGE_KEYS.SAVED_ELEMENTS
            ]);
            
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
        // Set UI manager button click handler
        this.uiManager.setButtonClickHandler(() => {
            return this.handleSolveClick();
        });
        
        // Also listen for the custom event as a fallback
        document.addEventListener('quiz-solver-button-clicked', () => {
            this.handleSolveClick();
        });
        
        // Listen for element selection events
        document.addEventListener('quiz-element-selected', (e) => {
            this.handleElementSelected(e.detail.element);
        });
        
        // Listen for cancel selection events
        document.addEventListener('quiz-solver-cancel-selection', () => {
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
            // Check if we're already in selection mode
            if (this.selectionMode) {
                return;
            }
            
            // Check if API key exists
            if (!this.apiKey) {
                await this.loadSettings();
                
                if (!this.apiKey) {
                    this.uiManager.showError('Please set your Gemini API key in the extension popup');
                    return;
                }
            }
            
            // Check if we have a saved element for this domain
            let savedElement = null;
            try {
                savedElement = await this.uiManager.getSavedElement();
            } catch (error) {
                // Continue without a saved element
            }
            
            if (savedElement) {
                // Use the saved element
                this.uiManager.showToast(`Using saved element for ${window.location.hostname}`, 'info');
                
                // Highlight the saved element temporarily to show which one is being used
                this.flashElement(savedElement);
                
                // Process the saved element
                await this.handleElementSelected(savedElement);
                return;
            }
            
            // Enter selection mode
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
            if (!element) {
                this.uiManager.showError('No element was selected');
                return;
            }
            
            // Exit selection mode if we're still in it
            if (this.selectionMode) {
                this.selectionMode = false;
                this.uiManager.disableSelectionMode(); // Make sure UI is updated
            }
            
            this.uiManager.showToast('Processing selected element...', 'info');
            this.uiManager.showLoader();
            
            if (!this.apiKey) {
                await this.loadSettings();
                
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
            
            // Save this element for future use
            try {
                const saved = await this.uiManager.saveElementXPath(element);
            } catch (error) {
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
     * Handles text selected by the user
     * @param {string} text - Selected text
     */
    async handleSelectedQuestion(text) {
        try {
            if (!text || text.trim().length < 5) {
                this.uiManager.showError('Selected text is too short to be a question');
                return;
            }
            
            this.uiManager.showLoader();
            
            if (!this.apiKey) {
                await this.loadSettings();
                
                if (!this.apiKey) {
                    this.uiManager.hideLoader();
                    this.uiManager.showError('Please set your API key in the extension popup');
                    return;
                }
            }
            
            // Try to identify the question and options in the selected text
            const { question, options } = this.extractContentFromText(text);
            
            if (!question) {
                this.uiManager.hideLoader();
                this.uiManager.showError('Could not identify a question in the selected text');
                return;
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
            
            // Add to detection history
            this.addToDetectionHistory(question, answer, options);
        } catch (error) {
            this.uiManager.hideLoader();
            this.handleError('handleSelectedQuestion', error, 'Failed to process selected text');
        }
    }
    
    /**
     * Extracts question and options from selected text
     * @param {string} text - Selected text
     * @returns {Object} Extracted question and options
     */
    extractContentFromText(text) {
        try {
            // Split the text into lines
            const lines = text.split('\n').filter(line => line.trim().length > 0);
            
            if (lines.length === 0) {
                return { question: null, options: [] };
            }
            
            // Assume the first line or paragraph is the question
            let question = lines[0];
            let options = [];
            
            // Check if the question is a real question
            const isQuestionLine = line => 
                QUESTION_PATTERNS.some(pattern => pattern.test(line)) ||
                line.endsWith('?');
            
            // If first line doesn't look like a question, try to find one
            if (!isQuestionLine(question) && lines.length > 1) {
                const questionLineIndex = lines.findIndex(isQuestionLine);
                if (questionLineIndex >= 0) {
                    question = lines[questionLineIndex];
                }
            }
            
            // Try to identify options - look for lines that start with A., B., C., etc.
            const optionRegex = /^([A-Z])[.)]\s*(.+)$/;
            for (let i = 1; i < lines.length; i++) {
                const match = lines[i].match(optionRegex);
                if (match) {
                    options.push(match[2].trim());
                }
            }
            
            // If we didn't find any options, try to find them differently
            if (options.length === 0 && lines.length > 1) {
                // Take all lines after the question as potential options
                options = lines.slice(1).map(line => line.trim());
            }
            
            // Detect subject based on the question
            this.detectSubject(question);
            
            return { question, options };
        } catch (error) {
            console.error('Error extracting content from text:', error);
            return { question: null, options: [] };
        }
    }
    
    /**
     * Extracts question and options from an element
     * @param {Element} element - Element to extract from
     * @returns {Object} Extracted question and options
     */
    extractContentFromElement(element) {
        try {
            // Try to find the question within the element
            let questionElement = null;
            let question = '';
            
            // First, try site-specific selectors
            if (this.siteSpecificSelectors && this.siteSpecificSelectors.QUESTION) {
                const specificQuestionElement = element.querySelector(this.siteSpecificSelectors.QUESTION);
                if (specificQuestionElement) {
                    questionElement = specificQuestionElement;
                    question = specificQuestionElement.textContent.trim();
                }
            }
            
            // If no question found, try general selectors
            if (!question) {
                for (const selector of QUESTION_SELECTORS) {
                    const elements = element.querySelectorAll(selector);
                    if (elements.length > 0) {
                        questionElement = elements[0];
                        question = elements[0].textContent.trim();
                        break;
                    }
                }
            }
            
            // If still no question, try to use the element itself
            if (!question && element.textContent) {
                // Try to find lines that look like questions
                const lines = element.textContent.split('\n').filter(line => line.trim().length > 0);
                for (const line of lines) {
                    if (QUESTION_PATTERNS.some(pattern => pattern.test(line)) || line.endsWith('?')) {
                        question = line.trim();
                        break;
                    }
                }
                
                // If still no question, use the first line or the whole text
                if (!question) {
                    if (lines.length > 0) {
                        question = lines[0].trim();
                    } else {
                        question = element.textContent.trim();
                    }
                }
            }
            
            // Try to find the options
            let options = [];
            
            // First, try site-specific selectors
            if (this.siteSpecificSelectors && this.siteSpecificSelectors.OPTION) {
                const specificOptionElements = element.querySelectorAll(this.siteSpecificSelectors.OPTION);
                if (specificOptionElements.length > 0) {
                    options = Array.from(specificOptionElements).map(el => el.textContent.trim());
                }
            }
            
            // If no options found, try general selectors
            if (options.length === 0) {
                for (const selector of OPTION_SELECTORS) {
                    const elements = element.querySelectorAll(selector);
                    if (elements.length > 0) {
                        options = Array.from(elements).map(el => el.textContent.trim());
                        break;
                    }
                }
            }
            
            // If still no options, try to extract from text
            if (options.length === 0 && element.textContent) {
                // Try to find lines that look like options (A. Option 1, B. Option 2, etc.)
                const lines = element.textContent.split('\n').filter(line => line.trim().length > 0);
                const optionRegex = /^([A-Z])[.)]\s*(.+)$/;
                
                for (const line of lines) {
                    const match = line.trim().match(optionRegex);
                    if (match) {
                        options.push(match[2].trim());
                    }
                }
            }
            
            // Detect subject based on the question
            this.detectSubject(question);
            
            return { question, options };
        } catch (error) {
            console.error('Error extracting content from element:', error);
            return { question: null, options: [] };
        }
    }
    
    /**
     * Gets an answer from Gemini
     * @param {string} question - Question text
     * @param {Array<string>} options - Answer options
     * @returns {Promise<string>} The answer
     */
    async getAnswerFromGemini(question, options) {
        try {
            // Check if this is a code evaluation question
            const isCodeQuestion = isCodeEvaluationQuestion(question);
            
            // If it's a code question, try to evaluate it directly first
            if (isCodeQuestion) {
                const codeAnswer = evaluateCode(question, options);
                
                if (codeAnswer) {
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
    
    /**
     * Detects the subject of a question
     * @param {string} question - Question text
     * @returns {string|null} Detected subject or null
     */
    detectSubject(question) {
        if (!question) return null;
        
        const text = question.toLowerCase();
        
        for (const [subject, patterns] of Object.entries(SUBJECT_PATTERNS)) {
            for (const pattern of patterns) {
                if (pattern.test(text)) {
                    this.detectedSubject = subject;
                    return subject;
                }
            }
        }
        
        this.detectedSubject = 'general';
        return 'general';
    }
    
    /**
     * Detects questions on the page automatically
     */
    async detectQuestionsOnPage() {
        try {
            if (!this.autoDetectEnabled) return;
            
            // Check if we have an API key
            if (!this.apiKey) {
                await this.loadSettings();
                if (!this.apiKey) return; // No API key, can't continue
            }
            
            // Get all text nodes
            const textNodes = getAllTextNodes(document.body);
            
            // Find potential questions
            const potentialQuestions = [];
            
            for (const node of textNodes) {
                const text = node.textContent.trim();
                if (text.length > 10 && (text.endsWith('?') || QUESTION_PATTERNS.some(p => p.test(text)))) {
                    potentialQuestions.push({
                        node,
                        text,
                        element: node.parentElement
                    });
                }
            }
            
            // If no potential questions found, try querying common selectors
            if (potentialQuestions.length === 0) {
                for (const selector of QUESTION_SELECTORS) {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                        const text = element.textContent.trim();
                        if (text.length > 10) {
                            potentialQuestions.push({
                                node: element.childNodes[0],
                                text,
                                element
                            });
                        }
                    }
                }
            }
            
            // Sort by likelihood of being a question
            potentialQuestions.sort((a, b) => {
                // Give higher score to elements that:
                // 1. End with a question mark
                // 2. Contain certain keywords
                // 3. Are closer to the top of the page
                
                const aScore = (a.text.endsWith('?') ? 10 : 0) + 
                               (QUESTION_PATTERNS.some(p => p.test(a.text)) ? 5 : 0) -
                               (a.element.getBoundingClientRect().top / 1000);
                               
                const bScore = (b.text.endsWith('?') ? 10 : 0) + 
                               (QUESTION_PATTERNS.some(p => p.test(b.text)) ? 5 : 0) -
                               (b.element.getBoundingClientRect().top / 1000);
                               
                return bScore - aScore;
            });
            
            // Process the most likely question
            if (potentialQuestions.length > 0) {
                const bestCandidate = potentialQuestions[0];
                
                // Prevent repeated detection of the same question
                if (this.lastDetectedQuestion === bestCandidate.text) {
                    return;
                }
                
                this.lastDetectedQuestion = bestCandidate.text;
                
                // Extract content from the parent element
                const { question, options } = this.extractContentFromElement(bestCandidate.element);
                
                if (question && this.detectionSensitivity !== 'low') {
                    this.uiManager.showToast('Question detected: ' + question.substring(0, 30) + '...', 'info');
                    
                    // Save the options
                    this.lastDetectedOptions = options;
                    
                    // If sensitivity is high, automatically solve
                    if (this.detectionSensitivity === 'high') {
                        setTimeout(() => this.handleElementSelected(bestCandidate.element), 1000);
                    }
                }
            }
        } catch (error) {
            console.error('Error detecting questions:', error);
        }
    }
    
    /**
     * Handles errors
     * @param {string} context - Error context
     * @param {Error} error - Error object
     * @param {string} userMessage - Message to show to the user
     */
    handleError(context, error, userMessage) {
        console.error(`Error in ${context}:`, error);
        this.uiManager.showError(userMessage || 'An error occurred');
    }
}
