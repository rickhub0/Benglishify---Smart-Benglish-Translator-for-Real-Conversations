let settings = {
  autoTranslate: false,
  tooltipEnabled: true,
  languageMode: 'benglish-to-english'
};

// Load settings and initialize
chrome.storage.local.get(['settings'], (result) => {
  if (result.settings) {
    settings = { ...settings, ...result.settings };
  }
  
  // Run auto-translate if enabled
  if (settings.autoTranslate) {
    // Wait for DOM to be ready
    if (document.readyState === 'complete') {
      autoTranslatePage();
    } else {
      window.addEventListener('load', autoTranslatePage);
    }
  }
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "show-translation") {
    showTooltip(request.text);
  }
});

// Tooltip logic
let tooltipElement = null;

function createTooltip() {
  if (tooltipElement) return;
  
  tooltipElement = document.createElement('div');
  tooltipElement.id = 'benglishify-tooltip';
  tooltipElement.style.position = 'absolute';
  tooltipElement.style.zIndex = '999999';
  tooltipElement.style.padding = '10px';
  tooltipElement.style.background = '#ffffff';
  tooltipElement.style.color = '#1a1a1a';
  tooltipElement.style.border = '1px solid #e1e1e1';
  tooltipElement.style.borderRadius = '8px';
  tooltipElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  tooltipElement.style.fontSize = '14px';
  tooltipElement.style.maxWidth = '300px';
  tooltipElement.style.display = 'none';
  tooltipElement.style.fontFamily = 'Inter, -apple-system, sans-serif';
  
  document.body.appendChild(tooltipElement);
}

async function showTooltip(text, x, y, forcedDirection = null) {
  createTooltip();
  
  tooltipElement.innerHTML = '<div class="b-loading">✨ Translating...</div>';
  tooltipElement.style.display = 'block';
  
  if (x && y) {
    tooltipElement.style.left = `${x + 10}px`;
    tooltipElement.style.top = `${y + 10}px`;
    tooltipElement.style.transform = 'none';
  } else {
    // Center of screen if no coordinates
    tooltipElement.style.left = '50%';
    tooltipElement.style.top = '50%';
    tooltipElement.style.transform = 'translate(-50%, -50%)';
  }

  try {
    const direction = forcedDirection || settings.languageMode;
    const response = await chrome.runtime.sendMessage({
      action: "translate",
      text: text,
      direction: direction
    });

    if (response.error) {
      throw new Error(response.error);
    }

    tooltipElement.innerHTML = `
      <div style="font-size: 11px; color: #666; margin-bottom: 4px; display: flex; justify-content: space-between;">
        <span>Benglishify Translation</span>
        <span id="b-close" style="cursor: pointer;">✕</span>
      </div>
      <div style="font-weight: 500;">${response.translatedText}</div>
    `;
    
    document.getElementById('b-close').addEventListener('click', () => {
      tooltipElement.style.display = 'none';
    });

  } catch (error) {
    tooltipElement.innerHTML = `<div style="color: #f44336;">Error: ${error.message}</div>`;
    setTimeout(() => {
      tooltipElement.style.display = 'none';
    }, 3000);
  }
}

function showTranslationOption(text, x, y, detectedLang) {
  createTooltip();
  tooltipElement.style.display = 'block';
  tooltipElement.style.left = `${x + 10}px`;
  tooltipElement.style.top = `${y + 10}px`;
  tooltipElement.style.transform = 'none';

  if (detectedLang === 'english') {
    tooltipElement.innerHTML = `
      <div style="font-size: 11px; color: #666; margin-bottom: 8px; display: flex; justify-content: space-between;">
        <span>English Detected</span>
        <span id="b-close-opt" style="cursor: pointer;">✕</span>
      </div>
      <button id="b-translate-btn" style="background: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; width: 100%; display: flex; items-center; justify-content: center; gap: 6px;">
        <span>✨</span> Translate to Benglish
      </button>
    `;
    
    document.getElementById('b-close-opt').addEventListener('click', (e) => {
      e.stopPropagation();
      tooltipElement.style.display = 'none';
    });

    document.getElementById('b-translate-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      showTooltip(text, x, y, 'english-to-benglish');
    });
  }
}

// Language detection heuristic
const benglishKeywords = [
  'ami', 'tumi', 'kobe', 'jabo', 'kore', 'hobe', 'khabo', 'bhalo', 'shob', 'koto', 'ekhon', 'pore', 'dekha', 'korbo', 
  'kemon', 'achho', 'ki', 'na', 'hoyeche', 'bolte', 'shunthe', 'dekhte', 'amader', 'tomader', 'shathe', 'kotha', 'bolbo',
  'ashbo', 'khub', 'ekta', 'onek', 'bujhte', 'parchi', 'janina', 'thako', 'eikhane', 'oikhane'
];

const englishKeywords = ['the', 'and', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'will', 'would', 'should', 'could', 'that', 'this', 'those', 'these', 'with', 'from'];

function detectLanguage(text) {
  const result = { isBenglish: false, isEnglish: false, isBengali: false };
  if (!text || text.length < 2) return result;

  // 1. Check for Bengali script directly
  if (/[\u0980-\u09FF]/.test(text)) {
    result.isBengali = true;
    result.isBenglish = true;
    return result;
  }

  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return result;

  let benglishScore = 0;
  
  // Keyword matching (Strong indicator)
  const matchCount = words.filter(word => benglishKeywords.includes(word)).length;
  benglishScore += matchCount * 2.5;
  
  // Phonetic patterns
  const phoneticPattern = /(bh|dh|kh|gh|th|ph|ch|jh|sh|aa|ee|oo)/gi;
  const phoneticMatches = (text.match(phoneticPattern) || []).length;
  benglishScore += phoneticMatches * 0.4;
  
  // Common endings
  const endingsPattern = /(o|e|i|u)\b/gi;
  const endingMatches = (text.match(endingsPattern) || []).length;
  benglishScore += endingMatches * 0.2;

  const density = benglishScore / words.length;
  
  if (benglishScore >= 4 || (words.length > 4 && density > 1.2)) {
    result.isBenglish = true;
    return result;
  }

  // English detection
  const englishMatchCount = words.filter(word => englishKeywords.includes(word)).length;
  if (englishMatchCount > 0 || words.length > 5) {
    result.isEnglish = true;
  }

  return result;
}

// Keep for backward compatibility with auto-translate logic
function looksLikeBenglish(text) {
  return detectLanguage(text).isBenglish;
}

// Caching logic for persistent translations
async function getCachedTranslation(text) {
  const result = await chrome.storage.local.get(['translationCache']);
  const cache = result.translationCache || {};
  return cache[text];
}

async function saveToCache(original, translated) {
  const result = await chrome.storage.local.get(['translationCache']);
  const cache = result.translationCache || {};
  cache[original] = translated;
  
  // Limit cache size to 500 entries to avoid storage bloat
  const keys = Object.keys(cache);
  if (keys.length > 500) {
    delete cache[keys[0]];
  }
  
  await chrome.storage.local.set({ translationCache: cache });
}

function applyTranslation(node, translatedText) {
  if (!node.parentNode) return;
  
  const span = document.createElement('span');
  span.setAttribute('data-benglish-translated', 'true');
  span.setAttribute('title', 'Original: ' + node.nodeValue);
  span.className = 'benglishify-translated';
  span.textContent = translatedText;
  
  node.parentNode.replaceChild(span, node);
}

// Hover detection
let hoverTimeout = null;
document.addEventListener('mouseover', (e) => {
  if (!settings.tooltipEnabled) return;
  
  const target = e.target;
  // Only trigger on elements with direct text content and reasonable length
  if (target.nodeType === 1 && target.innerText && target.innerText.length > 3 && target.innerText.length < 300) {
    const text = target.innerText.trim();
    
    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      const lang = detectLanguage(text);
      
      if (lang.isBenglish) {
        // Auto-translate Benglish on hover if it's not already translated
        if (!target.hasAttribute('data-benglish-translated') && !target.closest('[data-benglish-translated]')) {
          showTooltip(text, e.pageX, e.pageY, 'benglish-to-english');
        }
      } else if (lang.isEnglish) {
        // Offer translation for English
        if (!target.hasAttribute('data-benglish-translated') && !target.closest('[data-benglish-translated]')) {
          showTranslationOption(text, e.pageX, e.pageY, 'english');
        }
      }
    }, 800); // 800ms hover delay to avoid spamming
  }
});

document.addEventListener('mouseout', () => {
  clearTimeout(hoverTimeout);
});

// Manual selection translation
document.addEventListener('mouseup', (e) => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText && selectedText.length > 1) {
    // Optional: Show a small icon near the selection to translate
  }
});

// Auto-translate logic (Efficient scanning with caching and MutationObserver)
let scanTimeout = null;
let observer = null;

async function autoTranslatePage(root = document.body) {
  if (!settings.autoTranslate) return;

  // Load cache once for efficiency
  const result = await chrome.storage.local.get(['translationCache']);
  const cache = result.translationCache || {};

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      // Skip script, style, and already translated tags
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      
      const tagName = parent.tagName.toLowerCase();
      if (['script', 'style', 'textarea', 'input', 'code', 'pre'].includes(tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      
      if (parent.hasAttribute('data-benglish-translated') || parent.closest('[data-benglish-translated]')) {
        return NodeFilter.FILTER_REJECT;
      }
      
      return NodeFilter.FILTER_ACCEPT;
    }
  }, false);

  const nodesToTranslate = [];
  let node;
  
  while (node = walker.nextNode()) {
    const text = node.nodeValue.trim();
    if (text.length > 3 && looksLikeBenglish(text)) {
      nodesToTranslate.push(node);
    }
  }

  // Process nodes (Batch processing to avoid UI lag)
  for (const textNode of nodesToTranslate) {
    const originalText = textNode.nodeValue.trim();
    if (cache[originalText]) {
      applyTranslation(textNode, cache[originalText]);
    } else {
      // Small delay for non-cached items to avoid hitting API limits too fast
      await translateNode(textNode);
    }
  }
  
  // Start observing for dynamic content after initial scan
  if (!observer && root === document.body) {
    setupMutationObserver();
  }
}

function setupMutationObserver() {
  if (observer) return;
  
  observer = new MutationObserver((mutations) => {
    let hasNewContent = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) { // Element node
            hasNewContent = true;
            break;
          }
        }
      }
      if (hasNewContent) break;
    }
    
    if (hasNewContent) {
      clearTimeout(scanTimeout);
      scanTimeout = setTimeout(() => {
        // Scan only the body for new nodes (TreeWalker handles skipping already translated)
        autoTranslatePage();
      }, 1000);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

async function translateNode(node) {
  const originalText = node.nodeValue.trim();
  try {
    const response = await chrome.runtime.sendMessage({
      action: "translate",
      text: originalText,
      direction: settings.languageMode
    });
    
    if (response.translatedText && response.translatedText !== originalText) {
      applyTranslation(node, response.translatedText);
      saveToCache(originalText, response.translatedText);
    }
  } catch (error) {
    console.error('Auto-translate error:', error);
  }
}

// Run auto-translate on load
// (Handled above in settings loading callback)
