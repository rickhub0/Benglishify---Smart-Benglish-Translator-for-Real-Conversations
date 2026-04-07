export type TranslationDirection = 
  | 'benglish-to-english' 
  | 'english-to-benglish' 
  | 'bengali-to-english' 
  | 'english-to-bengali'
  | 'voice-input';

export interface TranslationResult {
  benglish: string;
  english: string;
  bengali: string;
}

export interface ConversationContext {
  input: string;
  output: string;
}

export async function translateWithAI(text: string, direction: TranslationDirection, history: ConversationContext[] = []): Promise<string | TranslationResult> {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        direction,
        history
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(errorData.error || 'Translation failed');
      if (response.status === 429) {
        (error as any).code = 429;
      }
      throw error;
    }

    const data = await response.json();
    
    if (direction === 'voice-input') {
      return data as TranslationResult;
    }
    
    return data.translatedText || "Translation failed.";
  } catch (error: any) {
    console.error("Translation API Error:", error);
    throw error;
  }
}
