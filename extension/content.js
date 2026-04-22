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
let observer = null;
let scanTimeout = null;

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
      <div style="font-size: 11px; color: #666; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
        <span>Benglishify Translation</span>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span id="b-copy" style="cursor: pointer; font-size: 14px;" title="Copy to Clipboard">📋</span>
          <span id="b-close" style="cursor: pointer; font-size: 16px; line-height: 1;">✕</span>
        </div>
      </div>
      <div style="font-weight: 500; margin-top: 4px;">${response.translatedText}</div>
    `;
    
    document.getElementById('b-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(response.translatedText).then(() => {
        const copyBtn = document.getElementById('b-copy');
        copyBtn.innerText = '✅';
        setTimeout(() => {
          if (copyBtn) copyBtn.innerText = '📋';
        }, 2000);
      });
    });

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

// Language detection heuristics
const bengaliScriptRegex = /[\u0980-\u09FF]/;

const benglishStopWords = new Set([
  'ami', 'tumi', 'u', 'i', 'r', 'o', 'je', 'ki', 'na', 'koto', 'ekhon', 'pore', 'porechhi', 'korchi',
  'kore', 'hobe', 'khabo', 'bhalo', 'shob', 'amader', 'tomader', 'shathe', 'kotha', 'bolo', 'ni',
  'hoy', 'chilo', 'khub', 'ekta', 'onek', 'janina', 'thako', 'eikhane', 'oikhane', 'bolte', 'shunte',
  'dekhte', 'parchi', 'bujhte', 'achho', 'kemon', 'toh', 'bondhu', 'bhai', 'dada', 'di', 'bon', 'ma'
]);

const englishStopWords = new Set([
  'the', 'and', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'will', 'would', 'should',
  'could', 'that', 'this', 'those', 'these', 'with', 'from', 'but', 'not', 'for', 'you', 'your'
]);

// Bigrams common in Benglish but rare/distinct in English
const benglishBigrams = {
  'ch': 0.8, 'bh': 0.9, 'dh': 0.9, 'kh': 0.9, 'gh': 0.9, 'th': 0.7, 'ph': 0.6, 'jh': 0.9,
  'sh': 0.4, 'aa': 0.7, 'ee': 0.5, 'oo': 0.5, 'oi': 0.8, 'ou': 0.6, 'rh': 0.9, 'ng': 0.4
};

function detectLanguage(text) {
  const result = { 
    isBenglish: false, 
    isEnglish: false, 
    isBengali: false, 
    isMixed: false,
    confidence: 0, 
    primary: 'unknown' 
  };
  
  if (!text || text.length < 2) return result;

  // 1. Script-based detection (Bengali characters)
  const bengaliChars = (text.match(/[\u0980-\u09FF]/g) || []).length;
  const scriptDensity = bengaliChars / text.length;

  if (bengaliChars > 0) {
    result.isBengali = true;
    if (scriptDensity > 0.4 || bengaliChars > 5) {
      result.primary = 'bengali';
      result.confidence = Math.min(1.0, scriptDensity * 2 + 0.2);
      result.isBenglish = true; // Benglishify handles it
      return result;
    }
  }

  // 2. Roman Script Analysis (Benglish vs English)
  const normalized = text.toLowerCase();
  const words = normalized.split(/[^a-z0-9]+/).filter(w => w.length > 0);
  
  if (words.length === 0) return result;

  let benglishScore = 0;
  let englishScore = 0;
  let romanCharCount = 0;

  // Analysis variables
  words.forEach(word => {
    romanCharCount += word.length;
    
    // Stop word hits
    if (benglishStopWords.has(word)) benglishScore += 5;
    if (englishStopWords.has(word)) englishScore += 4;

    // Word endings typical for Benglish (e.g., -chhi, -lam, -te, -er, -ke)
    if (word.endsWith('chhi') || word.endsWith('lam') || word.endsWith('ben')) benglishScore += 3;
    if (word.endsWith('er') || word.endsWith('ke') || word.endsWith('te')) benglishScore += 1.5;
    
    // N-gram patterns
    for (let i = 0; i < word.length - 1; i++) {
      const bigram = word.substring(i, i + 2);
      if (benglishBigrams[bigram]) {
        benglishScore += benglishBigrams[bigram] * 1.5;
      }
    }
    
    // Vowel sequences
    const vowelSeq = word.match(/[aeiou]{3,}/g);
    if (vowelSeq) benglishScore += vowelSeq.length * 2;
  });

  // Length penalty for English (English usually has shorter function words)
  const averageWordLength = romanCharCount / words.length;
  if (averageWordLength > 4.5) benglishScore += 1; 

  // Final scoring and normalization
  const totalRomanScore = benglishScore + englishScore || 1;
  const benglishProb = benglishScore / totalRomanScore;
  const englishProb = englishScore / totalRomanScore;

  // Thresholds for classification
  if (benglishScore > 10 || benglishProb > 0.65) {
    result.isBenglish = true;
    result.primary = 'benglish';
    result.confidence = Math.min(0.98, benglishProb * 0.8 + 0.2);
    
    if (englishScore > 6 && englishProb > 0.3) {
      result.isMixed = true;
    }
  } else if (englishScore > 8 || englishProb > 0.7 || words.length > 8) {
    result.isEnglish = true;
    result.primary = 'english';
    result.confidence = Math.min(0.95, englishProb);
  } else if (benglishScore > 0) {
    // Low confidence benglish
    result.isBenglish = true;
    result.primary = 'benglish';
    result.confidence = 0.4;
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

// High-performance translation queue
const translationQueue = [];
let isProcessingQueue = false;
const MAX_CONCURRENT = 5;
let activeRequests = 0;

async function processQueue() {
  if (isProcessingQueue || translationQueue.length === 0) return;
  isProcessingQueue = true;

  while (translationQueue.length > 0 && activeRequests < MAX_CONCURRENT) {
    const task = translationQueue.shift();
    if (!task) break;

    activeRequests++;
    
    // Process task without awaiting to allow concurrency
    translateNode(task.node, task.direction).finally(() => {
      activeRequests--;
      processQueue(); // Try to process next item
    });
  }

  isProcessingQueue = false;
}

// Updated auto-translation logic to use refined detection and partial updates
async function autoTranslatePage(root = document.body) {
  if (!settings.autoTranslate) return;

  const resultStore = await chrome.storage.local.get(['translationCache']);
  const cache = resultStore.translationCache || {};

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      
      const tagName = parent.tagName.toLowerCase();
      if (['script', 'style', 'textarea', 'input', 'code', 'pre', 'noscript', 'meta', 'title'].includes(tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      
      if (parent.hasAttribute('data-benglish-translated') || parent.closest('[data-benglish-translated]')) {
        return NodeFilter.FILTER_REJECT;
      }
      
      return NodeFilter.FILTER_ACCEPT;
    }
  }, false);

  let node;
  while (node = walker.nextNode()) {
    const text = node.nodeValue.trim();
    if (text.length < 3) continue;

    const lang = detectLanguage(text);
    if (lang.isBengali || (lang.isBenglish && lang.confidence > 0.6)) {
      if (cache[text]) {
        applyTranslation(node, cache[text]);
      } else {
        translationQueue.push({
          node,
          direction: lang.primary === 'bengali' ? 'bengali-to-english' : 'benglish-to-english'
        });
      }
    }
  }

  if (translationQueue.length > 0) {
    processQueue();
  }
}

let pendingRoots = new Set();
function setupMutationObserver() {
  if (observer) return;
  
  observer = new MutationObserver((mutations) => {
    let added = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) { // Only track Elements
          // Check if this node is already inside a pending root to avoid redundant scans
          let isRedundant = false;
          for (const root of pendingRoots) {
            if (root.contains(node)) {
              isRedundant = true;
              break;
            }
          }
          if (!isRedundant) {
            pendingRoots.add(node);
            added = true;
          }
        }
      }
    }
    
    if (added) {
      clearTimeout(scanTimeout);
      scanTimeout = setTimeout(() => {
        const roots = Array.from(pendingRoots);
        pendingRoots.clear();
        
        // Sort by depth so we process parent additions first, then filter out children
        roots.sort((a, b) => {
          const depthA = document.evaluate('count(ancestor::*)', a, null, XPathResult.NUMBER_TYPE, null).numberValue;
          const depthB = document.evaluate('count(ancestor::*)', b, null, XPathResult.NUMBER_TYPE, null).numberValue;
          return depthA - depthB;
        });

        const distinctRoots = [];
        for (const root of roots) {
          if (!distinctRoots.some(r => r.contains(root))) {
            distinctRoots.push(root);
          }
        }

        distinctRoots.forEach(root => {
          // Double check if root is still in DOM
          if (document.body.contains(root)) {
            autoTranslatePage(root);
          }
        });
      }, 1200); // 1.2s debounce for dynamic content settling
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
