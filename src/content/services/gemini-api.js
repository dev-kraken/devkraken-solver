/**
 * Gemini API service for getting AI answers
 * @author Dev Kraken <soman@devkraken.com>
 */

// Define constants directly
const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const BRANDING = {
    NAME: 'DevKraken',
    TAGLINE: 'Powered by DevKraken',
    COLORS: {
        PRIMARY: '#8e24aa',
        SECONDARY: '#8e24aa',
        SUCCESS: '#4caf50',
        ERROR: '#f44336'
    }
};

/**
 * Fetches an answer from the Gemini API
 * @param {string} question - The question to answer
 * @param {Array<string>} options - Available answer options
 * @param {string} apiKey - Gemini API key
 * @param {string|null} subject - Detected subject area (optional)
 * @returns {Promise<string>} Raw response from Gemini
 */
export async function fetchGeminiResponse(question, options, apiKey, subject = null) {
    if (!apiKey) {
        throw new Error('API key not set');
    }
    
    if (!question) {
        throw new Error('Question not provided');
    }
    
    // Ensure options is an array
    const safeOptions = Array.isArray(options) ? options : [];
    
    // Build the prompt
    const prompt = buildPrompt(question, safeOptions, subject);
    
    try {
        const response = await fetch(`${API_ENDPOINT}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.2,  // Slightly increased for better reasoning
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 1024
                },
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HARASSMENT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_HATE_SPEECH',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    }
                ]
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API error:', errorData);
            throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('No response from Gemini API');
        }
        
        const textResponse = data.candidates[0].content.parts[0].text;
        return textResponse;
    } catch (error) {
        console.error('Error fetching from Gemini API:', error);
        throw error;
    }
}

/**
 * Builds a prompt for the Gemini API
 * @param {string} question - The question to answer
 * @param {Array<string>} options - Available answer options
 * @param {string|null} subject - Detected subject area
 * @returns {string} Formatted prompt
 */
function buildPrompt(question, options, subject) {
    // Check if this is a JavaScript code evaluation question
    const isJavaScriptCode = question.includes('console.log') || 
                            (question.includes('JavaScript') && question.includes('output')) ||
                            question.includes('var ') || 
                            question.includes('let ') || 
                            question.includes('const ') ||
                            question.includes('function(') ||
                            question.includes('() =>');
    
    // Start with a different prompt for code evaluation questions
    let prompt = '';
    
    if (isJavaScriptCode) {
        prompt = `You are a JavaScript code execution engine. Your task is to accurately determine the output of the given JavaScript code. Do not explain the code or provide any commentary - just execute it step by step in your mind and determine the exact output.\n\n`;
        prompt += `IMPORTANT: For JavaScript code evaluation, be extremely careful with:
1. Type coercion (especially with the + operator)
2. Implicit type conversions
3. Operator precedence
4. NaN behavior
5. Truthiness and falsiness of values

SPECIFIC CASES TO WATCH FOR:
- The expression 'b' + 'a' + + 'a' + 'a' evaluates to 'baNaNa' (which becomes 'banana' when lowercased)
- The + operator before a string attempts numeric conversion, resulting in NaN
- NaN when converted to a string becomes 'NaN'
- [] == false is true, but [] === false is false
- null == undefined is true, but null === undefined is false
- typeof NaN is 'number'

QUESTION: ${question}\n\n`;
    } else {
        prompt = `You are an expert quiz-solving AI assistant created by ${BRANDING.NAME}. Your task is to answer the following question with high accuracy and precision. You have access to a vast knowledge base covering all academic subjects, programming languages, and general knowledge.\n\n`;
        
        // Add subject context if available
        if (subject) {
            prompt += `SUBJECT: ${subject}\n\n`;
        }
        
        // Add page context
        const pageTitle = document.title;
        if (pageTitle) {
            prompt += `CONTEXT: This question appears on a page titled "${pageTitle}"\n\n`;
        }
        
        // Add the question with clear formatting
        prompt += `QUESTION: ${question}\n\n`;
    }
    
    // Add options if available with clear formatting
    if (options && options.length > 0) {
        prompt += "OPTIONS:\n";
        options.forEach((option, index) => {
            prompt += `${String.fromCharCode(65 + index)}. ${option}\n`;
        });
        prompt += "\n";
    }
    
    // Add detailed instructions based on question type
    if (isJavaScriptCode) {
        prompt += "INSTRUCTIONS:\n";
        prompt += "1. Mentally execute the JavaScript code step by step.\n";
        prompt += "2. Pay careful attention to JavaScript's type coercion rules.\n";
        prompt += "3. For expressions like 'b' + 'a' + + 'a' + 'a', remember that + 'a' attempts to convert 'a' to a number, resulting in NaN.\n";
        prompt += "4. When NaN is converted to a string and concatenated, it becomes 'NaN'.\n";
        prompt += "5. Identify the exact output that would appear in a JavaScript console.\n";
        prompt += "6. Begin your response with the letter of the correct option (e.g., 'C').\n";
        prompt += "7. Do not provide explanations or show your work - just the letter of the correct answer.\n";
    } else if (options && options.length > 0) {
        // For multiple choice questions (non-code)
        prompt += "INSTRUCTIONS:\n";
        prompt += "1. This is a multiple-choice question. Analyze each option carefully.\n";
        prompt += "2. Consider all possible interpretations of the question.\n";
        prompt += "3. Begin your response with the letter of the correct option (e.g., 'A', 'B', 'C', etc.).\n";
        prompt += "4. After identifying the correct option, briefly explain why it's correct and why others are incorrect.\n";
        prompt += "5. If the question involves calculations, show your work.\n";
        prompt += "6. Be extremely precise with technical terms and definitions.\n";
    } else {
        // For open-ended questions
        prompt += "INSTRUCTIONS:\n";
        prompt += "1. This is an open-ended question. Provide a comprehensive but concise answer.\n";
        prompt += "2. Structure your answer logically with clear explanations.\n";
        prompt += "3. Include relevant facts, definitions, or examples as needed.\n";
        prompt += "4. For technical questions, include code examples if appropriate.\n";
        prompt += "5. Ensure your answer is factually accurate and up-to-date.\n";
    }
    
    // Add specific handling for different question types (if not already handled)
    if (!isJavaScriptCode) {
        if (question.includes("code") || question.includes("function") || question.includes("program")) {
            prompt += "\nThis appears to be a coding question. Pay special attention to syntax, variable scope, and language-specific behaviors.\n";
        }
        
        if (question.includes("calculate") || question.includes("compute") || question.includes("solve")) {
            prompt += "\nThis appears to be a calculation question. Show your work step by step and double-check your arithmetic.\n";
        }
    }
    
    return prompt;
}
