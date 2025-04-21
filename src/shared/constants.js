/**
 * Shared constants for the Quiz Solver extension
 * @author Dev Kraken <soman@devkraken.com>
 */

/**
 * CSS classes used throughout the extension
 */
export const CLASSES = {
    CORRECT: 'quiz-solver-correct',
    
    // Common question selectors
    QUESTION_SELECTORS: [
        '.question', 
        '.quiz-question', 
        '.question-text',
        '[data-testid="question"]',
        '[role="heading"]',
        'h3',
        'h4',
        '.stem',
        '.problem-statement',
        '.assessment-item',
        '[aria-label*="question"]',
        '.prompt'
    ],
    
    // Common option selectors
    OPTION_SELECTORS: [
        '.question__single-answer',
        '.option',
        '.answer-option',
        'input[type="radio"] + label',
        'input[type="checkbox"] + label',
        'li.answer',
        '[role="radio"]',
        '[role="checkbox"]',
        '.choice',
        '.mcq-option',
        '.assessment-option',
        '.response-option',
        '[data-testid*="option"]',
        '[data-testid*="choice"]'
    ]
};

/**
 * Storage keys used for Chrome storage
 */
export const STORAGE_KEYS = {
    API_KEY: 'geminiApiKey',
    AUTO_DETECT: 'autoDetectEnabled',
    DETECTION_SENSITIVITY: 'detectionSensitivity',
    DETECTION_HISTORY: 'detectionHistory',
    USER_PREFERENCES: 'userPreferences',
    SAVED_ELEMENTS: 'savedElements',
    LAST_USED_XPATH: 'lastUsedXPath'
};

/**
 * Gemini API endpoint for content generation
 */
export const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Message types for communication between extension components
 */
export const MESSAGE_TYPES = {
    VALIDATE_API_KEY: "VALIDATE_API_KEY",
    STORAGE_UPDATE: "STORAGE_UPDATE",
    SOLVE_SELECTION: "SOLVE_SELECTION",
    AUTO_DETECT: "AUTO_DETECT",
    TOGGLE_AUTO_DETECT: "TOGGLE_AUTO_DETECT",
    ADJUST_SENSITIVITY: "ADJUST_SENSITIVITY",
    SAVE_ELEMENT: "SAVE_ELEMENT",
    USE_SAVED_ELEMENT: "USE_SAVED_ELEMENT"
};

/**
 * Regular expressions for detecting question patterns
 */
export const QUESTION_PATTERNS = [
    /\?$/,
    /^(what|which|who|where|when|why|how)/i,
    /^choose the (correct|right|best)/i,
    /^select the (correct|right|best)/i,
    /^identify the/i,
    /correct (answer|option|choice) is/i,
    /^(true or false)/i,
    /^(match|arrange|order)/i,
    /^(solve|calculate|compute)/i,
    /^(explain|describe|discuss)/i
];

/**
 * Site-specific selectors for common quiz websites
 */
export const SITE_SPECIFIC_SELECTORS = {
    'quizlet.com': {
        QUESTION: '.SetPageTermText-content',
        OPTION: '.SetPageTermText-definition'
    },
    'canvas.instructure.com': {
        QUESTION: '.question_text',
        OPTION: '.answer_text'
    },
    'kahoot.com': {
        QUESTION: '.question-title',
        OPTION: '.answer'
    },
    'quizizz.com': {
        QUESTION: '.question-text',
        OPTION: '.option-text'
    },
    'coursera.org': {
        QUESTION: '.rc-FormPartsQuestion',
        OPTION: '.rc-Option'
    },
    'edx.org': {
        QUESTION: '.problem-header',
        OPTION: '.field-label'
    },
    'udemy.com': {
        QUESTION: '.mc-quiz-question',
        OPTION: '.mc-quiz-answer'
    },
    'blackboard.com': {
        QUESTION: '.vtbegenerated',
        OPTION: '.multiple-choice'
    }
};

/**
 * Patterns for detecting the academic subject of a question
 */
export const SUBJECT_PATTERNS = {
    MATH: [
        /equation|formula|calculate|solve for|graph|math/i,
        /algebra|geometry|calculus|trigonometry/i,
        /number|digit|decimal|fraction|percent/i
    ],
    SCIENCE: [
        /biology|chemistry|physics|science/i,
        /molecule|atom|cell|organism|energy/i,
        /experiment|hypothesis|theory|laboratory/i
    ],
    HISTORY: [
        /history|century|year|era|period/i,
        /war|revolution|civilization|empire|president/i,
        /ancient|medieval|modern|world/i
    ],
    LITERATURE: [
        /literature|novel|poem|author|character/i,
        /book|story|writer|poet|playwright/i,
        /theme|plot|setting|protagonist/i
    ],
    COMPUTER_SCIENCE: [
        /computer|algorithm|program|code|software/i,
        /function|variable|class|object|method/i,
        /database|network|internet|web/i
    ]
};

/**
 * Time constants for various operations
 */
export const TIME_CONSTANTS = {
    DEBOUNCE_DELAY: 1000,
    ANIMATION_DELAY: 300,
    NOTIFICATION_DURATION: 5000
};

/**
 * DevKraken branding information
 */
export const BRANDING = {
    NAME: "DevKraken",
    TAGLINE: "Powered by DevKraken",
    WEBSITE: "https://devkraken.com",
    COPYRIGHT: `© ${new Date().getFullYear()} DevKraken. All rights reserved.`,
    DEVELOPER: {
        NAME: "Dev Kraken",
        EMAIL: "soman@devkraken.com",
        GITHUB: "https://github.com/dev-kraken",
        PROJECT_URL: "https://github.com/dev-kraken/devkraken-solver"
    },
    COLORS: {
        PRIMARY: "#8e24aa",
        SECONDARY: "#1e88e5",
        SUCCESS: "#43a047",
        ERROR: "#e53935",
        WARNING: "#fb8c00"
    }
};
