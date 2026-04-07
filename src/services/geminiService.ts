import { GoogleGenAI, Type } from "@google/genai";

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

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
  return key;
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });
const modelName = "gemini-3-flash-preview";

export async function translateWithAI(text: string, direction: TranslationDirection, history: ConversationContext[] = []): Promise<string | TranslationResult> {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === "AI Studio Free Tier") {
    throw new Error("Gemini API key is missing or invalid. Please ensure GEMINI_API_KEY is correctly set in your environment variables.");
  }

  try {
    let systemInstruction = "";
    const contextPrompt = history.length > 0 
      ? `\n\nRecent conversation context for disambiguation:\n${history.map((h: any) => `User: ${h.input}\nTranslator: ${h.output}`).join('\n')}\n\nUse this context to correctly translate ambiguous words like 'kal' (which can mean yesterday or tomorrow depending on tense/context).`
      : "";

    if (direction === 'voice-input') {
      systemInstruction = `You are a multi-way translator for Benglishify. 
      The user will provide input in either English, Bengali script, or Benglish (Bengali in English letters).
      Your task is to provide the translation in ALL THREE formats:
      1. benglish: Bengali written in English letters (e.g., "ami kal meeting e jabo")
      2. english: Natural English translation (e.g., "I will go to the meeting tomorrow")
      3. bengali: Bengali script (e.g., "আমি কাল মিটিংয়ে যাব")
      
      Return the result as a JSON object with these three keys.
      ${contextPrompt}`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ parts: [{ text }] }],
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              benglish: { type: Type.STRING },
              english: { type: Type.STRING },
              bengali: { type: Type.STRING },
            },
            required: ["benglish", "english", "bengali"],
          },
        },
      });
      
      return JSON.parse(response.text || "{}") as TranslationResult;
    }

    switch (direction) {
      case 'benglish-to-english':
        systemInstruction = "You are a Benglish-to-English translator. Benglish is Bengali written in English letters. Translate the input to natural English. Example: 'ami kal meeting e jabo' -> 'I will go to the meeting tomorrow'." + contextPrompt;
        break;
      case 'english-to-benglish':
        systemInstruction = "You are an English-to-Benglish translator. Translate the input to natural Benglish (Bengali written in English letters). Example: 'I will go to the meeting tomorrow' -> 'ami kal meeting e jabo'." + contextPrompt;
        break;
      case 'bengali-to-english':
        systemInstruction = "You are a Bengali-to-English translator. Translate the Bengali script input to natural English. Example: 'আমি কাল মিটিংয়ে যাব' -> 'I will go to the meeting tomorrow'." + contextPrompt;
        break;
      case 'english-to-bengali':
        systemInstruction = "You are an English-to-Bengali translator. Translate the English input to natural Bengali script. Example: 'I will go to the meeting tomorrow' -> 'আমি কাল মিটিংয়ে যাব'." + contextPrompt;
        break;
      default:
        systemInstruction = "You are a translator between English and Benglish (Bengali in English letters)." + contextPrompt;
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text }] }],
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    return response.text || "Translation failed.";
  } catch (error: any) {
    console.error("Translation Error:", error);
    throw error;
  }
}
