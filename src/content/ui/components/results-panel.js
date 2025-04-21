/**
 * Results panel component
 * @author Dev Kraken <soman@devkraken.com>
 */

// Don't import constants, define them directly
// import { BRANDING } from '../../../shared/constants.js';

// Define colors directly
const COLORS = {
    PRIMARY: '#8e24aa',
    SUCCESS: '#4caf50'
};

/**
 * Creates and manages the results panel
 */
export class ResultsPanel {
    constructor() {
        this.element = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isDragging = false;
    }
    
    /**
     * Creates and shows the results panel
     * @param {string} question - Question text
     * @param {string} answer - Answer text
     */
    show(question, answer) {
        // Remove existing panel if any
        if (this.element) this.element.remove();
        
        this.element = document.createElement('div');
        this.element.className = 'quiz-solver-panel';
        this.element.style.position = 'fixed';
        this.element.style.top = '100px';
        this.element.style.right = '20px';
        this.element.style.width = '300px';
        this.element.style.backgroundColor = 'white';
        this.element.style.borderRadius = '8px';
        this.element.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        this.element.style.zIndex = '9998';
        this.element.style.overflow = 'hidden';
        this.element.style.fontFamily = 'Arial, sans-serif';
        this.element.style.fontSize = '14px';
        this.element.style.border = '1px solid #e0e0e0';
        
        // Create header with drag handle
        const header = this.createHeader();
        
        // Create content area
        const content = this.createContent(question, answer);
        
        this.element.appendChild(header);
        this.element.appendChild(content);
        document.body.appendChild(this.element);
    }
    
    /**
     * Creates the panel header
     * @returns {HTMLElement} Header element
     */
    createHeader() {
        const header = document.createElement('div');
        header.className = 'quiz-solver-panel-header';
        header.style.padding = '10px 15px';
        header.style.backgroundColor = COLORS.PRIMARY;
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
        brandingSpan.textContent = 'Powered by DevKraken';
        header.appendChild(brandingSpan);
        
        // Add event listeners for dragging
        header.addEventListener('mousedown', this.startDragging.bind(this));
        document.addEventListener('mouseup', this.stopDragging.bind(this));
        document.addEventListener('mousemove', this.drag.bind(this));
        
        // Close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.color = 'white';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.padding = '0 5px';
        closeButton.onclick = () => this.remove();
        
        header.appendChild(closeButton);
        return header;
    }
    
    /**
     * Creates the panel content
     * @param {string} question - Question text
     * @param {string} answer - Answer text
     * @returns {HTMLElement} Content element
     */
    createContent(question, answer) {
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
        answerText.style.color = COLORS.PRIMARY;
        answerText.style.fontWeight = 'bold';
        answerText.style.backgroundColor = `rgba(142, 36, 170, 0.1)`;
        answerText.style.padding = '10px 12px';
        answerText.style.borderRadius = '4px';
        answerText.style.border = `1px solid rgba(142, 36, 170, 0.3)`;
        
        answerSection.appendChild(answerLabel);
        answerSection.appendChild(answerText);
        content.appendChild(answerSection);
        
        // Add confidence indicator
        const confidenceText = document.createElement('div');
        confidenceText.textContent = '✓ Based on context analysis';
        confidenceText.style.marginTop = '15px';
        confidenceText.style.color = COLORS.SUCCESS;
        confidenceText.style.fontSize = '12px';
        confidenceText.style.textAlign = 'right';
        content.appendChild(confidenceText);
        
        return content;
    }
    
    /**
     * Converts hex color to RGB
     * @param {string} hex - Hex color code
     * @returns {string} RGB values as "r, g, b"
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return '142, 36, 170'; // Fallback purple
        
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        
        return `${r}, ${g}, ${b}`;
    }
    
    /**
     * Starts dragging the panel
     * @param {MouseEvent} e - Mouse event
     */
    startDragging(e) {
        if (e.target.className === 'quiz-solver-panel-header') {
            this.isDragging = true;
            const rect = this.element.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            this.element.style.transition = 'none';
        }
    }
    
    /**
     * Stops dragging the panel
     */
    stopDragging() {
        this.isDragging = false;
        if (this.element) {
            this.element.style.transition = 'box-shadow 0.3s ease';
        }
    }
    
    /**
     * Handles dragging movement
     * @param {MouseEvent} e - Mouse event
     */
    drag(e) {
        if (!this.isDragging || !this.element) return;
        
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        
        // Keep panel within viewport bounds
        const maxX = window.innerWidth - this.element.offsetWidth;
        const maxY = window.innerHeight - this.element.offsetHeight;
        
        const boundedX = Math.max(0, Math.min(x, maxX));
        const boundedY = Math.max(0, Math.min(y, maxY));
        
        this.element.style.left = `${boundedX}px`;
        this.element.style.top = `${boundedY}px`;
        this.element.style.right = 'auto';
    }
    
    /**
     * Removes the panel from the page
     */
    remove() {
        if (this.element) {
            this.element.remove();
            this.element = null;
            
            // Clean up event listeners
            document.removeEventListener('mouseup', this.stopDragging);
            document.removeEventListener('mousemove', this.drag);
        }
    }
}
