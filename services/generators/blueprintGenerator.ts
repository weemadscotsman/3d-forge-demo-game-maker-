import { Type, Schema } from "@google/genai";
import { UserPreferences, GeneratedGame } from "../../types";
import { getAIClient } from "../client";
import { parseAndSanitize, validateStructure } from "../utils/aiHelpers";
import { PromptRegistry } from "../promptRegistry";

// --- SCHEMA 1: QUANTIZED SPEC SHEET ---
const specSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The title of the game." },
    summary: { type: Type.STRING, description: "One sentence high concept pitch." },
    coreMechanics: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of 3-5 key gameplay mechanics. Be specific."
    },
    visualRequirements: {
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of 3-5 technical visual targets (e.g. 'Neon Bloom', 'Flat Shading')."
    }
  },
  required: ["title", "summary", "coreMechanics", "visualRequirements"]
};

// --- SCHEMA 2: TECHNICAL ARCHITECTURE ---
const architectureSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    recommendedEngine: { type: Type.STRING, description: "The best web-based engine for this task (e.g., Three.js, Babylon.js, PlayCanvas)." },
    language: { type: Type.STRING, description: "The programming language (e.g., TypeScript, JavaScript)." },
    architecture: {
      type: Type.OBJECT,
      properties: {
        style: { type: Type.STRING, description: "Architecture Pattern name ONLY (e.g. ECS, MVC). Max 10 words." },
        description: { type: Type.STRING, description: "A concise technical summary (max 50 words). DO NOT REPEAT WORDS." },
        nodes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Name of the system or component." },
              description: { type: Type.STRING, description: "What this specific node handles. Max 15 words." },
              type: { type: Type.STRING, enum: ['pattern', 'component', 'system', 'data'] }
            }
          }
        }
      }
    },
    techStack: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "Category (e.g., Rendering, Physics, AI)." },
          name: { type: Type.STRING, description: "Tool or library name." },
          description: { type: Type.STRING, description: "Why this tool was chosen." },
          link: { type: Type.STRING, description: "URL to documentation." }
        }
      }
    },
    prerequisites: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          item: { type: Type.STRING, description: "Name of the prerequisite." },
          command: { type: Type.STRING, description: "Install command if applicable." },
          importance: { type: Type.STRING, enum: ['Critical', 'Recommended', 'Optional'] }
        }
      }
    }
  },
  required: ["recommendedEngine", "language", "architecture", "techStack", "prerequisites"]
};

export const generateBlueprint = async (prefs: UserPreferences, onStatus?: (status: string) => void): Promise<GeneratedGame> => {
  const ai = getAIClient();

  // STEP 1: QUANTIZE REQUIREMENTS
  if (onStatus) onStatus("Quantizing Requirements...");
  
  let specData: any;
  try {
      const response = await ai.generateContent({
        model: "gemini-3-pro-preview",
        contents: PromptRegistry.QuantizeRequirements(prefs),
        config: {
          responseMimeType: "application/json",
          responseSchema: specSchema,
          thinkingConfig: { thinkingBudget: 1024 }, 
          maxOutputTokens: 16384
        }
      });
      specData = parseAndSanitize(response.text || "{}");
      validateStructure(specData, ["title", "summary", "coreMechanics"], "Blueprint Spec");
  } catch (e: any) {
      throw new Error("Failed to quantize requirements: " + e.message);
  }

  // STEP 2: GENERATE ARCHITECTURE
  if (onStatus) onStatus("Architecting System...");

  let archData: any;
  try {
      const response = await ai.generateContent({
        model: "gemini-3-pro-preview",
        contents: PromptRegistry.ArchitectSystem(specData, prefs),
        config: {
          responseMimeType: "application/json",
          responseSchema: architectureSchema,
          thinkingConfig: { thinkingBudget: 2048 },
          maxOutputTokens: 32768
        }
      });
      archData = parseAndSanitize(response.text || "{}");
      validateStructure(archData, ["architecture", "techStack"], "Blueprint Architecture");
  } catch (e: any) {
      throw new Error("Failed to generate architecture: " + e.message);
  }

  return { ...specData, ...archData };
};
