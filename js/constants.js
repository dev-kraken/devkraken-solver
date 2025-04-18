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
        // Additional question selectors for better coverage
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
        // Additional option selectors for better coverage
        '.choice',
        '.mcq-option',
        '.assessment-option',
        '.response-option',
        '[data-testid*="option"]',
        '[data-testid*="choice"]'
    ]
};

export const STORAGE_KEYS = {
    API_KEY: 'geminiApiKey',
    AUTO_DETECT: 'autoDetectEnabled',
    DETECTION_SENSITIVITY: 'detectionSensitivity',
    DETECTION_HISTORY: 'detectionHistory',
    USER_PREFERENCES: 'userPreferences'
};

export const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export const MESSAGE_TYPES = {
    VALIDATE_API_KEY: "VALIDATE_API_KEY",
    STORAGE_UPDATE: "STORAGE_UPDATE",
    SOLVE_SELECTION: "SOLVE_SELECTION",
    AUTO_DETECT: "AUTO_DETECT",
    TOGGLE_AUTO_DETECT: "TOGGLE_AUTO_DETECT",
    ADJUST_SENSITIVITY: "ADJUST_SENSITIVITY"
};

// Question detection patterns - expanded for better coverage
export const QUESTION_PATTERNS = [
    /\?$/,                                // Ends with question mark
    /^(what|which|who|where|when|why|how)/i, // Starts with question word
    /^choose the (correct|right|best)/i,  // Common quiz phrases
    /^select the (correct|right|best)/i,
    /^identify the/i,
    /correct (answer|option|choice) is/i, // Additional patterns
    /^(true or false)/i,
    /^(match|arrange|order)/i,
    /^(solve|calculate|compute)/i,
    /^(explain|describe|discuss)/i
];

// Common quiz websites and their selectors - expanded with more sites
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

// Academic subjects for better context-aware answering
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

// Time-related helper constants
export const TIME_CONSTANTS = {
    DEBOUNCE_DELAY: 1000,
    ANIMATION_DELAY: 300,
    NOTIFICATION_DURATION: 5000
};