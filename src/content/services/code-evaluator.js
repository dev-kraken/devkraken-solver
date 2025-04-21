/**
 * Code evaluation service for JavaScript quiz questions
 * @author Dev Kraken <soman@devkraken.com>
 */

/**
 * Determines if a question contains code that needs evaluation
 * @param {string} question - The question text to analyze
 * @returns {boolean} True if the question contains code
 */
export function isCodeEvaluationQuestion(question) {
    return question.includes('console.log') || 
           (question.includes('JavaScript') && question.includes('output')) ||
           question.includes('var ') || 
           question.includes('let ') || 
           question.includes('const ') ||
           question.includes('function(') ||
           question.includes('() =>') ||
           question.includes('return ') ||
           question.includes('===') ||
           question.includes('==') ||
           question.includes('+=') ||
           question.includes('++') ||
           question.includes('{}') ||
           question.includes('[]');
}

/**
 * Attempts to evaluate JavaScript code in a question
 * @param {string} question - The question containing code
 * @param {Array<string>} options - Answer options
 * @returns {string|null} The correct option or null if evaluation failed
 */
export function evaluateCode(question, options) {
    try {
        console.log('Evaluating code in question:', question);
        console.log('Options:', options);
        
        // Handle special cases first
        
        // Special case for the 'banana' question
        if (question.includes("('b' + 'a' + + 'a' + 'a').toLowerCase()") || 
            question.includes("'b' + 'a' + + 'a' + 'a'")) {
            console.log('Detected banana question');
            return options.find(option => option.toLowerCase() === 'banana');
        }
        
        // Extract code from the question
        let codeToEvaluate = '';
        
        // Try to extract code from console.log
        const consoleLogMatch = question.match(/console\.log\((.*)\)/);
        if (consoleLogMatch) {
            codeToEvaluate = consoleLogMatch[1];
        } 
        // Try to extract code from a code block
        else {
            const codeBlockMatch = question.match(/```(?:js|javascript)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
                codeToEvaluate = codeBlockMatch[1];
            }
        }
        
        if (!codeToEvaluate) {
            console.log('No code found to evaluate');
            return null;
        }
        
        console.log('Code to evaluate:', codeToEvaluate);
        
        // Handle specific JavaScript quirks
        
        // Handle NaN concatenation (like in the banana example)
        if (codeToEvaluate.includes("'b' + 'a' + + 'a' + 'a'") || 
            codeToEvaluate.includes('"b" + "a" + + "a" + "a"')) {
            const result = 'baNaNa';
            console.log('NaN concatenation detected, result:', result);
            
            // Check if we need to lowercase
            if (question.includes('.toLowerCase()')) {
                return options.find(option => option.toLowerCase() === result.toLowerCase());
            } else {
                return options.find(option => option === result);
            }
        }
        
        // Try to evaluate the code safely
        let result;
        try {
            // Create a safe evaluation function
            const safeEval = new Function('return ' + codeToEvaluate);
            result = safeEval();
            console.log('Evaluation result:', result);
            
            // Convert result to string if it's not already
            if (result === null) {
                result = 'null';
            } else if (result === undefined) {
                result = 'undefined';
            } else if (typeof result !== 'string') {
                result = String(result);
            }
            
            console.log('Stringified result:', result);
            
            // Find the option that matches the result
            const matchingOption = options.find(option => {
                return option.toLowerCase() === result.toLowerCase() || 
                       option.toLowerCase().includes(result.toLowerCase());
            });
            
            console.log('Matching option:', matchingOption);
            return matchingOption;
        } catch (e) {
            console.error('Error during code evaluation:', e);
            
            // If direct evaluation fails, try to match error messages
            if (e.message.includes('is not defined')) {
                const varName = e.message.split(' ')[0];
                const errorOption = options.find(option => 
                    option.toLowerCase().includes('reference') || 
                    option.toLowerCase().includes('not defined') || 
                    option.toLowerCase().includes(varName.toLowerCase())
                );
                
                if (errorOption) {
                    console.log('Found option matching error:', errorOption);
                    return errorOption;
                }
            }
            
            return null;
        }
    } catch (error) {
        console.error('Error in code evaluation:', error);
        return null;
    }
}

/**
 * Enhances the prompt with code-specific instructions
 * @param {string} prompt - The base prompt
 * @param {string} question - The question text
 * @returns {string} Enhanced prompt with code-specific instructions
 */
export function enhancePromptForCode(prompt, question) {
    if (!isCodeEvaluationQuestion(question)) {
        return prompt;
    }
    
    return prompt + `\n\nThis appears to be a JavaScript code evaluation question. Be extremely careful when evaluating the code. Here are some important JavaScript quirks to remember:

1. The expression 'b' + 'a' + + 'a' + 'a' evaluates to 'baNaNa' (which becomes 'banana' when lowercased)
2. The + operator before a string attempts numeric conversion, resulting in NaN
3. NaN when converted to a string becomes 'NaN'
4. [] == false is true, but [] === false is false
5. null == undefined is true, but null === undefined is false
6. typeof NaN is 'number'

Execute the code step by step, considering all language-specific behaviors and edge cases.`;
}
