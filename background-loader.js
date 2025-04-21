// Background script loader
// This loads the actual module-based background script

console.log('Background loader initializing');

// Set up error handling
try {
    // Use importScripts instead of import() for service workers
    importScripts('./src/background/index.js');
    console.log('Background script loaded successfully');
} catch (error) {
    console.error('Error loading background script:', error);
}
