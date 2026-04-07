const API_URL = 'https://ais-dev-tnccjdrj3s2vquwn4fxgph-477798320912.europe-west2.run.app/api/translate';

let translationTimeout;
let currentDirection = 'benglish-to-english';

const inputText = document.getElementById('input-text');
const resultText = document.getElementById('result-text');
const loading = document.getElementById('loading');
const resultContainer = document.getElementById('result-container');
const placeholderText = document.getElementById('placeholder-text');
const swapBtn = document.getElementById('swap-btn');
const fromLang = document.getElementById('from-lang');
const toLang = document.getElementById('to-lang');
const copyBtn = document.getElementById('copy-btn');
const micBtn = document.getElementById('mic-btn');
const settingsBtn = document.getElementById('settings-btn');

settingsBtn.addEventListener('click', () => {
  window.location.href = 'settings.html';
});

// Load saved state
chrome.storage.local.get(['direction', 'lastInput'], (result) => {
  if (result.direction) {
    currentDirection = result.direction;
    updateDirectionUI();
  }
  if (result.lastInput) {
    inputText.value = result.lastInput;
    handleTranslate();
  }
});

inputText.addEventListener('input', () => {
  clearTimeout(translationTimeout);
  const text = inputText.value.trim();
  
  if (!text) {
    showPlaceholder();
    return;
  }

  translationTimeout = setTimeout(handleTranslate, 500);
  chrome.storage.local.set({ lastInput: text });
});

swapBtn.addEventListener('click', () => {
  currentDirection = currentDirection === 'benglish-to-english' ? 'english-to-benglish' : 'benglish-to-english';
  updateDirectionUI();
  handleTranslate();
  chrome.storage.local.set({ direction: currentDirection });
});

copyBtn.addEventListener('click', () => {
  const text = resultText.innerText;
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.innerText = '✅';
    setTimeout(() => {
      copyBtn.innerText = '📋';
    }, 2000);
  });
});

async function handleTranslate() {
  const text = inputText.value.trim();
  if (!text) return;

  showLoading();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        direction: currentDirection
      }),
    });

    if (!response.ok) {
      throw new Error('Translation failed');
    }

    const data = await response.json();
    showResult(data.translatedText);
  } catch (error) {
    console.error('Translation error:', error);
    showResult('Error: Could not connect to translation service.');
  }
}

function updateDirectionUI() {
  if (currentDirection === 'benglish-to-english') {
    fromLang.innerText = 'Benglish';
    toLang.innerText = 'English';
    inputText.placeholder = 'Type Benglish here...';
  } else {
    fromLang.innerText = 'English';
    toLang.innerText = 'Benglish';
    inputText.placeholder = 'Type English here...';
  }
}

function showLoading() {
  loading.classList.remove('hidden');
  resultContainer.classList.add('hidden');
  placeholderText.classList.add('hidden');
}

function showResult(text) {
  loading.classList.add('hidden');
  resultContainer.classList.remove('hidden');
  placeholderText.classList.add('hidden');
  resultText.innerText = text;
}

function showPlaceholder() {
  loading.classList.add('hidden');
  resultContainer.classList.add('hidden');
  placeholderText.classList.remove('hidden');
}

// Voice Input (Simple implementation using Web Speech API)
let recognition;
if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = currentDirection === 'benglish-to-english' ? 'bn-IN' : 'en-US';

  recognition.onstart = () => {
    micBtn.classList.add('active');
  };

  recognition.onend = () => {
    micBtn.classList.remove('active');
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    inputText.value = transcript;
    handleTranslate();
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    micBtn.classList.remove('active');
  };
}

micBtn.addEventListener('click', () => {
  if (recognition) {
    recognition.lang = currentDirection === 'benglish-to-english' ? 'bn-IN' : 'en-US';
    recognition.start();
  } else {
    alert('Speech recognition not supported in this browser.');
  }
});
