/**
 * DOM manipulation utilities
 * @author Dev Kraken <soman@devkraken.com>
 */

/**
 * Finds a label associated with an input element
 * @param {HTMLElement} input - Input element to find the label for
 * @returns {HTMLElement|null} Associated label or null if not found
 */
export function findAssociatedLabel(input) {
    // Try by 'for' attribute
    if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) return label;
    }
    
    // Try by parent-child relationship
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

/**
 * Generates an XPath for an element
 * @param {Element} element - Element to generate XPath for
 * @returns {string} XPath string or empty string on failure
 */
export function generateXPath(element) {
    try {
        if (!element) return '';
        
        // Use the native document.evaluate for efficiency
        const parts = [];
        let current = element;
        
        while (current && current.nodeType === Node.ELEMENT_NODE) {
            // Get all siblings of the same type
            let siblings = Array.from(current.parentNode.children).filter(
                node => node.tagName === current.tagName
            );
            
            // If there are multiple siblings, add index
            if (siblings.length > 1) {
                // Find the index of the current element
                const index = siblings.indexOf(current) + 1;
                parts.unshift(`${current.tagName.toLowerCase()}[${index}]`);
            } else {
                parts.unshift(current.tagName.toLowerCase());
            }
            
            // Move up to parent
            current = current.parentNode;
            
            // Stop at document body
            if (current === document.body) {
                parts.unshift('body');
                break;
            }
        }
        
        return '//' + parts.join('/');
    } catch (error) {
        console.error('Error generating XPath:', error);
        return '';
    }
}

/**
 * Gets an element by XPath
 * @param {string} xpath - XPath to evaluate
 * @returns {Element|null} Element found or null
 */
export function getElementByXPath(xpath) {
    try {
        const result = document.evaluate(
            xpath, 
            document, 
            null, 
            XPathResult.FIRST_ORDERED_NODE_TYPE, 
            null
        );
        return result.singleNodeValue;
    } catch (error) {
        console.error('Error evaluating XPath:', error);
        return null;
    }
}

/**
 * Gets all text nodes within an element
 * @param {Element} element - Element to search within
 * @returns {Array<Node>} Array of text nodes
 */
export function getAllTextNodes(element) {
    const textNodes = [];
    
    try {
        // Function to recursively collect text nodes
        function collectTextNodes(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                if (node.textContent.trim()) {
                    textNodes.push(node);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                for (const child of node.childNodes) {
                    collectTextNodes(child);
                }
            }
        }
        
        // Start collection
        collectTextNodes(element);
    } catch (error) {
        console.error('Error getting text nodes:', error);
    }
    
    return textNodes;
}
