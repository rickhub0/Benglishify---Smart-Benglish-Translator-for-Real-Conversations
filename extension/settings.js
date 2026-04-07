const autoTranslate = document.getElementById('auto-translate');
const tooltipEnabled = document.getElementById('tooltip-enabled');
const languageMode = document.getElementById('language-mode');
const backBtn = document.getElementById('back-btn');

// Load settings
chrome.storage.local.get(['settings'], (result) => {
  if (result.settings) {
    autoTranslate.checked = result.settings.autoTranslate;
    tooltipEnabled.checked = result.settings.tooltipEnabled;
    languageMode.value = result.settings.languageMode || 'benglish-to-english';
  } else {
    // Defaults
    autoTranslate.checked = false;
    tooltipEnabled.checked = true;
    languageMode.value = 'benglish-to-english';
  }
});

// Save settings on change
function saveSettings() {
  const settings = {
    autoTranslate: autoTranslate.checked,
    tooltipEnabled: tooltipEnabled.checked,
    languageMode: languageMode.value
  };
  chrome.storage.local.set({ settings });
}

autoTranslate.addEventListener('change', saveSettings);
tooltipEnabled.addEventListener('change', saveSettings);
languageMode.addEventListener('change', saveSettings);

backBtn.addEventListener('click', () => {
  window.location.href = 'popup.html';
});
