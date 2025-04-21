/**
 * Answer extraction service for quiz answers
 * @author Dev Kraken <soman@devkraken.com>
 */

/**
 * Calculates string similarity using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1)
 */
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    // Convert to lowercase for case-insensitive comparison
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Calculate Levenshtein distance
    const track = Array(s2.length + 1).fill(null).map(() => 
        Array(s1.length + 1).fill(null));
    
    for (let i = 0; i <= s1.length; i += 1) {
        track[0][i] = i;
    }
    
    for (let j = 0; j <= s2.length; j += 1) {
        track[j][0] = j;
    }
    
    for (let j = 1; j <= s2.length; j += 1) {
        for (let i = 1; i <= s1.length; i += 1) {
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1, // deletion
                track[j - 1][i] + 1, // insertion
                track[j - 1][i - 1] + indicator, // substitution
            );
        }
    }
    
    // Calculate similarity as 1 - (distance / max length)
    const distance = track[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - (distance / maxLength);
}

/**
 * Extracts the answer from AI response text
 * @param {string} answerText - Raw text from AI response
 * @param {Array<string>} options - Available answer options
 * @returns {string|null} The best matching answer option
 */
export function extractAnswer(answerText, options) {
    if (!answerText || !options || options.length === 0) {
        return null;
    }
    
    try {
        // First, try to extract a letter answer (A, B, C, etc.)
        const letterAnswer = extractLetterAnswer(answerText, options);
        if (letterAnswer) {
            return letterAnswer;
        }
        
        // Try to match the answer text to one of the options
        const directMatch = findDirectMatch(answerText, options);
        if (directMatch) {
            return directMatch;
        }
        
        // If no match found, try to find the best matching option
        const bestMatch = findBestMatch(answerText, options);
        return bestMatch;
    } catch (error) {
        // Use globalThis.console to avoid 'console' is not defined error
        globalThis.console.error('Error extracting answer:', error);
        return null;
    }
}

/**
 * Tries to extract a letter-based answer (A, B, C, etc.)
 * @param {string} answerText - Text to extract from
 * @param {Array<string>} options - Available options
 * @returns {string|null} Matched option or null
 */
function extractLetterAnswer(answerText, options) {
    // First, check if the answer starts with a letter and a period/colon
    // This is the most common format for Gemini's answers
    const firstLineMatch = answerText.match(/^([A-Z])[.:\s]/);
    if (firstLineMatch) {
        const letter = firstLineMatch[1];
        const letterIndex = letter.charCodeAt(0) - 65; // Convert A->0, B->1, etc.
        
        if (letterIndex >= 0 && letterIndex < options.length) {
            return options[letterIndex];
        }
    }
    
    // Try regex pattern for letter answers anywhere in the text
    const letterRegex = /(?:^|\n|\s)([A-Z])(?:\.|:|\s|$)/m;
    const letterMatch = answerText.match(letterRegex);
    
    if (letterMatch) {
        const letter = letterMatch[1];
        const letterIndex = letter.charCodeAt(0) - 65; // Convert A->0, B->1, etc.
        
        if (letterIndex >= 0 && letterIndex < options.length) {
            return options[letterIndex];
        }
    }
    
    // Try to find phrases like "The answer is A" or "Option B is correct"
    const answerPhraseRegex = /(?:answer|option|choice|correct)(?:\s+is)?(?:\s+|\s*:\s*)([A-Z])(?:\.|,|\s|$)/i;
    const phraseMatch = answerText.match(answerPhraseRegex);
    
    if (phraseMatch) {
        const letter = phraseMatch[1].toUpperCase();
        const letterIndex = letter.charCodeAt(0) - 65;
        
        if (letterIndex >= 0 && letterIndex < options.length) {
            return options[letterIndex];
        }
    }
    
    // Look for sentences that start with "A.", "B.", etc.
    const sentenceRegex = /\b([A-Z])\.\s+([^.]+)/g;
    let match;
    let highestConfidence = 0;
    let mostLikelyOption = null;
    
    while ((match = sentenceRegex.exec(answerText)) !== null) {
        const letter = match[1];
        const explanation = match[2];
        const letterIndex = letter.charCodeAt(0) - 65;
        
        // Check if this is a valid option
        if (letterIndex >= 0 && letterIndex < options.length) {
            // Look for positive words in the explanation
            const positiveWords = ['correct', 'right', 'accurate', 'true', 'yes', 'indeed', 'proper'];
            let confidence = 0;
            
            for (const word of positiveWords) {
                if (explanation.toLowerCase().includes(word)) {
                    confidence += 0.2; // Increase confidence for each positive word
                }
            }
            
            // If this has higher confidence than previous matches, use it
            if (confidence > highestConfidence) {
                highestConfidence = confidence;
                mostLikelyOption = options[letterIndex];
            }
        }
    }
    
    if (mostLikelyOption && highestConfidence > 0) {
        return mostLikelyOption;
    }
    
    return null;
}

/**
 * Finds a direct match between the answer text and options
 * @param {string} answerText - Text to match
 * @param {Array<string>} options - Available options
 * @returns {string|null} Matched option or null
 */
function findDirectMatch(answerText, options) {
    // Check if any option is contained in the answer text
    for (const option of options) {
        if (answerText.includes(option)) {
            // Make sure this isn't just listing all options
            const optionCount = options.filter(opt => answerText.includes(opt)).length;
            if (optionCount < options.length / 2) {
                return option;
            }
        }
    }
    
    // Split answer into paragraphs and check each one
    const paragraphs = answerText.split('\n\n');
    for (const paragraph of paragraphs) {
        // Skip short paragraphs or ones that look like they're just listing options
        if (paragraph.length < 20 || paragraph.includes('Option') || paragraph.includes('option')) {
            continue;
        }
        
        // Check if paragraph contains exactly one option
        const matchingOptions = options.filter(opt => paragraph.includes(opt));
        if (matchingOptions.length === 1) {
            return matchingOptions[0];
        }
    }
    
    return null;
}

/**
 * Finds the best matching option based on text similarity
 * @param {string} answerText - Text to match
 * @param {Array<string>} options - Available options
 * @returns {string} Best matching option
 */
function findBestMatch(answerText, options) {
    let bestOption = options[0];
    let bestScore = 0;
    
    // Try to extract key sentences that might contain the answer
    const sentences = answerText.split(/[.!?][\s\n]+/);
    
    // First, look for sentences with positive indicators
    const positiveIndicators = ['correct', 'right', 'accurate', 'true', 'answer'];
    for (const sentence of sentences) {
        if (positiveIndicators.some(indicator => sentence.toLowerCase().includes(indicator))) {
            // This sentence likely contains the answer
            for (const option of options) {
                const score = calculateSimilarity(sentence, option);
                if (score > bestScore) {
                    bestScore = score;
                    bestOption = option;
                }
            }
            
            // If we found a good match, return it
            if (bestScore > 0.6) {
                return bestOption;
            }
        }
    }
    
    // If no good match found in positive sentences, check the whole text
    for (const option of options) {
        const score = calculateSimilarity(answerText, option);
        if (score > bestScore) {
            bestScore = score;
            bestOption = option;
        }
    }
    
    return bestOption;
}
