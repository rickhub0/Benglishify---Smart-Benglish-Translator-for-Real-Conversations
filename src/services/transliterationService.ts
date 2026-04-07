/**
 * Transliteration Service for Benglishify
 * Handles Bengali script to Benglish (Latin script) conversion
 */

export class TransliterationService {
  /**
   * Basic rule-based transliteration from Bengali script to Benglish
   * This is a simplified version for real-time feedback.
   */
  transliterate(text: string): string {
    if (!text) return "";

    // Mapping of Bengali characters to their phonetic English equivalents
    const mapping: { [key: string]: string } = {
      // Vowels
      'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'ee', 'উ': 'u', 'ঊ': 'oo', 'ঋ': 'ri', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
      // Vowel signs
      'া': 'a', 'ি': 'i', 'ী': 'ee', 'ু': 'u', 'ূ': 'oo', 'ৃ': 'ri', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
      // Consonants
      'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
      'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'ny',
      'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
      'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
      'প': 'p', 'ফ': 'ph', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
      'য': 'y', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
      'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't',
      // Modifiers
      'ং': 'ng', 'ঃ': 'h', 'ঁ': 'n', '্': '',
      // Numbers
      '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    };

    let result = "";
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      // Handle inherent vowel 'o' for consonants followed by another consonant or end of word
      // This is a very basic heuristic
      if (mapping[char]) {
        result += mapping[char];
        
        // If it's a consonant and not followed by a vowel sign or hasant, add 'o'
        const isConsonant = "কখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহড়ঢ়য়".includes(char);
        const nextIsVowelSign = nextChar && "ািীুূৃেৈোৌ্".includes(nextChar);
        
        if (isConsonant && !nextIsVowelSign && nextChar !== ' ') {
          // Simple rule: add 'o' if it's not the end of the word and not followed by a vowel sign
          // result += 'o'; 
          // Actually, Benglish often omits the inherent 'o' unless it's pronounced.
          // For a simple live display, omitting it or adding it selectively is hard.
          // Let's just do a direct mapping for now.
        }
      } else {
        result += char;
      }
    }

    // Post-processing for common patterns
    return result
      .replace(/aa/g, 'a')
      .replace(/ii/g, 'i')
      .replace(/uu/g, 'u')
      .replace(/oo/g, 'o')
      .trim();
  }
}

export const transliterationService = new TransliterationService();
