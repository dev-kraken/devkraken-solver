/**
 * String utility functions
 * @author Dev Kraken <soman@devkraken.com>
 */

/**
 * Calculates the similarity between two strings using word matching
 * @param {string} str1 - First string to compare
 * @param {string} str2 - Second string to compare
 * @returns {number} Similarity score between 0-1
 */
export function calculateSimilarity(str1, str2) {
    const words1 = str1.toLowerCase().split(/\W+/).filter(Boolean);
    const words2 = str2.toLowerCase().split(/\W+/).filter(Boolean);
    
    let matchCount = 0;
    for (const word of words1) {
        if (words2.includes(word)) matchCount++;
    }
    
    return matchCount / Math.max(words1.length, words2.length);
}
