import { GoogleGenAI, Type } from "@google/genai";

export interface GrammarCheckResult {
  originalText: string;
  correctedText: string;
  explanation: string;
  isCorrect: boolean;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const modelName = "gemini-3-flash-preview";

export async function checkGrammar(text: string, language: 'benglish' | 'english'): Promise<GrammarCheckResult> {
  try {
    const systemInstruction = `You are a world-class grammar and linguistic expert for Benglishify, specializing in English and Benglish (Bengali phonetically written in Latin script).

    Benglish characteristics to check:
    - Phonetic Consistency: Standardizing spellings (e.g., 'korsi' vs 'korchi').
    - Particle Usage: Correct use of '-ta', '-gulo', '-e', '-te' particles.
    - Verb Conjugation: Ensuring tense and person match (e.g., 'ami korchi' vs 'shei korche').
    - Sentence Structure: Maintaining natural Bengali flow while using Latin letters.

    Your task is to analyze the input text and provide a high-quality correction.
    
    Return a JSON object with:
    1. originalText: The input text.
    2. correctedText: The improved, natural, and grammatically perfect version.
    3. explanation: A DEEPLY DESCRIPTIVE explanation. Don't just say "fixed grammar". Instead, explain WHY the change was made (e.g., "Changed 'korche' to 'korchi' because it must match first-person 'ami'"). For English, explain punctuation, tense, or vocabulary choice.
    4. isCorrect: Boolean.

    Return ONLY the JSON object.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text: `Check this ${language} text: "${text}"` }] }],
      config: {
        systemInstruction,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalText: { type: Type.STRING },
            correctedText: { type: Type.STRING },
            explanation: { type: Type.STRING },
            isCorrect: { type: Type.BOOLEAN },
          },
          required: ["originalText", "correctedText", "explanation", "isCorrect"],
        },
      },
    });

    return JSON.parse(response.text || "{}") as GrammarCheckResult;
  } catch (error: any) {
    console.error("Grammar Error:", error);
    throw error;
  }
}
