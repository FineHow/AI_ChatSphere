
import { GoogleGenAI, GenerateContentParameters } from "@google/genai";
import { Message, Agent } from "../types";
import { getConfig } from '../config';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {

    const { geminiApiKey, useProxy } = getConfig();
    const apiKey = geminiApiKey
    const baseUrl = useProxy

    this.ai = new GoogleGenAI({ 
      apiKey,
      apiVersion: "v1beta",
      httpOptions: {
      baseUrl, 
  }
    });
  }

  

  async generateResponse(
    agent: Agent,
    history: Message[],
    userInput: string,
    systemContext: string = ''
  ): Promise<{ content: string; rawRequest: any; rawResponse: any; memoriesUsed: string[] }> {
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    if (contents.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: userInput }]
      });
    } else {
      const lastMsg = history[history.length - 1];
      if (lastMsg.content !== userInput || lastMsg.role !== 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: userInput }]
        });
      }
    }

    const maxTokens = agent.maxOutputTokens || 1000;
    // Set thinking budget to about 25% of max tokens or minimum 100 to allow reasoning
    const thinkingBudget = Math.min(Math.floor(maxTokens * 0.4), 4000);

    const params: GenerateContentParameters = {
      model: agent.model,
      contents,
      config: {
        systemInstruction: `${agent.persona}\n\n${systemContext}`,
        temperature: agent.temperature,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: maxTokens,
        // Only models in the 3.0 or 2.5 series support thinking budget.
        // Assuming models selected from constants are compatible.
        thinkingConfig: { thinkingBudget: thinkingBudget }
      }
    };

    try {
      const response = await this.ai.models.generateContent(params);
      const text = response.text || "No response from model.";
      
      const memoriesUsed = history.slice(-2).map(m => m.id);

      return {
        content: text,
        rawRequest: params,
        rawResponse: response,
        memoriesUsed
      };
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
