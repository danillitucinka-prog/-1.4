import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getAIResponse(prompt: string, history: any[] = []) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history,
        { role: "user", parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: "You are a helpful and friendly AI assistant integrated into the Qvieck chat app. Keep your responses concise and engaging.",
      }
    });

    return response.text || "I'm not sure how to respond to that.";
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later.";
  }
}
