import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";

export async function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/translate", async (req, res) => {
    const { text, direction, history = [] } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    try {
      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const model = "gemini-3-flash-preview";

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

        const callGeminiJson = async (retries = 7, delay = 3000): Promise<any> => {
          try {
            const response = await ai.models.generateContent({
              model,
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
            return JSON.parse(response.text || "{}");
          } catch (error: any) {
            const isRateLimit = error?.status === "RESOURCE_EXHAUSTED" || error?.code === 429 || (error?.message && error.message.includes("429"));
            if (isRateLimit && retries > 0) {
              await new Promise(resolve => setTimeout(resolve, delay));
              return callGeminiJson(retries - 1, delay * 2);
            }
            throw error;
          }
        };

        const result = await callGeminiJson();
        return res.json(result);
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

      let isCooldown = false;
      let cooldownTimer: any = null;

      const callGemini = async (retries = 7, delay = 3000): Promise<string> => {
        if (isCooldown) {
          throw new Error("Gemini API quota exceeded. Please wait 30 seconds before trying again.");
        }

        try {
          const response = await ai.models.generateContent({
            model,
            contents: [{ parts: [{ text }] }],
            config: {
              systemInstruction,
              temperature: 0.2,
            },
          });
          return response.text || "Translation failed.";
        } catch (error: any) {
          const isRateLimit = error?.status === "RESOURCE_EXHAUSTED" || error?.code === 429 || (error?.message && error.message.includes("429"));
          
          if (isRateLimit && retries > 0) {
            console.warn(`API: Gemini rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return callGemini(retries - 1, delay * 2); // Faster backoff
          }
          
          if (isRateLimit) {
            // Set cooldown for 30 seconds if all retries fail
            isCooldown = true;
            if (cooldownTimer) clearTimeout(cooldownTimer);
            cooldownTimer = setTimeout(() => {
              isCooldown = false;
            }, 30000);
            
            throw new Error("Gemini API quota exceeded. This usually happens when the free tier limit is reached. Please wait 30 seconds or try again later.");
          }
          
          throw error;
        }
      };

      const translatedText = await callGemini();
      res.json({ translatedText });
    } catch (error: any) {
      console.error("API Translation error:", error);
      const isRateLimit = error?.status === "RESOURCE_EXHAUSTED" || error?.code === 429 || (error?.message && error.message.includes("429"));
      
      if (isRateLimit) {
        return res.status(429).json({ 
          error: "Gemini API quota exceeded. This usually happens when the free tier limit is reached. Please wait a minute or try again later.",
          code: 429
        });
      }
      
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/grammar", async (req, res) => {
    const { text, language } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    try {
      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const model = "gemini-3-flash-preview";

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

      const callGeminiGrammar = async (retries = 7, delay = 3000): Promise<any> => {
        try {
          const response = await ai.models.generateContent({
            model,
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
          return JSON.parse(response.text || "{}");
        } catch (error: any) {
          const isRateLimit = error?.status === "RESOURCE_EXHAUSTED" || error?.code === 429 || (error?.message && error.message.includes("429"));
          if (isRateLimit && retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return callGeminiGrammar(retries - 1, delay * 2);
          }
          throw error;
        }
      };

      const result = await callGeminiGrammar();
      res.json(result);
    } catch (error: any) {
      console.error("API Grammar error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

const startServer = async () => {
  const PORT = 3000;
  const app = await createApp();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
};

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
