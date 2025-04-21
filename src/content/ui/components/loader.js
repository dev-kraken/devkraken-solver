/**
 * Loading indicator component
 * @author Dev Kraken <soman@devkraken.com>
 */

/**
 * Creates and manages a loading indicator
 */
export class Loader {
    constructor() {
        this.element = null;
    }
    
    /**
     * Creates and adds the loader to the page
     */
    create() {
        // Remove existing loader if any
        const existingLoader = document.getElementById('quizSolverLoader');
        if (existingLoader) existingLoader.remove();
        
        // Create new loader
        this.element = document.createElement('div');
        this.element.id = 'quizSolverLoader';
        this.element.style.position = 'fixed';
        this.element.style.top = '50%';
        this.element.style.left = '50%';
        this.element.style.transform = 'translate(-50%, -50%)';
        this.element.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.element.style.color = 'white';
        this.element.style.padding = '20px';
        this.element.style.borderRadius = '10px';
        this.element.style.zIndex = '10000';
        this.element.style.display = 'none';
        this.element.style.flexDirection = 'column';
        this.element.style.alignItems = 'center';
        this.element.style.justifyContent = 'center';
        this.element.style.gap = '10px';
        this.element.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        
        // Create spinner
        const spinner = document.createElement('div');
        spinner.className = 'quiz-solver-spinner';
        spinner.style.width = '30px';
        spinner.style.height = '30px';
        spinner.style.border = '3px solid rgba(255, 255, 255, 0.3)';
        spinner.style.borderTop = '3px solid #8e24aa';
        spinner.style.borderRadius = '50%';
        spinner.style.animation = 'quiz-solver-spin 1s linear infinite';
        
        // Add keyframes for spinner animation
        this.addAnimationStyles();
        
        // Create text
        const text = document.createElement('div');
        text.textContent = 'Asking Gemini...';
        text.style.marginTop = '10px';
        text.style.fontFamily = 'Arial, sans-serif';
        
        this.element.appendChild(spinner);
        this.element.appendChild(text);
        document.body.appendChild(this.element);
        
        return this.element;
    }
    
    /**
     * Adds animation styles to the document
     */
    addAnimationStyles() {
        if (!document.getElementById('quiz-solver-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'quiz-solver-spinner-style';
            style.textContent = `
                @keyframes quiz-solver-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes quiz-solver-fade {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                
                @keyframes quiz-solver-highlight {
                    0% { background-color: transparent; }
                    50% { background-color: rgba(142, 36, 170, 0.3); }
                    100% { background-color: rgba(142, 36, 170, 0.15); }
                }
                
                .quiz-solver-toast {
                    animation: quiz-solver-fade 0.3s ease-out forwards;
                }
                
                .quiz-solver-panel {
                    animation: quiz-solver-fade 0.3s ease-out forwards;
                }
                
                .quiz-solver-correct {
                    animation: quiz-solver-highlight 1s ease-out forwards;
                    background-color: rgba(142, 36, 170, 0.15);
                    border-left: 3px solid #8e24aa;
                    transition: all 0.3s ease;
                }
                
                .quiz-solver-correct:hover {
                    background-color: rgba(142, 36, 170, 0.25);
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    /**
     * Shows the loader
     */
    show() {
        if (!this.element) {
            this.create();
        }
        this.element.style.display = 'flex';
    }
    
    /**
     * Hides the loader
     */
    hide() {
        if (this.element) {
            this.element.style.display = 'none';
        }
    }
    
    /**
     * Removes the loader from the page
     */
    remove() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
}
