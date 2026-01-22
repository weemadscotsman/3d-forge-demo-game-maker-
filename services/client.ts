import { GoogleGenAI } from "@google/genai";

// Standard Interface for AI Providers
export interface AIProvider {
  generateContent(config: any): Promise<{ text: string | undefined }>;
}

// Default Gemini Implementation
class GeminiProvider implements AIProvider {
  private client: GoogleGenAI;

  constructor(apiKey: string | undefined) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateContent(config: any) {
    return this.client.models.generateContent(config);
  }
}

// Singleton State
let currentProvider: AIProvider = new GeminiProvider(process.env.API_KEY);

/**
 * Access point for AI Generation.
 * Supports swapping the backend (e.g. for Local LLMs or proxies).
 */
export const getAIClient = (): AIProvider => {
  return currentProvider;
};

/**
 * Hook to override the default provider at runtime.
 * Useful for "Local Mode" or specialized fine-tuned models.
 */
export const setAIProvider = (provider: AIProvider) => {
  console.log("Dream3DForge: Switching AI Provider");
  currentProvider = provider;
};
