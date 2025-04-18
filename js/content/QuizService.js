import { CLASSES, STORAGE_KEYS, API_ENDPOINT, MESSAGE_TYPES, QUESTION_PATTERNS, 
         SITE_SPECIFIC_SELECTORS, SUBJECT_PATTERNS, TIME_CONSTANTS } from '../constants.js';
import { UIManager } from './UIManager.js';

export class QuizService {
    constructor() {
        this.uiManager = new UIManager();
        this.apiKey = null;
        this.autoDetectEnabled = true;
        this.detectionSensitivity = 'medium';
        this.lastDetectedQuestion = null;
        this.lastDetectedOptions = [];
        this.siteSpecificSelectors = null;
        this.debounceTimer = null;
        this.detectionHistory = [];
        this.detectedSubject = null;
    }

    async initialize() {
        await this.loadSettings();
        this.setupListeners();
        this.detectSiteSpecificSelectors();
        
        // Auto-detect questions on page load if enabled
        if (this.autoDetectEnabled) {
            setTimeout(() => this.detectQuestionsOnPage(), 1500);
        }
    }

    async loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get([
                STORAGE_KEYS.API_KEY, 
                STORAGE_KEYS.AUTO_DETECT,
                STORAGE_KEYS.DETECTION_SENSITIVITY,
                STORAGE_KEYS.DETECTION_HISTORY
            ], (result) => {
                this.apiKey = result[STORAGE_KEYS.API_KEY];
                this.autoDetectEnabled = result[STORAGE_KEYS.AUTO_DETECT] !== undefined 
                    ? result[STORAGE_KEYS.AUTO_DETECT] 
                    : true;
                this.detectionSensitivity = result[STORAGE_KEYS.DETECTION_SENSITIVITY] || 'medium';
                this.detectionHistory = result[STORAGE_KEYS.DETECTION_HISTORY] || [];
                resolve();
            });
        });
    }
    
    detectSiteSpecificSelectors() {
        const hostname = window.location.hostname;
        for (const site in SITE_SPECIFIC_SELECTORS) {
            if (hostname.includes(site)) {
                this.siteSpecificSelectors = SITE_SPECIFIC_SELECTORS[site];
                break;
            }
        }
    }

    setupListeners() {
        // Button click listener
        document.addEventListener('click', (e) => {
            if (e.target.closest('#solveQuizBtn')) this.handleSolveClick();
        });

        // Listen for messages from popup or background
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === "solveSelected") {
                this.handleSelectedQuestion(request.text);
                sendResponse({status: 'processing'});
                return true;
            }
            
            if (request.action === "solveCurrentQuiz") {
                this.handleSolveClick();
                sendResponse({status: 'processing'});
                return true;
            }
            
            if (request.action === "showError") {
                this.uiManager.showError(request.message);
                sendResponse({status: 'error shown'});
                return true;
            }
            
            if (request.type === MESSAGE_TYPES.STORAGE_UPDATE) {
                if (request.payload.key === STORAGE_KEYS.API_KEY) {
                    this.apiKey = request.payload.value;
                } else if (request.payload.key === STORAGE_KEYS.AUTO_DETECT) {
                    this.autoDetectEnabled = request.payload.value;
                    if (this.autoDetectEnabled) {
                        this.detectQuestionsOnPage();
                    }
                } else if (request.payload.key === STORAGE_KEYS.DETECTION_SENSITIVITY) {
                    this.detectionSensitivity = request.payload.value;
                }
                sendResponse({status: 'updated'});
                return true;
            }
            
            if (request.type === MESSAGE_TYPES.AUTO_DETECT) {
                this.detectQuestionsOnPage();
                sendResponse({status: 'detection started'});
                return true;
            }
            
            if (request.type === MESSAGE_TYPES.TOGGLE_AUTO_DETECT) {
                this.autoDetectEnabled = !this.autoDetectEnabled;
                chrome.storage.sync.set({ [STORAGE_KEYS.AUTO_DETECT]: this.autoDetectEnabled });
                if (this.autoDetectEnabled) {
                    this.detectQuestionsOnPage();
                }
                sendResponse({status: 'auto-detect ' + (this.autoDetectEnabled ? 'enabled' : 'disabled')});
                return true;
            }
            
            if (request.type === MESSAGE_TYPES.ADJUST_SENSITIVITY) {
                this.detectionSensitivity = request.payload.sensitivity;
                chrome.storage.sync.set({ [STORAGE_KEYS.DETECTION_SENSITIVITY]: this.detectionSensitivity });
                sendResponse({status: 'sensitivity adjusted'});
                return true;
            }
        });
        
        // Setup mutation observer if auto-detect is enabled
        if (this.autoDetectEnabled) {
            this.setupMutationObserver();
        }
    }
    
    setupMutationObserver() {
        const observer = new MutationObserver(() => {
            if (this.debounceTimer) clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                if (this.autoDetectEnabled) {
                    this.detectQuestionsOnPage();
                }
            }, TIME_CONSTANTS.DEBOUNCE_DELAY);
        });
        
        observer.observe(document.body, { 
            childList: true, 
            subtree: true,
            attributes: false,
            characterData: false
        });
    }

    async handleSolveClick() {
        try {
            this.uiManager.showLoader();
            
            if (!this.apiKey) {
                await this.loadSettings();
                if (!this.apiKey) {
                    this.uiManager.showError('Please set your API key in the extension popup');
                    return;
                }
            }
            
            // Try to detect questions if none are cached
            if (!this.lastDetectedQuestion || this.lastDetectedOptions.length === 0) {
                const detected = this.detectQuestionsOnPage();
                if (!detected) {
                    this.uiManager.showError('No quiz question detected on this page');
                    return;
                }
            }
            
            // Detect academic subject for better context
            this.detectSubject(this.lastDetectedQuestion);
            
            const answer = await this.fetchGeminiAnswer(this.lastDetectedQuestion, this.lastDetectedOptions);
            this.uiManager.highlightAnswer(answer, this.lastDetectedOptions);
            
            // Save to detection history
            this.saveToHistory(this.lastDetectedQuestion, answer);
        } catch (error) {
            this.uiManager.showError(error.message || 'Failed to solve quiz');
        } finally {
            this.uiManager.hideLoader();
        }
    }

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
            
            // Save the detected question and options
            this.lastDetectedQuestion = text;
            this.lastDetectedOptions = options;
            
            // Detect academic subject for better context
            this.detectSubject(text);
            
            const answer = await this.fetchGeminiAnswer(text, options);
            this.uiManager.highlightAnswer(answer, options);
            
            // Save to detection history
            this.saveToHistory(text, answer);
        } catch (error) {
            this.uiManager.showError(error.message || 'Failed to solve selected question');
        } finally {
            this.uiManager.hideLoader();
        }
    }

    detectQuestionsOnPage() {
        // First try site-specific selectors if available
        if (this.siteSpecificSelectors) {
            const questionElement = document.querySelector(this.siteSpecificSelectors.QUESTION);
            const optionElements = document.querySelectorAll(this.siteSpecificSelectors.OPTION);
            
            if (questionElement && optionElements.length > 0) {
                const question = questionElement.textContent.trim();
                const options = Array.from(optionElements)
                    .map(el => el.textContent.trim())
                    .filter(Boolean);
                    
                if (question && options.length > 0) {
                    this.lastDetectedQuestion = question;
                    this.lastDetectedOptions = options;
                    return true;
                }
            }
        }
        
        // Try common selectors
        for (const selector of CLASSES.QUESTION_SELECTORS) {
            const elements = document.querySelectorAll(selector);
            
            for (const element of elements) {
                const text = element.textContent.trim();
                
                // Skip if too short or too long
                if (text.length < 10 || text.length > 500) continue;
                
                // Check if it matches question patterns
                if (this.isLikelyQuestion(text)) {
                    // Try to find options near this question
                    const options = this.findOptionsForQuestion(element);
                    
                    if (options.length >= 2) {
                        this.lastDetectedQuestion = text;
                        this.lastDetectedOptions = options;
                        return true;
                    }
                }
            }
        }
        
        // If no questions found with selectors, try a more aggressive approach
        if (this.detectionSensitivity === 'high') {
            return this.aggressiveQuestionDetection();
        }
        
        return false;
    }
    
    aggressiveQuestionDetection() {
        // Get all paragraphs and headings
        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, span');
        
        for (const element of textElements) {
            const text = element.textContent.trim();
            
            // Skip if too short or too long
            if (text.length < 10 || text.length > 500) continue;
            
            // Check if it matches question patterns
            if (this.isLikelyQuestion(text)) {
                // Look for options nearby
                const options = this.findOptionsForQuestion(element);
                
                if (options.length >= 2) {
                    this.lastDetectedQuestion = text;
                    this.lastDetectedOptions = options;
                    return true;
                }
            }
        }
        
        return false;
    }
    
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
    
    saveToHistory(question, answer) {
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
        chrome.storage.sync.set({
            [STORAGE_KEYS.DETECTION_HISTORY]: this.detectionHistory
        });
    }
    
    findOptionsForQuestion(questionElement) {
        // First try common option selectors
        for (const selector of CLASSES.OPTION_SELECTORS) {
            // Look for options in the parent container
            const parent = this.findParentContainer(questionElement);
            if (!parent) continue;
            
            const optionElements = parent.querySelectorAll(selector);
            if (optionElements.length >= 2) {
                return Array.from(optionElements)
                    .map(el => el.textContent.trim())
                    .filter(Boolean);
            }
        }
        
        // Try to find options based on common patterns
        return this.findOptionsBasedOnPatterns(questionElement);
    }
    
    findParentContainer(element) {
        // Try to find the parent container that might contain both question and options
        let parent = element.parentElement;
        let depth = 0;
        const maxDepth = 5; // Don't go too far up the tree
        
        while (parent && depth < maxDepth) {
            // Check if this parent contains potential options
            const children = parent.children;
            let potentialOptions = 0;
            
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                // Skip the question element itself
                if (child === element) continue;
                
                // Check if this might be an option element
                if (this.mightBeOptionElement(child)) {
                    potentialOptions++;
                }
                
                // If we found at least 2 potential options, this could be our container
                if (potentialOptions >= 2) {
                    return parent;
                }
            }
            
            // Move up to the next parent
            parent = parent.parentElement;
            depth++;
        }
        
        // If we didn't find a good container, return the body as a fallback
        return document.body;
    }
    
    mightBeOptionElement(element) {
        // Check for radio buttons or checkboxes
        if (element.querySelector('input[type="radio"], input[type="checkbox"]')) {
            return true;
        }
        
        // Check for list items in a list
        if (element.tagName === 'LI' && element.parentElement.tagName.match(/^[OU]L$/)) {
            return true;
        }
        
        // Check for common option classes or attributes
        const optionClassPatterns = ['option', 'answer', 'choice', 'selection', 'alternative'];
        for (const pattern of optionClassPatterns) {
            if (element.className.toLowerCase().includes(pattern)) {
                return true;
            }
        }
        
        // Check for ARIA roles
        if (element.getAttribute('role') === 'radio' || element.getAttribute('role') === 'checkbox') {
            return true;
        }
        
        return false;
    }
    
    findOptionsBasedOnPatterns(questionElement) {
        const parent = this.findParentContainer(questionElement);
        
        // Try to find options in lists (ul, ol)
        const lists = parent.querySelectorAll('ul, ol');
        for (const list of lists) {
            const items = list.querySelectorAll('li');
            if (items.length >= 2) {
                return Array.from(items)
                    .map(item => item.textContent.trim())
                    .filter(Boolean);
            }
        }
        
        // Look for options with labels like A), B), 1), 2), etc.
        const optionPatterns = [
            /^[A-D][\.\)]\s+.+/,  // A. Option text
            /^[1-4][\.\)]\s+.+/,  // 1. Option text
            /^[a-d][\.\)]\s+.+/   // a. Option text
        ];
        
        const options = [];
        const allElements = parent.querySelectorAll('*');
        
        for (const element of allElements) {
            const text = element.textContent.trim();
            for (const pattern of optionPatterns) {
                if (pattern.test(text)) {
                    options.push(text);
                    break;
                }
            }
        }
        
        // If we found at least 2 options with patterns, return them
        if (options.length >= 2) {
            return options;
        }
        
        // Last resort: look for short text elements near the question
        const textElements = parent.querySelectorAll('p, div, span, label');
        const potentialOptions = [];
        
        for (const element of textElements) {
            // Skip the question element itself
            if (element === questionElement) continue;
            
            const text = element.textContent.trim();
            
            // Options are usually shorter than questions
            if (text.length > 0 && text.length < 100) {
                potentialOptions.push(text);
            }
        }
        
        // If we found at least 2 potential options, return them
        if (potentialOptions.length >= 2) {
            return potentialOptions;
        }
        
        return [];
    }
    
    detectOptionsOnPage() {
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
        for (const selector of CLASSES.OPTION_SELECTORS) {
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
        
        const options = [];
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
        
        // If we found at least 2 options with patterns, return them
        if (options.length >= 2) {
            return options;
        }
        
        return [];
    }

    async fetchGeminiAnswer(question, options) {
        if (!question) throw new Error('Question text is required');
        if (!options || options.length === 0) throw new Error('Answer options are required');
        
        const prompt = this.generatePrompt(question, options);
        
        try {
            const response = await fetch(`${API_ENDPOINT}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    contents: [{
                        parts: [{text: prompt}]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
                throw new Error('Invalid response from Gemini API');
            }
            
            const answerText = data.candidates[0].content.parts[0].text.trim();
            
            // Verify the answer is one of the options
            const matchedOption = options.find(option => 
                answerText.toLowerCase().includes(option.toLowerCase())
            );
            
            if (!matchedOption) {
                return this.findBestMatchingOption(answerText, options);
            }
            
            return matchedOption;
        } catch (error) {
            throw new Error(`API Error: ${error.message}`);
        }
    }
    
    findBestMatchingOption(answerText, options) {
        let bestMatch = options[0];
        let highestScore = 0;
        
        for (const option of options) {
            const score = this.calculateSimilarity(answerText, option);
            if (score > highestScore) {
                highestScore = score;
                bestMatch = option;
            }
        }
        
        return bestMatch;
    }
    
    calculateSimilarity(str1, str2) {
        const words1 = str1.toLowerCase().split(/\W+/).filter(Boolean);
        const words2 = str2.toLowerCase().split(/\W+/).filter(Boolean);
        
        let matchCount = 0;
        for (const word of words1) {
            if (words2.includes(word)) matchCount++;
        }
        
        return matchCount / Math.max(words1.length, words2.length);
    }

    generatePrompt(question, options) {
        // Base prompt
        let prompt = `Analyze this question and select the correct answer:\n\nQuestion: ${question}\nOptions: ${options.join(' | ')}\n\n`;
        
        // Add subject-specific context if detected
        if (this.detectedSubject) {
            prompt += `Subject Area: ${this.detectedSubject}\n\n`;
            
            // Add specific instructions for different subjects
            switch(this.detectedSubject) {
                case 'MATH':
                    prompt += "For this math question, perform any necessary calculations and identify the exact answer.\n\n";
                    break;
                case 'SCIENCE':
                    prompt += "Apply scientific principles and factual knowledge to determine the correct answer.\n\n";
                    break;
                case 'HISTORY':
                    prompt += "Consider historical accuracy, timeline, and contextual facts to identify the correct answer.\n\n";
                    break;
                case 'LITERATURE':
                    prompt += "Analyze literary elements, author intentions, and textual evidence to select the correct answer.\n\n";
                    break;
                case 'COMPUTER_SCIENCE':
                    prompt += "Apply computer science concepts, algorithms, and programming principles to identify the correct solution.\n\n";
                    break;
            }
        }
        
        // Final instructions
        prompt += `Instructions:
1. Analyze the question carefully
2. Consider each option thoroughly
3. Respond ONLY with the correct answer text exactly as it appears in the options
4. Do not include any explanations or additional text`;
        
        return prompt;
    }
}