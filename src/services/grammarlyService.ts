export interface GrammarCheckResult {
  originalText: string;
  correctedText: string;
  explanation: string;
  isCorrect: boolean;
}

export async function checkGrammar(text: string, language: 'benglish' | 'english'): Promise<GrammarCheckResult> {
  try {
    const response = await fetch('/api/grammar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        language
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Grammar check failed');
    }

    return await response.json() as GrammarCheckResult;
  } catch (error: any) {
    console.error("Grammar API Error:", error);
    throw error;
  }
}
