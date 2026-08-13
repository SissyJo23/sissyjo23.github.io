import { GoogleGenAI } from '@google/genai';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[MAL WARNING]: GEMINI_API_KEY is not defined in environment variables.");
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey || 'MOCK_KEY' });
  }

  async generateResponse(systemInstruction: string, prompt: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2,
        }
      });
      return response.text || '';
    } catch (error) {
      console.error("[MAL ERROR]: Gemini execution failed:", error);
      throw error;
    }
  }
}
