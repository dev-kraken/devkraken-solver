/**
 * UI Manager to coordinate all UI components
 * @author Dev Kraken <soman@devkraken.com>
 */

import { SolverButton } from './components/solver-button.js';
import { Loader } from './components/loader.js';
import { Toast } from './components/toast.js';
import { ResultsPanel } from './components/results-panel.js';
import { SelectionOverlay } from './components/selection-overlay.js';
import { CLASSES } from '../../shared/constants.js';
import { findAssociatedLabel } from '../../shared/utils/dom-utils.js';

/**
 * Manages all UI components of the extension
 */
export class UIManager {
    constructor() {
        this.solverButton = null;
        this.loader = null;
        this.toast = null;
        this.resultsPanel = null;
        this.selectionOverlay = null;
        this.selectedElement = null;
        this.isSelectionMode = false;
    }
    
    /**
     * Initializes all UI components
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            console.log('UIManager: Creating UI components');
            
            // Create components
            this.toast = new Toast();
            
            // No longer showing test toast
            // this.toast.show('Quiz Solver UI initialized', 'info');
            
            this.loader = new Loader();
            this.loader.create();
            this.resultsPanel = new ResultsPanel();
            this.selectionOverlay = new SelectionOverlay();
            
            // Initialize the solver button last to ensure its on top
            this.solverButton = new SolverButton(
                this.handleSolverButtonClick.bind(this)
            );
            this.solverButton.create();
            
            console.log('UIManager: All components initialized successfully');
            return Promise.resolve();
        } catch (error) {
            console.error('Error initializing UIManager:', error);
            
            // Try to show error message even if UI initialization failed
            try {
                // Create a minimal toast if needed
                if (!this.toast) {
                    this.toast = new Toast();
                }
                
                this.toast.showError('Failed to initialize UI: ' + error.message);
            } catch (e) {
                console.error('Could not show error toast:', e);
                // Last resort
                alert('Quiz Solver Extension Error: Failed to initialize UI: ' + error.message);
            }
            
            return Promise.reject(error);
        }
    }
    
    /**
     * Handles the solver button click
     * This should be bound to an external handler through setButtonClickHandler
     */
    handleSolverButtonClick() {
        console.log('UIManager: Default button click handler called');
        
        // Dispatch event instead of trying to access chrome.storage directly
        const event = new CustomEvent('quiz-solver-button-clicked');
        document.dispatchEvent(event);
        
        // Show a direct message about API key
        try {
            this.showToast('Please make sure your API key is set in the extension popup', 'info');
        } catch (error) {
            console.error('Error showing toast:', error);
        }
    }
    
    /**
     * Sets the button click handler
     * @param {Function} handler - Click handler function
     */
    setButtonClickHandler(handler) {
        if (typeof handler === 'function') {
            console.log('UIManager: Setting custom button click handler');
            this.handleSolverButtonClick = handler;
        } else {
            console.warn('UIManager: Invalid click handler provided, using default');
        }
    }
    
    /**
     * Shows the loading indicator
     */
    showLoader() {
        this.loader.show();
    }
    
    /**
     * Hides the loading indicator
     */
    hideLoader() {
        this.loader.hide();
    }
    
    /**
     * Shows a success toast message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        this.toast.showSuccess(message);
    }
    
    /**
     * Shows an error toast message
     * @param {string} message - Error message
     */
    showError(message) {
        this.toast.showError(message);
    }
    
    /**
     * Shows any type of toast message
     * @param {string} message - Toast message
     * @param {'success'|'error'|'info'} type - Toast type
     */
    showToast(message, type = 'info') {
        this.toast.show(message, type);
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
        console.log('UIManager: Enabling selection mode');
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
        console.log('UIManager: Disabling selection mode');
        this.isSelectionMode = false;
        this.solverButton.resetNormalMode();
        this.selectionOverlay.hide();
    }
    
    /**
     * Handles click during selection mode
     * @param {MouseEvent} event - Click event
     */
    handleDocumentClick(event) {
        console.log('UIManager: Document click detected in selection mode');
        
        // Check if we're still in selection mode
        if (!this.isSelectionMode) {
            console.log('UIManager: Not in selection mode, ignoring click');
            return;
        }
        
        // Prevent default behavior
        event.preventDefault();
        event.stopPropagation();
        
        // Ignore clicks on extension elements
        if (this.isExtensionElement(event.target)) {
            console.log('UIManager: Click on extension element, ignoring');
            return;
        }
        
        console.log('UIManager: Valid element selected:', event.target);
        
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
        console.log('UIManager: Mouseover on element during selection mode');
    }
    
    /**
     * Handles mouseout during selection mode
     * @param {MouseEvent} event - Mouseout event
     */
    handleElementMouseOut(event) {
        if (!this.isSelectionMode) return;
        
        // We don't need to remove inline styles here anymore
        // The SelectionOverlay component handles the highlighting
        console.log('UIManager: Mouseout on element during selection mode');
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
            
            // Notify that an element has been selected
            document.dispatchEvent(new CustomEvent('quiz-element-selected', {
                detail: { element: this.selectedElement }
            }));
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
            console.log('UIManager: Getting saved element for domain:', window.location.hostname);
            
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
                            
                            console.log('UIManager: Saved elements data:', savedElements);
                            console.log('UIManager: Looking for saved element for:', hostname);
                            
                            // Check if we have an XPath for this domain
                            if (savedElements[hostname]) {
                                const xpath = savedElements[hostname];
                                console.log('UIManager: Found saved XPath:', xpath);
                                
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
                                        console.log('UIManager: Found element using saved XPath');
                                        resolve(element);
                                        return;
                                    } else {
                                        console.log('UIManager: XPath found but element not found in DOM');
                                    }
                                } catch (error) {
                                    console.error('Error evaluating XPath:', error);
                                }
                            } else {
                                console.log('UIManager: No saved element for this domain');
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
                        console.log('UIManager: Storage request timed out');
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
                console.error('UIManager: Cannot save null element');
                return false;
            }
            
            console.log('UIManager: Saving element XPath for domain:', window.location.hostname);
            
            // Get the storage key for saved elements
            const SAVED_ELEMENTS = 'savedElements';
            
            // Generate XPath for the element
            const xpath = this.generateXPath(element);
            if (!xpath) {
                console.error('UIManager: Failed to generate XPath for element');
                return false;
            }
            
            console.log('UIManager: Generated XPath:', xpath);
            
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
                                
                                console.log('UIManager: Saved element XPath for domain:', hostname);
                                this.showToast(`Element saved for ${hostname}. It will be used automatically next time.`, 'success');
                                resolve(true);
                            }.bind(this), { once: true });
                            
                            // Dispatch the set request
                            window.dispatchEvent(setRequestEvent);
                            
                            // Set a timeout in case we don't get a response
                            setTimeout(() => {
                                console.log('UIManager: Storage set request timed out');
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
                        console.log('UIManager: Storage get request timed out');
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
        
        // Try with radio buttons and checkboxes
        if (!matched) {
            const radioButtons = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
            
            for (const radio of radioButtons) {
                const label = findAssociatedLabel(radio);
                if (label && label.textContent.trim() === answer.trim()) {
                    this.highlightElement(label);
                    matched = true;
                    break;
                }
            }
        }
        
        // Always show the results panel
        this.showResults(this.getQuestionText(), answer);
        
        if (matched) {
            this.showSuccess('Answer found!');
        } else {
            this.showSuccess('Answer provided in panel');
        }
    }
    
    /**
     * Gets the question text if available
     * @returns {string} Question text or placeholder
     */
    getQuestionText() {
        if (this.selectedElement) {
            return this.selectedElement.textContent.trim().substring(0, 100) + '...';
        }
        return "Question analyzed by Gemini";
    }
    
    /**
     * Highlights an element as the correct answer
     * @param {Element} element - Element to highlight
     */
    highlightElement(element) {
        if (!element) return;
        
        // Scroll to element
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add highlight class
        element.classList.add(CLASSES.CORRECT);
        
        // Flash effect for better visibility
        element.style.transition = 'background-color 0.5s ease';
        
        // For radio buttons and checkboxes, try to select them
        const nearbyInput = element.querySelector('input[type="radio"], input[type="checkbox"]');
        const parentLabel = element.closest('label');
        
        if (nearbyInput) {
            try {
                nearbyInput.checked = true;
                // Dispatch change event to trigger any listeners
                nearbyInput.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (e) {
                // Some pages prevent programmatic selection
            }
        } else if (parentLabel) {
            const associatedInput = document.getElementById(parentLabel.getAttribute('for'));
            if (associatedInput) {
                try {
                    associatedInput.checked = true;
                    associatedInput.dispatchEvent(new Event('change', { bubbles: true }));
                } catch (e) {
                    // Some pages prevent programmatic selection
                }
            }
        }
    }
}
