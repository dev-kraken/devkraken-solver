import { CLASSES, TIME_CONSTANTS, BRANDING } from '../constants.js';

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
        this.isSelectionMode = false;
        this.selectedElement = null;
        
        // Bind event handlers to preserve 'this' context
        this.boundHandleDocumentClick = this.handleDocumentClick.bind(this);
        this.boundHandleMouseOver = this.handleMouseOver.bind(this);
        this.boundHandleMouseOut = this.handleMouseOut.bind(this);
    }

    initialize() {
        try {
            this.createSolveButton();
            this.createLoader();
            return Promise.resolve();
        } catch (error) {
            console.error('Error initializing UIManager:', error);
            return Promise.reject(error);
        }
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
        this.solveButton.style.backgroundColor = BRANDING.COLORS.PRIMARY;
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
        
        // Add DevKraken branding
        const brandingSpan = document.createElement('span');
        brandingSpan.style.fontSize = '9px';
        brandingSpan.style.opacity = '0.8';
        brandingSpan.style.position = 'absolute';
        brandingSpan.style.bottom = '-12px';
        brandingSpan.style.right = '10px';
        brandingSpan.style.color = 'white';
        brandingSpan.style.textShadow = '0 1px 2px rgba(0,0,0,0.3)';
        brandingSpan.textContent = BRANDING.TAGLINE;
        this.solveButton.appendChild(brandingSpan);
        
        // Add hover effect
        this.solveButton.onmouseover = () => {
            this.solveButton.style.backgroundColor = '#aa3ad0';
            this.solveButton.style.transform = 'scale(1.05)';
        };
        
        this.solveButton.onmouseout = () => {
            this.solveButton.style.backgroundColor = BRANDING.COLORS.PRIMARY;
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
        header.style.backgroundColor = BRANDING.COLORS.PRIMARY;
        header.style.color = 'white';
        header.style.fontWeight = 'bold';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.cursor = 'move';
        header.textContent = 'Gemini AI Answer';
        
        // Add DevKraken branding
        const brandingSpan = document.createElement('span');
        brandingSpan.style.fontSize = '10px';
        brandingSpan.style.opacity = '0.8';
        brandingSpan.style.marginLeft = '10px';
        brandingSpan.textContent = BRANDING.TAGLINE;
        header.appendChild(brandingSpan);
        
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
        try {
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
                this.toastElement.style.backgroundColor = BRANDING.COLORS.SUCCESS;
                message = '✓ ' + message;
            } else if (type === 'error') {
                this.toastElement.style.backgroundColor = BRANDING.COLORS.ERROR;
                message = '✗ ' + message;
            } else {
                this.toastElement.style.backgroundColor = BRANDING.COLORS.SECONDARY;
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
        } catch (error) {
            console.error('Error showing toast:', error);
        }
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
    
    enableSelectionMode() {
        // Make sure the button exists, create it if it doesn't
        if (!this.solveButton) {
            this.createSolveButton();
        }
        
        this.isSelectionMode = true;
        this.solveButton.innerHTML = '<span>Click on question container</span>';
        this.solveButton.style.backgroundColor = BRANDING.COLORS.ERROR;
        
        // Show a toast notification with instructions
        this.showToast('Click on the element containing the question and answers', 'info');
        
        // Add a temporary overlay to indicate selection mode
        this.createSelectionOverlay();
        
        // Add click event listener to the document
        document.addEventListener('click', this.boundHandleDocumentClick, true);
        
        // Add mouseover event to highlight potential elements
        document.addEventListener('mouseover', this.boundHandleMouseOver);
        document.addEventListener('mouseout', this.boundHandleMouseOut);
    }
    
    disableSelectionMode() {
        // Make sure the button exists
        if (!this.solveButton) {
            return;
        }
        
        this.isSelectionMode = false;
        this.solveButton.innerHTML = '<span>Solve with Gemini</span>';
        this.solveButton.style.backgroundColor = BRANDING.COLORS.PRIMARY;
        
        // Remove overlay
        const overlay = document.getElementById('quiz-solver-selection-overlay');
        if (overlay) overlay.remove();
        
        // Remove event listeners
        document.removeEventListener('click', this.boundHandleDocumentClick, true);
        document.removeEventListener('mouseover', this.boundHandleMouseOver);
        document.removeEventListener('mouseout', this.boundHandleMouseOut);
    }
    
    createSelectionOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'quiz-solver-selection-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(142, 36, 170, 0.1)';
        overlay.style.zIndex = '9990';
        overlay.style.pointerEvents = 'none';
        document.body.appendChild(overlay);
    }
    
    handleDocumentClick(event) {
        // Check if we're still in selection mode
        if (!this.isSelectionMode) {
            return;
        }
        
        // Prevent default behavior
        event.preventDefault();
        event.stopPropagation();
        
        // Ignore clicks on extension elements
        if (event.target.id === 'solveQuizBtn' || 
            event.target.closest('#solveQuizBtn') ||
            event.target.closest('#quiz-solver-selection-overlay') ||
            event.target.closest('#quizSolverLoader') ||
            event.target.closest('.quiz-solver-toast') ||
            event.target.closest('.quiz-solver-panel')) {
            return;
        }
        
        // Get the clicked element
        const element = event.target;
        
        // Store the selected element
        this.selectedElement = element;
        
        // Disable selection mode
        this.disableSelectionMode();
        
        // Highlight the selected element temporarily
        const originalBackground = element.style.backgroundColor;
        element.style.backgroundColor = 'rgba(142, 36, 170, 0.2)';
        
        setTimeout(() => {
            element.style.backgroundColor = originalBackground;
            
            // Notify that an element has been selected
            document.dispatchEvent(new CustomEvent('quiz-element-selected', {
                detail: { element: this.selectedElement }
            }));
        }, 500);
        
        return false;
    }
    
    handleMouseOver(event) {
        if (!this.isSelectionMode) return;
        
        // Ignore extension elements
        if (event.target.id === 'solveQuizBtn' || 
            event.target.closest('#solveQuizBtn') ||
            event.target.closest('#quiz-solver-selection-overlay') ||
            event.target.closest('#quizSolverLoader') ||
            event.target.closest('.quiz-solver-toast') ||
            event.target.closest('.quiz-solver-panel')) {
            return;
        }
        
        // Add a highlight effect
        event.target.style.outline = '2px dashed #8e24aa';
        event.target.style.backgroundColor = 'rgba(142, 36, 170, 0.1)';
    }
    
    handleMouseOut(event) {
        if (!this.isSelectionMode) return;
        
        // Remove the highlight effect
        event.target.style.outline = '';
        event.target.style.backgroundColor = '';
    }
    
    getSelectedElement() {
        return this.selectedElement;
    }

    generateXPath(element) {
        if (!element) return null;
        
        try {
            // Try to generate a unique ID-based XPath first
            if (element.id) {
                return `//*[@id="${element.id}"]`;
            }
            
            // Try to generate a class-based XPath if it has a unique class
            if (element.className && typeof element.className === 'string') {
                const classes = element.className.split(' ').filter(Boolean);
                if (classes.length > 0) {
                    const classXPath = `//*[contains(@class, "${classes[0]}")]`;
                    // Check if this XPath is unique
                    const matchingElements = document.evaluate(
                        classXPath, 
                        document, 
                        null, 
                        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, 
                        null
                    );
                    
                    if (matchingElements.snapshotLength === 1) {
                        return classXPath;
                    }
                }
            }
            
            // Generate a full path if no unique identifier is found
            let path = '';
            let currentElement = element;
            
            while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
                let currentPath = currentElement.tagName.toLowerCase();
                
                // Add index if there are siblings with the same tag
                const siblings = Array.from(currentElement.parentNode.children).filter(
                    child => child.tagName === currentElement.tagName
                );
                
                if (siblings.length > 1) {
                    const index = siblings.indexOf(currentElement) + 1;
                    currentPath += `[${index}]`;
                }
                
                path = path ? `/${currentPath}${path}` : `/${currentPath}`;
                currentElement = currentElement.parentNode;
            }
            
            return path;
        } catch (error) {
            console.error('Error generating XPath:', error);
            return null;
        }
    }
    
    findElementByXPath(xpath) {
        try {
            return document.evaluate(
                xpath, 
                document, 
                null, 
                XPathResult.FIRST_ORDERED_NODE_TYPE, 
                null
            ).singleNodeValue;
        } catch (error) {
            console.error('Error finding element by XPath:', error);
            return null;
        }
    }
    
    async saveElementXPath(element) {
        if (!element) return false;
        
        try {
            const xpath = this.generateXPath(element);
            if (!xpath) return false;
            
            const domain = window.location.hostname;
            
            // Get existing saved elements
            const result = await new Promise(resolve => {
                chrome.storage.sync.get(['savedElements'], result => {
                    resolve(result.savedElements || {});
                });
            });
            
            // Update with new element
            const savedElements = result;
            savedElements[domain] = xpath;
            
            // Save back to storage
            await new Promise(resolve => {
                chrome.storage.sync.set({ savedElements }, () => {
                    resolve();
                });
            });
            
            return true;
        } catch (error) {
            console.error('Error saving element XPath:', error);
            return false;
        }
    }
    
    async getSavedElement() {
        try {
            const domain = window.location.hostname;
            
            // Get saved elements
            const result = await new Promise(resolve => {
                chrome.storage.sync.get(['savedElements'], result => {
                    resolve(result.savedElements || {});
                });
            });
            
            const savedElements = result;
            const xpath = savedElements[domain];
            
            if (!xpath) return null;
            
            return this.findElementByXPath(xpath);
        } catch (error) {
            console.error('Error getting saved element:', error);
            return null;
        }
    }
    
    async hasSavedElement() {
        try {
            const domain = window.location.hostname;
            
            // Get saved elements
            const result = await new Promise(resolve => {
                chrome.storage.sync.get(['savedElements'], result => {
                    resolve(result.savedElements || {});
                });
            });
            
            const savedElements = result;
            return !!savedElements[domain];
        } catch (error) {
            console.error('Error checking for saved element:', error);
            return false;
        }
    }
}