/**
 * Selection overlay component for element selection
 * @author Dev Kraken <soman@devkraken.com>
 */

/**
 * Creates and manages the selection overlay
 */
export class SelectionOverlay {
    constructor() {
        this.element = null;
        this.instructionsElement = null;
        this.highlightElement = null;
        this.currentHighlightedElement = null;
        this.eventHandlers = {
            click: null,
            mouseover: null,
            mouseout: null
        };
    }
    
    /**
     * Creates and shows the overlay
     * @param {Function} clickHandler - Handler for element click
     * @param {Function} mouseoverHandler - Handler for element hover
     * @param {Function} mouseoutHandler - Handler for element mouse leave
     */
    show(clickHandler, mouseoverHandler, mouseoutHandler) {
        // Create overlay element - make it transparent to allow seeing the page
        this.element = document.createElement('div');
        this.element.id = 'quiz-solver-selection-overlay';
        this.element.style.position = 'fixed';
        this.element.style.top = '0';
        this.element.style.left = '0';
        this.element.style.width = '100%';
        this.element.style.height = '100%';
        this.element.style.backgroundColor = 'transparent'; // Make it fully transparent
        this.element.style.zIndex = '9990';
        this.element.style.pointerEvents = 'none'; // Important: Allow clicks to pass through
        document.body.appendChild(this.element);
        
        // Create highlight element for hover effect
        this.highlightElement = document.createElement('div');
        this.highlightElement.id = 'quiz-solver-highlight';
        this.highlightElement.style.position = 'absolute';
        this.highlightElement.style.border = '2px dashed #8e24aa';
        this.highlightElement.style.backgroundColor = 'rgba(142, 36, 170, 0.1)';
        this.highlightElement.style.zIndex = '9991';
        this.highlightElement.style.pointerEvents = 'none';
        this.highlightElement.style.display = 'none';
        this.highlightElement.style.borderRadius = '4px';
        this.highlightElement.style.boxShadow = '0 0 10px rgba(142, 36, 170, 0.3)';
        document.body.appendChild(this.highlightElement);
        
        // Add instructions element with clear guidance
        const instructions = document.createElement('div');
        instructions.style.position = 'fixed';
        instructions.style.top = '20px';
        instructions.style.left = '50%';
        instructions.style.transform = 'translateX(-50%)';
        instructions.style.padding = '12px 20px';
        instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        instructions.style.color = 'white';
        instructions.style.borderRadius = '8px';
        instructions.style.fontFamily = 'Arial, sans-serif';
        instructions.style.fontSize = '14px';
        instructions.style.fontWeight = 'bold';
        instructions.style.zIndex = '9992';
        instructions.style.pointerEvents = 'none';
        instructions.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        instructions.style.maxWidth = '80%';
        instructions.style.textAlign = 'center';
        instructions.style.lineHeight = '1.5';
        
        // Add icon and clear instructions
        instructions.innerHTML = `
            <div style="margin-bottom: 8px; font-size: 24px;">👆</div>
            <div>Hover over and click on the element containing the quiz question and answers</div>
            <div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">Elements will highlight as you hover over them</div>
            <div style="margin-top: 8px; font-size: 12px; color: #8e24aa;">Press ESC or click the Cancel button to exit selection mode</div>
        `;
        
        document.body.appendChild(instructions);
        this.instructionsElement = instructions;
        
        // Create a custom mouseover handler that uses our highlight element
        const enhancedMouseoverHandler = (event) => {
            if (this.isExtensionElement(event.target)) {
                return;
            }
            
            // Update the highlight element to match the target's position and size
            this.updateHighlightElement(event.target);
            
            // Store the current highlighted element
            this.currentHighlightedElement = event.target;
            
            // Call the original handler
            if (mouseoverHandler) {
                mouseoverHandler(event);
            }
        };
        
        // Create a custom mouseout handler
        const enhancedMouseoutHandler = (event) => {
            if (this.isExtensionElement(event.target)) {
                return;
            }
            
            // Only hide if we're leaving the current highlighted element
            if (event.target === this.currentHighlightedElement) {
                this.hideHighlightElement();
                this.currentHighlightedElement = null;
            }
            
            // Call the original handler
            if (mouseoutHandler) {
                mouseoutHandler(event);
            }
        };
        
        // Store event handlers
        this.eventHandlers.click = clickHandler;
        this.eventHandlers.mouseover = enhancedMouseoverHandler;
        this.eventHandlers.mouseout = enhancedMouseoutHandler;
        
        // Add event listeners
        document.addEventListener('click', clickHandler, true); // Use capture phase
        document.addEventListener('mouseover', enhancedMouseoverHandler, true); // Use capture phase
        document.addEventListener('mouseout', enhancedMouseoutHandler, true); // Use capture phase
        
        // Add ESC key handler to cancel selection
        document.addEventListener('keydown', this.handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                console.log('ESC key pressed, canceling selection');
                document.dispatchEvent(new CustomEvent('quiz-solver-cancel-selection'));
            }
        });
        
        console.log('Selection overlay activated');
    }
    
    /**
     * Updates the highlight element to match the target element
     * @param {Element} target - Target element to highlight
     */
    updateHighlightElement(target) {
        if (!this.highlightElement) return;
        
        const rect = target.getBoundingClientRect();
        
        this.highlightElement.style.display = 'block';
        this.highlightElement.style.top = `${rect.top}px`;
        this.highlightElement.style.left = `${rect.left}px`;
        this.highlightElement.style.width = `${rect.width}px`;
        this.highlightElement.style.height = `${rect.height}px`;
    }
    
    /**
     * Hides the highlight element
     */
    hideHighlightElement() {
        if (this.highlightElement) {
            this.highlightElement.style.display = 'none';
        }
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
     * Hides and removes the overlay
     */
    hide() {
        console.log('Hiding selection overlay');
        
        // Remove overlay element
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
        
        // Remove highlight element
        if (this.highlightElement) {
            this.highlightElement.remove();
            this.highlightElement = null;
        }
        
        // Remove instructions element
        if (this.instructionsElement) {
            this.instructionsElement.remove();
            this.instructionsElement = null;
        }
        
        // Remove event listeners
        if (this.eventHandlers.click) {
            document.removeEventListener('click', this.eventHandlers.click, true);
            this.eventHandlers.click = null;
        }
        
        if (this.eventHandlers.mouseover) {
            document.removeEventListener('mouseover', this.eventHandlers.mouseover, true);
            this.eventHandlers.mouseover = null;
        }
        
        if (this.eventHandlers.mouseout) {
            document.removeEventListener('mouseout', this.eventHandlers.mouseout, true);
            this.eventHandlers.mouseout = null;
        }
        
        // Remove ESC key handler
        if (this.handleKeyDown) {
            document.removeEventListener('keydown', this.handleKeyDown);
            this.handleKeyDown = null;
        }
        
        // Reset current highlighted element
        if (this.currentHighlightedElement) {
            // Reset any styles we might have added
            try {
                this.currentHighlightedElement.style.outline = '';
                this.currentHighlightedElement.style.backgroundColor = '';
            } catch (e) {
                // Ignore errors if element is no longer in the DOM
            }
            this.currentHighlightedElement = null;
        }
        
        // Check for any remaining elements with our ID pattern and remove them
        const remainingElements = document.querySelectorAll('[id^="quiz-solver-"]');
        for (const el of remainingElements) {
            try {
                el.remove();
            } catch (e) {
                console.error('Error removing element:', e);
            }
        }
        
        console.log('Selection overlay cleanup complete');
    }
    
    /**
     * Checks if the overlay is currently active
     * @returns {boolean} Whether the overlay is active
     */
    isActive() {
        return !!this.element;
    }
}
