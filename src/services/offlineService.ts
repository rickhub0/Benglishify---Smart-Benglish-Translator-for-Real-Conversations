
export interface CachedTranslation {
  text: string;
  direction: string;
  result: any;
  timestamp: number;
}

const CACHE_KEY = 'benglishify_translation_cache';
const DICTIONARY_KEY = 'benglishify_master_dictionary';
const MAX_CACHE_SIZE = 100;

export const offlineService = {
  // Save a single translation result to cache
  saveToCache(text: string, direction: string, result: any) {
    try {
      const cache = this.getCache();
      const key = `${direction}:${text.toLowerCase().trim()}`;
      
      cache[key] = {
        text,
        direction,
        result,
        timestamp: Date.now()
      };

      // Limit cache size (remove oldest)
      const keys = Object.keys(cache);
      if (keys.length > MAX_CACHE_SIZE) {
        const oldestKey = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)[0];
        delete cache[oldestKey];
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn('Failed to save to translation cache', e);
    }
  },

  // Get from cache
  getFromCache(text: string, direction: string) {
    const cache = this.getCache();
    const key = `${direction}:${text.toLowerCase().trim()}`;
    return cache[key]?.result || null;
  },

  getCache(): Record<string, CachedTranslation> {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  },

  // Master dictionary (synced from Firestore)
  saveMasterDictionary(data: any[]) {
    try {
      localStorage.setItem(DICTIONARY_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save master dictionary', e);
    }
  },

  getMasterDictionary(): any[] {
    try {
      const stored = localStorage.getItem(DICTIONARY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  // Lookup in master dictionary
  lookupInDictionary(text: string, direction: string) {
    const dictionary = this.getMasterDictionary();
    const normalizedText = text.toLowerCase().trim();

    const match = dictionary.find(item => {
      if (direction === 'benglish-to-english') return item.benglish?.toLowerCase() === normalizedText;
      if (direction === 'bengali-to-english') return item.bengali === normalizedText;
      if (direction.startsWith('english-to-')) return item.english?.toLowerCase() === normalizedText;
      return false;
    });

    if (match) {
      if (direction === 'benglish-to-english' || direction === 'bengali-to-english') return match.english;
      if (direction === 'english-to-bengali') return match.bengali;
      if (direction === 'english-to-benglish') return match.benglish;
    }

    return null;
  },

  isOnline(): boolean {
    return navigator.onLine;
  }
};
