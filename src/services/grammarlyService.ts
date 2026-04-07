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
    const systemInstruction = `You are a grammar and style expert for Benglishify.
    Benglish is Bengali written in English letters (e.g., "ami kal meeting e jabo").
    
    Your task is to check the grammar and spelling of the input text.
    If the input is in Benglish, ensure it follows common phonetic patterns and is readable.
    If the input is in English, ensure it is grammatically correct and natural.
    
    Return a JSON object with:
    1. originalText: The input text.
    2. correctedText: The improved version of the text.
    3. explanation: A brief explanation of the changes made (or "Looks good!" if no changes).
    4. isCorrect: A boolean indicating if the original text was already correct.
    
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
