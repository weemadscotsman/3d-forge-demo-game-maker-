import { Type, Schema } from "@google/genai";
import { UserPreferences, GeneratedGame, GameAudio } from "../../types";
import { getAIClient } from "../client";
import { parseAndSanitize, validateStructure } from "../utils/aiHelpers";
import { PromptRegistry } from "../promptRegistry";

const audioSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING, description: "Short description of the soundscape design logic." },
    backgroundMusic: { 
        type: Type.STRING, 
        description: "Raw JS Code for a function `function playMusic(ctx) { ... }` that uses Web Audio API (Oscillators/Gain) to create an ambient loop matching the game mood. No external files. Must contain the full function body." 
    },
    soundEffects: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: "Name of the sound (e.g., 'jump', 'shoot')." },
                trigger: { type: Type.STRING, description: "The gameplay event that triggers this (e.g., 'Player presses Space')." },
                code: { type: Type.STRING, description: "Raw JS Code for a function `function play[Name](ctx) { ... }` that synthesizes a short SFX." }
            }
        }
    }
  },
  required: ["description", "backgroundMusic", "soundEffects"]
};

export const generateSoundscape = async (blueprint: GeneratedGame, prefs: UserPreferences, onStatus?: (status: string) => void): Promise<GameAudio> => {
    if (onStatus) onStatus("Designing Soundscape...");
    const ai = getAIClient();

    try {
        const response = await ai.generateContent({
            model: "gemini-3-pro-preview",
            contents: PromptRegistry.DesignSoundscape(blueprint, prefs),
            config: {
                responseMimeType: "application/json",
                responseSchema: audioSchema,
                thinkingConfig: { thinkingBudget: 2048 },
                maxOutputTokens: 32768
            }
        });
        const data = parseAndSanitize(response.text || "{}");
        // Basic validation but allow failure (it's an optional feature)
        try {
           validateStructure(data, ["backgroundMusic", "soundEffects"], "Audio Generator");
           return data;
        } catch(e) {
           console.warn("Audio validation failed", e);
           throw e;
        }
    } catch (e: any) {
        console.warn("Audio generation failed, proceeding without audio.", e);
        // Fallback to empty audio to allow pipeline to continue
        return {
            description: "Audio generation failed.",
            backgroundMusic: "// No music generated",
            soundEffects: []
        };
    }
};
