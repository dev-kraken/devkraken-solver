import { CLASSES, TIME_CONSTANTS } from '../constants.js';

export class UIManager {
    constructor() {
        this.questionElement = null;
        this.optionElements = [];
        this.resultsPanel = null;
        this.loaderElement = null;
        this.toastElement = null;
        this.solveButton = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isDragging = false;
    }

    initialize() {
        this.createSolveButton();
        this.createLoader();
    }

    createSolveButton() {
        // Remove existing button if any
        const existingButton = document.getElementById('solveQuizBtn');
        if (existingButton) existingButton.remove();
        
        // Create new floating button
        this.solveButton = document.createElement('button');
        this.solveButton.id = 'solveQuizBtn';
        this.solveButton.className = 'quiz-solver-btn';
        this.solveButton.innerHTML = '<span>Solve with Gemini</span>';
        
        // Position button
        this.solveButton.style.position = 'fixed';
        this.solveButton.style.bottom = '20px';
        this.solveButton.style.right = '20px';
        this.solveButton.style.zIndex = '9999';
        this.solveButton.style.padding = '10px 15px';
        this.solveButton.style.backgroundColor = '#8e24aa';
        this.solveButton.style.color = 'white';
        this.solveButton.style.border = 'none';
        this.solveButton.style.borderRadius = '20px';
        this.solveButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
        this.solveButton.style.cursor = 'pointer';
        this.solveButton.style.fontFamily = 'Arial, sans-serif';
        this.solveButton.style.fontWeight = 'bold';
        this.solveButton.style.display = 'flex';
        this.solveButton.style.alignItems = 'center';
        this.solveButton.style.justifyContent = 'center';
        this.solveButton.style.transition = 'all 0.3s ease';
        
        // Add hover effect
        this.solveButton.onmouseover = () => {
            this.solveButton.style.backgroundColor = '#aa3ad0';
            this.solveButton.style.transform = 'scale(1.05)';
        };
        
        this.solveButton.onmouseout = () => {
            this.solveButton.style.backgroundColor = '#8e24aa';
            this.solveButton.style.transform = 'scale(1)';
        };
        
        document.body.appendChild(this.solveButton);
    }

    createLoader() {
        // Remove existing loader if any
        const existingLoader = document.getElementById('quizSolverLoader');
        if (existingLoader) existingLoader.remove();
        
        // Create new loader
        this.loaderElement = document.createElement('div');
        this.loaderElement.id = 'quizSolverLoader';
        this.loaderElement.style.position = 'fixed';
        this.loaderElement.style.top = '50%';
        this.loaderElement.style.left = '50%';
        this.loaderElement.style.transform = 'translate(-50%, -50%)';
        this.loaderElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.loaderElement.style.color = 'white';
        this.loaderElement.style.padding = '20px';
        this.loaderElement.style.borderRadius = '10px';
        this.loaderElement.style.zIndex = '10000';
        this.loaderElement.style.display = 'none';
        this.loaderElement.style.flexDirection = 'column';
        this.loaderElement.style.alignItems = 'center';
        this.loaderElement.style.justifyContent = 'center';
        this.loaderElement.style.gap = '10px';
        this.loaderElement.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        
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
        
        // Create text
        const text = document.createElement('div');
        text.textContent = 'Asking Gemini...';
        text.style.marginTop = '10px';
        text.style.fontFamily = 'Arial, sans-serif';
        
        this.loaderElement.appendChild(spinner);
        this.loaderElement.appendChild(text);
        document.body.appendChild(this.loaderElement);
    }
    
    createResultsPanel(question, answer) {
        // Remove existing panel if any
        if (this.resultsPanel) this.resultsPanel.remove();
        
        this.resultsPanel = document.createElement('div');
        this.resultsPanel.className = 'quiz-solver-panel';
        this.resultsPanel.style.position = 'fixed';
        this.resultsPanel.style.top = '100px';
        this.resultsPanel.style.right = '20px';
        this.resultsPanel.style.width = '300px';
        this.resultsPanel.style.backgroundColor = 'white';
        this.resultsPanel.style.borderRadius = '8px';
        this.resultsPanel.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        this.resultsPanel.style.zIndex = '9998';
        this.resultsPanel.style.overflow = 'hidden';
        this.resultsPanel.style.fontFamily = 'Arial, sans-serif';
        this.resultsPanel.style.fontSize = '14px';
        this.resultsPanel.style.border = '1px solid #e0e0e0';
        
        // Create header with drag handle
        const header = document.createElement('div');
        header.className = 'quiz-solver-panel-header';
        header.style.padding = '10px 15px';
        header.style.backgroundColor = '#8e24aa';
        header.style.color = 'white';
        header.style.fontWeight = 'bold';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.cursor = 'move';
        header.textContent = 'Gemini AI Answer';
        
        // Add event listeners for dragging
        header.addEventListener('mousedown', (e) => this.startDragging(e));
        document.addEventListener('mouseup', () => this.stopDragging());
        document.addEventListener('mousemove', (e) => this.drag(e));
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.color = 'white';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.padding = '0 5px';
        closeButton.onclick = () => this.resultsPanel.remove();
        
        header.appendChild(closeButton);
        this.resultsPanel.appendChild(header);
        
        // Create content area
        const content = document.createElement('div');
        content.style.padding = '15px';
        
        // Question section
        const questionSection = document.createElement('div');
        questionSection.style.marginBottom = '15px';
        
        const questionLabel = document.createElement('div');
        questionLabel.textContent = 'Question:';
        questionLabel.style.fontWeight = 'bold';
        questionLabel.style.marginBottom = '5px';
        questionLabel.style.color = '#333';
        
        const questionText = document.createElement('div');
        questionText.textContent = question;
        questionText.style.lineHeight = '1.4';
        questionText.style.color = '#555';
        questionText.style.backgroundColor = '#f9f9f9';
        questionText.style.padding = '8px 10px';
        questionText.style.borderRadius = '4px';
        questionText.style.border = '1px solid #eee';
        questionText.style.maxHeight = '100px';
        questionText.style.overflow = 'auto';
        
        questionSection.appendChild(questionLabel);
        questionSection.appendChild(questionText);
        content.appendChild(questionSection);
        
        // Answer section
        const answerSection = document.createElement('div');
        
        const answerLabel = document.createElement('div');
        answerLabel.textContent = 'Answer:';
        answerLabel.style.fontWeight = 'bold';
        answerLabel.style.marginBottom = '5px';
        answerLabel.style.color = '#333';
        
        const answerText = document.createElement('div');
        answerText.textContent = answer;
        answerText.style.lineHeight = '1.4';
        answerText.style.color = '#8e24aa';
        answerText.style.fontWeight = 'bold';
        answerText.style.backgroundColor = 'rgba(142, 36, 170, 0.1)';
        answerText.style.padding = '10px 12px';
        answerText.style.borderRadius = '4px';
        answerText.style.border = '1px solid rgba(142, 36, 170, 0.3)';
        
        answerSection.appendChild(answerLabel);
        answerSection.appendChild(answerText);
        content.appendChild(answerSection);
        
        // Add confidence indicator
        const confidenceText = document.createElement('div');
        confidenceText.textContent = '✓ Based on context analysis';
        confidenceText.style.marginTop = '15px';
        confidenceText.style.color = '#43a047';
        confidenceText.style.fontSize = '12px';
        confidenceText.style.textAlign = 'right';
        content.appendChild(confidenceText);
        
        this.resultsPanel.appendChild(content);
        document.body.appendChild(this.resultsPanel);
    }
    
    startDragging(e) {
        if (e.target.className === 'quiz-solver-panel-header') {
            this.isDragging = true;
            const rect = this.resultsPanel.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            this.resultsPanel.style.transition = 'none';
        }
    }
    
    stopDragging() {
        this.isDragging = false;
        if (this.resultsPanel) {
            this.resultsPanel.style.transition = 'box-shadow 0.3s ease';
        }
    }
    
    drag(e) {
        if (!this.isDragging || !this.resultsPanel) return;
        
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        
        // Keep panel within viewport bounds
        const maxX = window.innerWidth - this.resultsPanel.offsetWidth;
        const maxY = window.innerHeight - this.resultsPanel.offsetHeight;
        
        const boundedX = Math.max(0, Math.min(x, maxX));
        const boundedY = Math.max(0, Math.min(y, maxY));
        
        this.resultsPanel.style.left = `${boundedX}px`;
        this.resultsPanel.style.top = `${boundedY}px`;
        this.resultsPanel.style.right = 'auto';
    }

    showLoader() {
        if (this.loaderElement) {
            this.loaderElement.style.display = 'flex';
        }
    }

    hideLoader() {
        if (this.loaderElement) {
            this.loaderElement.style.display = 'none';
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        // Remove existing toast if any
        if (this.toastElement) {
            this.toastElement.remove();
        }
        
        this.toastElement = document.createElement('div');
        this.toastElement.className = 'quiz-solver-toast';
        this.toastElement.style.position = 'fixed';
        this.toastElement.style.bottom = '80px';
        this.toastElement.style.right = '20px';
        this.toastElement.style.padding = '12px 20px';
        this.toastElement.style.borderRadius = '4px';
        this.toastElement.style.color = 'white';
        this.toastElement.style.fontFamily = 'Arial, sans-serif';
        this.toastElement.style.zIndex = '10001';
        this.toastElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        this.toastElement.style.maxWidth = '300px';
        this.toastElement.style.wordBreak = 'break-word';
        
        // Set style based on toast type
        if (type === 'success') {
            this.toastElement.style.backgroundColor = '#43a047';
            message = '✓ ' + message;
        } else if (type === 'error') {
            this.toastElement.style.backgroundColor = '#e53935';
            message = '✗ ' + message;
        } else {
            this.toastElement.style.backgroundColor = '#1e88e5';
            message = 'ℹ ' + message;
        }
        
        this.toastElement.textContent = message;
        document.body.appendChild(this.toastElement);
        
        // Auto-remove toast after some time
        setTimeout(() => {
            if (this.toastElement) {
                this.toastElement.style.opacity = '0';
                this.toastElement.style.transform = 'translateY(20px)';
                this.toastElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                
                setTimeout(() => {
                    if (this.toastElement) {
                        this.toastElement.remove();
                        this.toastElement = null;
                    }
                }, 300);
            }
        }, TIME_CONSTANTS.NOTIFICATION_DURATION);
    }

    findElementWithXPath(xpath) {
        try {
            return document.evaluate(
                xpath, 
                document, 
                null, 
                XPathResult.FIRST_ORDERED_NODE_TYPE, 
                null
            ).singleNodeValue;
        } catch (e) {
            console.error('XPath evaluation error:', e);
            return null;
        }
    }

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
                const label = this.findAssociatedLabel(radio);
                if (label && label.textContent.trim() === answer.trim()) {
                    this.highlightElement(label);
                    matched = true;
                    break;
                }
            }
        }
        
        // If still no match, try fuzzy matching
        if (!matched) {
            let bestMatch = null;
            let highestScore = 0;
            
            for (const element of allElements) {
                const text = element.textContent.trim();
                if (text.length > 10 && text.length < 200) {  // Reasonable length for an option
                    const score = this.calculateSimilarity(text, answer);
                    if (score > 0.7 && score > highestScore) {  // 70% similarity threshold
                        highestScore = score;
                        bestMatch = element;
                    }
                }
            }
            
            if (bestMatch) {
                this.highlightElement(bestMatch);
                matched = true;
            }
        }
        
        // If we still couldn't find a DOM element to highlight, just show the results panel
        this.createResultsPanel(this.getQuestionText(), answer);
        
        if (matched) {
            this.showSuccess('Answer found!');
        } else {
            this.showSuccess('Answer provided in panel');
        }
    }
    
    getQuestionText() {
        // Try to get the cached question
        if (this.questionElement && this.questionElement.textContent) {
            return this.questionElement.textContent.trim();
        }
        
        // Return placeholder if not available
        return "Question analyzed by Gemini";
    }
    
    findAssociatedLabel(input) {
        // First try by 'for' attribute
        if (input.id) {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) return label;
        }
        
        // Then try by parent-child relationship
        let parent = input.parentElement;
        while (parent) {
            if (parent.tagName === 'LABEL') return parent;
            
            const label = parent.querySelector('label');
            if (label) return label;
            
            parent = parent.parentElement;
            if (!parent || parent === document.body) break;
        }
        
        // Try sibling elements
        let sibling = input.nextElementSibling;
        if (sibling && (sibling.tagName === 'LABEL' || sibling.tagName === 'SPAN')) {
            return sibling;
        }
        
        return null;
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