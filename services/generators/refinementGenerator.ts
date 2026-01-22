import { Type, Schema } from "@google/genai";
import { GeneratedGame, RefinementSettings } from "../../types";
import { getAIClient } from "../client";
import { parseAndSanitize, validateStructure, compressCodeForContext } from "../utils/aiHelpers";
import { PromptRegistry } from "../promptRegistry";

const refinementSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    editMode: { 
        type: Type.STRING, 
        enum: ['patch', 'rewrite'],
        description: "Choose 'patch' for small localized fixes. Choose 'rewrite' for major logic changes, structural overhauls, or if you cannot confidently match the context string." 
    },
    edits: {
      type: Type.ARRAY,
      description: "List of search-and-replace operations. Required if editMode is 'patch'.",
      items: {
        type: Type.OBJECT,
        properties: {
          search: { 
            type: Type.STRING, 
            description: "The EXACT unique string block from the original code to be replaced. Must be long enough to be unique." 
          },
          replace: { 
            type: Type.STRING, 
            description: "The new code block to substitute." 
          }
        }
      }
    },
    fullCode: {
        type: Type.STRING,
        description: "The complete, valid HTML file string. Required if editMode is 'rewrite'."
    },
    instructions: { type: Type.STRING, description: "Updated gameplay instructions if changed." }
  },
  required: ["editMode"]
};

export const refineGame = async (currentGame: GeneratedGame, instruction: string, settings?: RefinementSettings): Promise<GeneratedGame> => {
    // Compress context to save tokens (remove huge assets)
    const contextCode = compressCodeForContext(currentGame.html || "");
    const ai = getAIClient();
    
    try {
      const response = await ai.generateContent({
        model: "gemini-3-pro-preview",
        contents: PromptRegistry.RefineCode(instruction, contextCode),
        config: {
          responseMimeType: "application/json",
          responseSchema: refinementSchema,
          thinkingConfig: { thinkingBudget: 4096 },
          maxOutputTokens: settings?.maxOutputTokens ?? 65536,
          temperature: settings?.temperature ?? 0.7,
          topP: settings?.topP ?? 0.95,
          topK: settings?.topK ?? 40
        }
      });
      
      const result = parseAndSanitize(response.text || "{}");
      validateStructure(result, ["editMode"], "Refinement Engine");
      
      let newHtml = currentGame.html || "";
      
      // Mode 1: Full Rewrite
      if (result.editMode === 'rewrite' && result.fullCode) {
          console.log("Refinement strategy: REWRITE");
          return {
              ...currentGame,
              html: result.fullCode,
              instructions: result.instructions || currentGame.instructions
          };
      }

      // Mode 2: Patch
      console.log("Refinement strategy: PATCH");
      if (result.edits && Array.isArray(result.edits)) {
         for (const edit of result.edits) {
             const searchBlock = edit.search;
             
             if (searchBlock && newHtml.includes(searchBlock)) {
                 // Direct Match
                 newHtml = newHtml.replace(searchBlock, edit.replace);
             } else if (searchBlock) {
                 // Fuzzy Match Fallback
                 console.warn("Patch skipped - strict match failed. Attempting fuzzy match is risky, skipping.");
             }
         }
      }

      return {
          ...currentGame,
          html: newHtml,
          instructions: result.instructions || currentGame.instructions
      };
    } catch (error: any) {
      throw new Error("Refinement Failed: " + error.message);
    }
  };
