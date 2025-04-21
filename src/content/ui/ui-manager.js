/**
 * UI manager for the quiz solver
 * @author Dev Kraken <soman@devkraken.com>
 */

import { SolverButton } from './components/solver-button.js';
import { Toast } from './components/toast.js';
import { ResultsPanel } from './components/results-panel.js';
import { Loader } from './components/loader.js';
import { SelectionOverlay } from './components/selection-overlay.js';

/**
 * Manages the UI components for the quiz solver
 */
export class UIManager {
    constructor() {
        this.solverButton = new SolverButton();
        this.toast = new Toast();
        this.resultsPanel = null;
        this.loader = new Loader();
        this.selectionOverlay = new SelectionOverlay();
        this.isSelectionMode = false;
        this.selectedElement = null;
    }
    
    /**
     * Initializes the UI components
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // Create the solver button
            this.solverButton.create();
            
            // Create results panel on-demand
            this.resultsPanel = new ResultsPanel();
            
            return Promise.resolve();
        } catch (error) {
            console.error('Error initializing UI:', error);
            return Promise.reject(error);
        }
    }
    
    /**
     * Shows a toast notification
     * @param {string} message - Message to display
     * @param {'success'|'error'|'info'} type - Type of toast
     */
    showToast(message, type = 'info') {
        try {
            this.toast.show(message, type);
        } catch (error) {
            console.error('Error showing toast:', error);
            
            // Try direct logging as fallback
            try {
                console.log(`[Quiz Solver] ${type}: ${message}`);
            } catch (e) {
                // Silent fail
            }
        }
    }
    
    /**
     * Shows an error toast
     * @param {string} message - Error message to display
     */
    showError(message) {
        this.showToast(message, 'error');
    }
    
    /**
     * Shows the loader
     */
    showLoader() {
        this.loader.show();
    }
    
    /**
     * Hides the loader
     */
    hideLoader() {
        this.loader.hide();
    }
    
    /**
     * Sets the button click handler
     * @param {Function} handler - Click handler function
     */
    setButtonClickHandler(handler) {
        if (typeof handler === 'function') {
            this.solverButton.setClickHandler(handler);
        }
    }
    
    /**
     * Shows the results panel
     * @param {string} question - Question text
     * @param {string} answer - Answer text
     */
    showResults(question, answer) {
        this.resultsPanel.show(question, answer);
    }
    
    /**
     * Enables selection mode for choosing quiz elements
     */
    enableSelectionMode() {
        this.isSelectionMode = true;
        this.solverButton.setSelectionMode();
        this.showToast('Click on the element containing the question and answers', 'info');
        
        // Set up selection overlay
        this.selectionOverlay.show(
            this.handleDocumentClick.bind(this),
            this.handleElementMouseOver.bind(this),
            this.handleElementMouseOut.bind(this)
        );
    }
    
    /**
     * Disables selection mode
     */
    disableSelectionMode() {
        this.isSelectionMode = false;
        this.solverButton.resetNormalMode();
        this.selectionOverlay.hide();
    }
    
    /**
     * Handles click during selection mode
     * @param {MouseEvent} event - Click event
     */
    handleDocumentClick(event) {
        // Check if we're still in selection mode
        if (!this.isSelectionMode) {
            return;
        }
        
        // Prevent default behavior
        event.preventDefault();
        event.stopPropagation();
        
        // Ignore clicks on extension elements
        if (this.isExtensionElement(event.target)) {
            return;
        }
        
        // Get the clicked element
        this.selectedElement = event.target;
        
        // Disable selection mode - this will hide the overlay
        this.disableSelectionMode();
        
        // Highlight the selected element temporarily
        this.flashElement(this.selectedElement);
        
        // Notify that an element has been selected
        document.dispatchEvent(new CustomEvent('quiz-element-selected', {
            detail: { element: this.selectedElement }
        }));
        
        return false;
    }
    
    /**
     * Handles mouseover during selection mode
     * @param {MouseEvent} event - Mouseover event
     */
    handleElementMouseOver(event) {
        if (!this.isSelectionMode) return;
        
        // Ignore extension elements
        if (this.isExtensionElement(event.target)) {
            return;
        }
        
        // We don't need to add inline styles here anymore
        // The SelectionOverlay component handles the highlighting
    }
    
    /**
     * Handles mouseout during selection mode
     * @param {MouseEvent} event - Mouseout event
     */
    handleElementMouseOut(event) {
        if (!this.isSelectionMode) return;
        
        // We don't need to remove inline styles here anymore
        // The SelectionOverlay component handles the highlighting
    }
    
    /**
     * Checks if an element is part of the extension UI
     * @param {Element} element - Element to check
     * @returns {boolean} Whether it's an extension element
     */
    isExtensionElement(element) {
        return element.id === 'solveQuizBtn' || 
               element.closest('#solveQuizBtn') ||
               element.closest('#quiz-solver-selection-overlay') ||
               element.closest('#quiz-solver-highlight') ||
               element.id === 'quiz-solver-highlight' ||
               element.closest('#quizSolverLoader') ||
               element.closest('.quiz-solver-toast') ||
               element.closest('.quiz-solver-panel');
    }
    
    /**
     * Highlights an element temporarily
     * @param {Element} element - Element to flash
     */
    flashElement(element) {
        const originalBackground = element.style.backgroundColor;
        element.style.backgroundColor = 'rgba(142, 36, 170, 0.2)';
        
        setTimeout(() => {
            element.style.backgroundColor = originalBackground;
        }, 500);
    }
    
    /**
     * Gets the currently selected element
     * @returns {Element|null} Selected element
     */
    getSelectedElement() {
        return this.selectedElement;
    }
    
    /**
     * Gets a previously saved element for this domain
     * @returns {Promise<Element|null>} Saved element or null
     */
    async getSavedElement() {
        try {
            // Get the storage key for saved elements
            const SAVED_ELEMENTS = 'savedElements';
            
            // Use a more reliable way to access storage
            return new Promise((resolve) => {
                try {
                    // Try to use storage access via custom event
                    const requestEvent = new CustomEvent('quiz-solver-storage-request', {
                        detail: {
                            action: 'get',
                            keys: [SAVED_ELEMENTS]
                        }
                    });
                    
                    // Set up a one-time listener for the response
                    window.addEventListener('quiz-solver-storage-response', function handler(event) {
                        window.removeEventListener('quiz-solver-storage-response', handler);
                        
                        try {
                            const data = event.detail.result || {};
                            const savedElements = data[SAVED_ELEMENTS] || {};
                            const hostname = window.location.hostname;
                            
                            // Check if we have an XPath for this domain
                            if (savedElements[hostname]) {
                                const xpath = savedElements[hostname];
                                
                                // Try to find the element using the saved XPath
                                try {
                                    const element = document.evaluate(
                                        xpath, 
                                        document, 
                                        null, 
                                        XPathResult.FIRST_ORDERED_NODE_TYPE, 
                                        null
                                    ).singleNodeValue;
                                    
                                    if (element) {
                                        resolve(element);
                                        return;
                                    }
                                } catch (error) {
                                    console.error('Error evaluating XPath:', error);
                                }
                            }
                            
                            resolve(null);
                        } catch (error) {
                            console.error('Error processing storage response:', error);
                            resolve(null);
                        }
                    }, { once: true });
                    
                    // Dispatch the request
                    window.dispatchEvent(requestEvent);
                    
                    // Set a timeout in case we don't get a response
                    setTimeout(() => {
                        resolve(null);
                    }, 1000);
                } catch (error) {
                    console.error('Error accessing storage:', error);
                    resolve(null);
                }
            });
        } catch (error) {
            console.error('Error getting saved element:', error);
            return null;
        }
    }
    
    /**
     * Saves an element's XPath for future use
     * @param {Element} element - Element to save
     * @returns {Promise<boolean>} Success status
     */
    async saveElementXPath(element) {
        try {
            if (!element) {
                return false;
            }
            
            // Get the storage key for saved elements
            const SAVED_ELEMENTS = 'savedElements';
            
            // Generate XPath for the element
            const xpath = this.generateXPath(element);
            if (!xpath) {
                return false;
            }
            
            // Use a more reliable way to access storage
            return new Promise((resolve) => {
                try {
                    // First get the current saved elements
                    const getRequestEvent = new CustomEvent('quiz-solver-storage-request', {
                        detail: {
                            action: 'get',
                            keys: [SAVED_ELEMENTS]
                        }
                    });
                    
                    // Set up a one-time listener for the get response
                    window.addEventListener('quiz-solver-storage-response', function getHandler(event) {
                        window.removeEventListener('quiz-solver-storage-response', getHandler);
                        
                        try {
                            const data = event.detail.result || {};
                            const savedElements = data[SAVED_ELEMENTS] || {};
                            const hostname = window.location.hostname;
                            
                            // Save the XPath for this domain
                            savedElements[hostname] = xpath;
                            
                            // Now set the updated saved elements
                            const setRequestEvent = new CustomEvent('quiz-solver-storage-request', {
                                detail: {
                                    action: 'set',
                                    data: { [SAVED_ELEMENTS]: savedElements }
                                }
                            });
                            
                            // Set up a one-time listener for the set response
                            window.addEventListener('quiz-solver-storage-response', function setHandler(event) {
                                window.removeEventListener('quiz-solver-storage-response', setHandler);
                                
                                this.showToast(`Element saved for ${hostname}. It will be used automatically next time.`, 'success');
                                resolve(true);
                            }.bind(this), { once: true });
                            
                            // Dispatch the set request
                            window.dispatchEvent(setRequestEvent);
                            
                            // Set a timeout in case we don't get a response
                            setTimeout(() => {
                                resolve(false);
                            }, 1000);
                        } catch (error) {
                            console.error('Error processing storage get response:', error);
                            resolve(false);
                        }
                    }.bind(this), { once: true });
                    
                    // Dispatch the get request
                    window.dispatchEvent(getRequestEvent);
                    
                    // Set a timeout in case we don't get a response
                    setTimeout(() => {
                        resolve(false);
                    }, 1000);
                } catch (error) {
                    console.error('Error accessing storage:', error);
                    resolve(false);
                }
            });
        } catch (error) {
            console.error('Error saving element XPath:', error);
            return false;
        }
    }
    
    /**
     * Generates an XPath for an element
     * @param {Element} element - Element to generate XPath for
     * @returns {string|null} XPath string or null if failed
     */
    generateXPath(element) {
        try {
            if (!element) return null;
            
            // Check if element has an ID
            if (element.id) {
                return `//*[@id="${element.id}"]`;
            }
            
            // Try to generate a path based on classes and tag name
            const parts = [];
            let current = element;
            
            while (current && current !== document.body) {
                let selector = current.tagName.toLowerCase();
                
                // Add classes if available (but limit to first 2 to avoid overfitting)
                if (current.className) {
                    const classes = current.className.split(/\s+/)
                        .filter(c => c && !c.includes(':') && !c.includes('.') && !c.includes(','))
                        .slice(0, 2);
                    
                    if (classes.length > 0) {
                        selector += '[contains(@class, "' + classes.join('") and contains(@class, "') + '")]';
                    }
                }
                
                // Add position among siblings if needed
                const siblings = Array.from(current.parentNode.children).filter(c => c.tagName === current.tagName);
                if (siblings.length > 1) {
                    const index = siblings.indexOf(current) + 1;
                    selector += `[${index}]`;
                }
                
                parts.unshift(selector);
                current = current.parentNode;
                
                // Limit path length to avoid overly specific paths
                if (parts.length >= 5) break;
            }
            
            return '//' + parts.join('/');
        } catch (error) {
            console.error('Error generating XPath:', error);
            return null;
        }
    }
    
    /**
     * Highlights an answer on the page
     * @param {string} answer - Answer text
     * @param {Array<string>} options - All answer options
     */
    highlightAnswer(answer, options) {
        if (!answer || !options || options.length === 0) {
            this.showError('Could not determine the answer');
            return;
        }
        
        let matched = false;
        
        // First try to find exact match in the DOM
        const allElements = document.querySelectorAll('*');
        for (const element of allElements) {
            if (element.textContent.trim() === answer.trim()) {
                this.highlightElement(element);
                matched = true;
                break;
            }
        }
        
        // If no exact match, look for elements containing the answer
        if (!matched) {
            for (const option of options) {
                if (option === answer) {
                    // Find elements with this option
                    const optionElements = Array.from(allElements).filter(el => 
                        el.textContent.trim() === option.trim()
                    );
                    
                    if (optionElements.length > 0) {
                        optionElements.forEach(el => this.highlightElement(el));
                        matched = true;
                        break;
                    }
                }
            }
        }
        
        // If still no match, try partial match
        if (!matched) {
            // Try to find elements containing the answer
            for (const element of allElements) {
                const text = element.textContent.trim();
                if (text.length > 0 && 
                    text.length < 200 && 
                    (text.includes(answer) || answer.includes(text))) {
                    this.highlightElement(element);
                    matched = true;
                    // Don't break, as we want to highlight all potential matches
                }
            }
        }
        
        // If still no match, show a message
        if (!matched) {
            this.showToast(`Could not highlight the answer: ${answer}`, 'info');
        }
    }
    
    /**
     * Highlights an element as the answer
     * @param {Element} element - Element to highlight
     */
    highlightElement(element) {
        if (!element) return;
        
        // Save original styles
        const originalOutline = element.style.outline;
        const originalBackground = element.style.backgroundColor;
        const originalTransition = element.style.transition;
        
        // Add highlight styles
        element.style.transition = 'all 0.5s ease';
        element.style.outline = '2px solid #4caf50';
        element.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
        
        // Scroll to the element if not in view
        const rect = element.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}
