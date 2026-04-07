# Benglishify Chrome Extension

This extension allows you to translate Benglish (Bengali in English letters) on any webpage.

## Features
- **Popup Translator**: Quick translation by clicking the extension icon.
- **Context Menu**: Select text on any page, right-click, and choose "Translate with Benglishify".
- **Tooltip**: Hover over Benglish text to see the English translation (configurable in settings).
- **Auto-Translate**: Automatically translates detected Benglish text on pages (configurable in settings).
- **Voice Input**: Use your microphone to speak Benglish and get an English translation.

## How to Load the Extension in Chrome

1.  **Download the Code**: Ensure you have the `extension` folder from this project.
2.  **Open Chrome Extensions**:
    -   Open Google Chrome.
    -   Go to `chrome://extensions/` by typing it in the address bar.
3.  **Enable Developer Mode**:
    -   In the top right corner, toggle the **Developer mode** switch to ON.
4.  **Load Unpacked Extension**:
    -   Click the **Load unpacked** button in the top left.
    -   Navigate to and select the `extension` folder in your project directory.
5.  **Pin the Extension**:
    -   Click the puzzle piece icon (Extensions) in the Chrome toolbar.
    -   Find **Benglishify** and click the pin icon to keep it visible.

## Configuration
-   The extension connects to the Benglishify API hosted at your App URL.
-   Ensure your backend server is running for the extension to function.

## Note on Icons
The extension uses placeholder icons. For a production-ready look, please replace the files in the `extension/icons/` folder with your own PNG icons (16x16, 48x48, and 128x128 pixels).
