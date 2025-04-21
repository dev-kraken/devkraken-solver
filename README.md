# Quiz Solver with Gemini

A Chrome extension that uses Google's Gemini AI to help solve quizzes and answer questions on various websites.

## Features

- **Manual Element Selection**: Click the "Solve with Gemini" button and then select the container element that has both the question and answer options.
- **Auto-Detection**: Automatically detects quiz questions and answer options on supported websites.
- **Context Menu Integration**: Right-click on selected text to solve a specific question.
- **Answer Highlighting**: Highlights the correct answer on the page when possible.
- **Customizable Settings**: Adjust detection sensitivity and other preferences.
- **Quiz History**: Keeps track of previously solved questions and answers.
- **Website Memory**: Remembers selected elements for each website for faster future use.

## How to Use

### Manual Element Selection

1. Navigate to a webpage with a quiz or question.
2. Click the "Solve with Gemini" button in the bottom-right corner of the page.
3. The cursor will change, and you'll enter selection mode.
4. Click on the element that contains both the question and answer options.
5. The extension will analyze the selected element, extract the question and options, and provide the answer.

### Auto-Detection

1. Navigate to a webpage with a quiz or question.
2. The extension will automatically try to detect questions and answer options.
3. Click the "Solve with Gemini" button to get the answer.

### Context Menu

1. Select the text of a question on a webpage.
2. Right-click and choose "Solve with Gemini AI" from the context menu.
3. The extension will try to find answer options on the page and provide the answer.

## Setup

1. Install the extension from the Chrome Web Store.
2. Click on the extension icon in your browser toolbar.
3. Enter your Gemini API key in the popup and click "Save Key".
4. Navigate to a webpage with a quiz and use one of the methods above to solve it.

## Requirements

- Google Chrome browser (or Chromium-based browsers)
- Gemini API key

## Privacy

This extension processes quiz questions and answers locally in your browser and only sends the necessary information to the Gemini API for analysis. Your API key and quiz history are stored locally on your device.

## Developer Information

- **Name**: Dev Kraken
- **Email**: soman@devkraken.com
- **GitHub**: [https://github.com/dev-kraken](https://github.com/dev-kraken)
- **Project Repository**: [https://github.com/dev-kraken/devkraken-solver](https://github.com/dev-kraken/devkraken-solver)

## Support

For issues, feature requests, or questions, please open an issue on the GitHub repository.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
