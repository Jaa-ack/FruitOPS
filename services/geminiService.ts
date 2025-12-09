import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const getGeminiAdvice = async (context: string, prompt: string): Promise<string> => {
  if (!apiKey) {
    return "API Key is missing. Please configure the environment.";
  }

  try {
    const fullPrompt = `
      You are an expert agricultural operations consultant for 'Shin-Shin Orchard', a family-owned farm in Taiwan.
      
      Here is the current operational context (JSON format):
      ${context}

      User Query: ${prompt}

      Please provide a concise, actionable, and data-driven response in Traditional Chinese (Taiwan).
      Focus on profitability, efficiency, and sustainability.
      If generating marketing copy, make it warm and suitable for a family farm brand.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });

    return response.text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, the AI service is currently unavailable. Please check your connection or API quota.";
  }
};