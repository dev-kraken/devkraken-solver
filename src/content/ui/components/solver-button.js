/**
 * Solver button component
 * @author Dev Kraken <soman@devkraken.com>
 */

// Don't try to import constants, define them directly
// import { BRANDING } from '../../../shared/constants.js';

// Fallback values in case constants fail to load
const FALLBACK_COLORS = {
    PRIMARY: '#8e24aa',
    SECONDARY: '#6a1b9a'
};

/**
 * Creates and manages the solver button
 */
export class SolverButton {
    /**
     * @param {Function} onClick - Click handler for the button
     */
    constructor(onClick) {
        this.element = null;
        this.onClick = onClick;
        this.isInSelectionMode = false;
    }
    
    /**
     * Creates and adds the button to the page
     */
    create() {
        try {
            console.log('Creating solver button');
            
            // Remove existing button if any
            const existingButton = document.getElementById('solveQuizBtn');
            if (existingButton) existingButton.remove();
            
            // Create new floating button
            this.element = document.createElement('button');
            this.element.id = 'solveQuizBtn';
            this.element.className = 'quiz-solver-btn';
            this.element.innerHTML = '<span>Solve with Gemini</span>';
            
            // Use fallback color directly
            const primaryColor = FALLBACK_COLORS.PRIMARY;
                
            // Position button
            this.element.style.position = 'fixed';
            this.element.style.bottom = '20px';
            this.element.style.right = '20px';
            this.element.style.zIndex = '9999';
            this.element.style.padding = '10px 15px';
            this.element.style.backgroundColor = primaryColor;
            this.element.style.color = 'white';
            this.element.style.border = 'none';
            this.element.style.borderRadius = '20px';
            this.element.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
            this.element.style.cursor = 'pointer';
            this.element.style.fontFamily = 'Arial, sans-serif';
            this.element.style.fontWeight = 'bold';
            this.element.style.display = 'flex';
            this.element.style.alignItems = 'center';
            this.element.style.justifyContent = 'center';
            this.element.style.transition = 'all 0.3s ease';
            this.element.style.opacity = '1'; // Ensure it's visible
            
            // Add DevKraken branding
            const brandingSpan = document.createElement('span');
            brandingSpan.style.fontSize = '9px';
            brandingSpan.style.opacity = '0.8';
            brandingSpan.style.position = 'absolute';
            brandingSpan.style.bottom = '-12px';
            brandingSpan.style.right = '10px';
            brandingSpan.style.color = 'white';
            brandingSpan.style.textShadow = '0 1px 2px rgba(0,0,0,0.3)';
            brandingSpan.textContent = 'Powered by DevKraken';
            this.element.appendChild(brandingSpan);
            
            // Add hover effect
            this.element.addEventListener('mouseenter', () => {
                this.element.style.transform = 'scale(1.05)';
                this.element.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
            });
            
            this.element.addEventListener('mouseleave', () => {
                this.element.style.transform = 'scale(1)';
                this.element.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
            });
            
            // Add click handler
            this.element.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Add click animation
                this.element.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.element.style.transform = 'scale(1)';
                }, 100);
                
                console.log('Solver button clicked, calling handler');
                
                // If we're in selection mode, dispatch a cancel event
                if (this.isInSelectionMode) {
                    console.log('Button clicked in selection mode, canceling selection');
                    document.dispatchEvent(new CustomEvent('quiz-solver-cancel-selection'));
                    return;
                }
                
                // Otherwise, proceed with normal click handling
                if (typeof this.onClick === 'function') {
                    try {
                        this.onClick(e);
                    } catch (error) {
                        console.error('Error in solver button click handler:', error);
                        
                        // Dispatch a custom event as fallback
                        const event = new CustomEvent('quiz-solver-button-clicked');
                        document.dispatchEvent(event);
                    }
                } else {
                    console.warn('No click handler set for solver button');
                    
                    // Dispatch a custom event as fallback
                    const event = new CustomEvent('quiz-solver-button-clicked');
                    document.dispatchEvent(event);
                }
            });
            
            // Add to page
            document.body.appendChild(this.element);
            console.log('Solver button created successfully');
            
            // Force a reflow to ensure the button is visible
            this.element.getBoundingClientRect();
            
            // Make sure it's visible
            setTimeout(() => {
                if (this.element) {
                    this.element.style.opacity = '1';
                    this.element.style.visibility = 'visible';
                }
            }, 100);
        } catch (error) {
            console.error('Error creating solver button:', error);
        }
    }
    
    /**
     * Sets the button to selection mode
     */
    setSelectionMode() {
        if (!this.element) return;
        
        console.log('Setting button to selection mode');
        this.isInSelectionMode = true;
        this.element.innerHTML = '<span>Cancel Selection</span>';
        this.element.style.backgroundColor = '#f44336';
    }
    
    /**
     * Resets the button to normal mode
     */
    resetNormalMode() {
        if (!this.element) return;
        
        console.log('Resetting button to normal mode');
        this.isInSelectionMode = false;
        this.element.innerHTML = '<span>Solve with Gemini</span>';
        this.element.style.backgroundColor = FALLBACK_COLORS.PRIMARY;
    }
    
    /**
     * Sets a new click handler
     * @param {Function} handler - New click handler
     */
    setClickHandler(handler) {
        this.onClick = handler;
    }
    
    /**
     * Removes the button from the page
     */
    remove() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
}
