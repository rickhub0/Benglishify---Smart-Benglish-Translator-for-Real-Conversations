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
  const result = { isBenglish: false, isEnglish: false, isBengali: false, confidence: 0, primary: 'unknown' };
  if (!text || text.length < 2) return result;

  // 1. Script-based detection
  const bengaliScriptMatch = text.match(/[\u0980-\u09FF]/g);
  const bengaliScriptCount = bengaliScriptMatch ? bengaliScriptMatch.length : 0;
  const scriptDensity = bengaliScriptCount / text.length;

  // 2. Token-based scores
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0 && bengaliScriptCount > 0) {
    result.isBengali = true;
    result.primary = 'bengali';
    result.confidence = 1.0;
    return result;
  }

  let benglishScore = 0;
  let englishScore = 0;

  // Weighted keyword matching
  words.forEach(word => {
    if (benglishKeywords.includes(word)) benglishScore += 2.5;
    if (englishKeywords.includes(word)) englishScore += 2.0;
  });

  // Phonetic patterns (bh, dh, etc.)
  const phoneticPattern = /(bh|dh|kh|gh|th|ph|ch|jh|sh|aa|ee|oo|oi|ou)/gi;
  const phoneticMatches = (text.match(phoneticPattern) || []).length;
  benglishScore += phoneticMatches * 0.5;

  // Bengali script is the ultimate priority
  if (bengaliScriptCount > 2 || scriptDensity > 0.1) {
    result.isBengali = true;
    result.isBenglish = true; // Benglishify handles both
    result.primary = 'bengali';
    result.confidence = Math.min(1.0, scriptDensity * 5 + 0.5);
    return result;
  }

  // Calculate densities for English vs Benglish
  const wordCount = words.length || 1;
  const benglishDensity = benglishScore / wordCount;
  const englishDensity = englishScore / wordCount;

  if (benglishScore >= 3.5 || benglishDensity > 0.8) {
    result.isBenglish = true;
    result.primary = 'benglish';
    result.confidence = Math.min(0.95, benglishDensity / 2 + 0.4);
    
    // If there's high English density too, it's mixed
    if (englishDensity > 1.0) {
      result.isMixed = true;
    }
    return result;
  }

  if (englishScore >= 2 || englishDensity > 0.5 || words.length > 5) {
    result.isEnglish = true;
    result.primary = 'english';
    result.confidence = Math.min(0.9, englishDensity / 2 + 0.3);
  }

  return result;
}

// Caching logic for persistent translations
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
      
      if (lang.isBengali || lang.isBenglish) {
        // Auto-translate Benglish/Bengali on hover if it's not already translated
        if (!target.hasAttribute('data-benglish-translated') && !target.closest('[data-benglish-translated]')) {
          const direction = lang.primary === 'bengali' ? 'bengali-to-english' : 'benglish-to-english';
          showTooltip(text, e.pageX, e.pageY, direction);
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

// Updated auto-translation logic to use refined detection
async function autoTranslatePage(root = document.body) {
  if (!settings.autoTranslate) return;

  const resultStore = await chrome.storage.local.get(['translationCache']);
  const cache = resultStore.translationCache || {};

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      
      const tagName = parent.tagName.toLowerCase();
      if (['script', 'style', 'textarea', 'input', 'code', 'pre', 'noscript'].includes(tagName)) {
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
    if (text.length < 3) continue;

    const lang = detectLanguage(text);
    // Auto-translate if it is Bengali script or high-confidence Benglish
    if (lang.isBengali || (lang.isBenglish && lang.confidence > 0.6)) {
      nodesToTranslate.push({
        node,
        text,
        direction: lang.primary === 'bengali' ? 'bengali-to-english' : 'benglish-to-english'
      });
    }
  }

  // Batch process to avoid UI jank
  for (const item of nodesToTranslate) {
    if (cache[item.text]) {
      applyTranslation(item.node, cache[item.text]);
    } else {
      await translateNode(item.node, item.direction);
    }
  }
  
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

async function translateNode(node, forcedDirection) {
  const originalText = node.nodeValue.trim();
  try {
    const direction = forcedDirection || settings.languageMode;
    const response = await chrome.runtime.sendMessage({
      action: "translate",
      text: originalText,
      direction: direction
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
