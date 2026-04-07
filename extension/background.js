const API_URL = 'https://ais-dev-tnccjdrj3s2vquwn4fxgph-477798320912.europe-west2.run.app/api/translate';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translate-benglish",
    title: "Translate with Benglishify",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translate-benglish") {
    const selectedText = info.selectionText;
    
    // Send message to content script to show tooltip or modal
    chrome.tabs.sendMessage(tab.id, {
      action: "show-translation",
      text: selectedText
    });
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    handleTranslation(request.text, request.direction)
      .then(translatedText => sendResponse({ translatedText }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep message channel open for async response
  }
});

async function handleTranslation(text, direction = 'benglish-to-english') {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, direction }),
    });

    if (!response.ok) {
      throw new Error('Translation failed');
    }

    const data = await response.json();
    return data.translatedText;
  } catch (error) {
    console.error('Background translation error:', error);
    throw error;
  }
}
