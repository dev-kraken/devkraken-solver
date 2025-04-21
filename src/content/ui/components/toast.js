/**
 * Toast notification component
 * @author Dev Kraken <soman@devkraken.com>
 */

// Don't import constants, define them directly
// import { BRANDING, TIME_CONSTANTS } from '../../../shared/constants.js';

// Fallback values in case constants fail to load
const FALLBACK_COLORS = {
    SUCCESS: '#4caf50',
    ERROR: '#f44336',
    SECONDARY: '#8e24aa',
    PRIMARY: '#8e24aa'
};

const FALLBACK_DURATION = 5000; // 5 seconds

/**
 * Creates and manages toast notifications
 */
export class Toast {
    constructor() {
        this.element = null;
    }
    
    /**
     * Shows a toast notification
     * @param {string} message - Message to display
     * @param {'success'|'error'|'info'} type - Type of toast
     */
    show(message, type = 'info') {
        try {
            console.log(`Quiz Solver: Showing ${type} toast: ${message}`);
            
            // Remove existing toast if any
            if (this.element) {
                this.element.remove();
            }
            
            this.element = document.createElement('div');
            this.element.className = 'quiz-solver-toast';
            this.element.style.position = 'fixed';
            this.element.style.bottom = '80px';
            this.element.style.right = '20px';
            this.element.style.padding = '12px 20px';
            this.element.style.borderRadius = '4px';
            this.element.style.color = 'white';
            this.element.style.fontFamily = 'Arial, sans-serif';
            this.element.style.zIndex = '10001';
            this.element.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
            this.element.style.maxWidth = '300px';
            this.element.style.wordBreak = 'break-word';
            this.element.style.opacity = '0';
            this.element.style.transform = 'translateY(20px)';
            this.element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            // Use colors directly from fallback
            const colors = FALLBACK_COLORS;
                
            // Set style based on toast type
            if (type === 'success') {
                this.element.style.backgroundColor = colors.SUCCESS;
                message = '✓ ' + message;
            } else if (type === 'error') {
                this.element.style.backgroundColor = colors.ERROR;
                message = '✗ ' + message;
            } else {
                this.element.style.backgroundColor = colors.SECONDARY;
                message = 'ℹ ' + message;
            }
            
            this.element.textContent = message;
            document.body.appendChild(this.element);
            
            // Force a reflow to ensure transition works
            this.element.getBoundingClientRect();
            
            // Make toast visible with animation
            this.element.style.opacity = '1';
            this.element.style.transform = 'translateY(0)';
            
            // Use duration directly from fallback
            const duration = FALLBACK_DURATION;
                
            // Auto-remove toast after some time
            setTimeout(() => this.dismiss(), duration);
        } catch (error) {
            console.error('Error showing toast:', error);
            
            // Last resort - create an alert
            if (message.includes('API key')) {
                try {
                    alert('Quiz Solver: ' + message);
                } catch (e) {
                    // Even alert failed, nothing more we can do
                    console.error('Failed to show alert:', e);
                }
            }
        }
    }
    
    /**
     * Shows a success toast
     * @param {string} message - Success message
     */
    showSuccess(message) {
        this.show(message, 'success');
    }
    
    /**
     * Shows an error toast
     * @param {string} message - Error message
     */
    showError(message) {
        this.show(message, 'error');
    }
    
    /**
     * Dismisses the toast with animation
     */
    dismiss() {
        if (this.element) {
            this.element.style.opacity = '0';
            this.element.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                if (this.element) {
                    this.element.remove();
                    this.element = null;
                }
            }, 300);
        }
    }
}
