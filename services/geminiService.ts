import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserPreferences, GeneratedGame, GameAudio, ForgeManifest } from "../types";
import { generateShortHash } from "../utils/tokenEstimator";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- SCHEMA 1: QUANTIZED SPEC SHEET (Small, robust) ---
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

// --- SCHEMA 2: TECHNICAL ARCHITECTURE (Complex) ---
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

// --- SCHEMA 3: AUDIO ASSETS (New) ---
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

// --- SCHEMA 4: PROTOTYPE CODE ---
const prototypeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    html: { 
      type: Type.STRING, 
      description: "A complete, self-contained HTML string with embedded JS/CSS. Contains the full runnable game." 
    },
    instructions: { type: Type.STRING, description: "Clear, short bullet points on controls and objective." }
  },
  required: ["html", "instructions"]
};

// --- SCHEMA 5: DIFFERENTIAL REFINEMENT ---
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

// --- HELPERS ---

const parseAndSanitize = (text: string): any => {
    // 1. Attempt direct parse
    try {
        return JSON.parse(text);
    } catch (e) {
        // 2. Attempt to find the first '{' and last '}'
        const firstOpen = text.indexOf('{');
        const lastClose = text.lastIndexOf('}');
        
        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            const jsonCandidate = text.substring(firstOpen, lastClose + 1);
            try {
                return JSON.parse(jsonCandidate);
            } catch (innerE) {
                // Continue
            }
        }
        
        // 3. Aggressive Cleanup
        const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        try {
            return JSON.parse(cleanText);
        } catch (finalE) {
            console.error("JSON Parse Failed. Raw text:", text.substring(0, 200) + "...");
            throw new Error("The AI generated an invalid response structure. Please try again.");
        }
    }
}

/**
 * Compresses code for the AI context window by stripping heavy data assets.
 * This significantly reduces token usage during refinement.
 */
const compressCodeForContext = (code: string): string => {
    if (!code) return "";
    let compressed = code;
    // Replace base64 data URIs (images/audio)
    compressed = compressed.replace(/data:[a-z]+\/[a-z]+;base64,[A-Za-z0-9+/=]+/g, '<BASE64_DATA_HIDDEN>');
    // Replace heavy numeric arrays (geometry data) - generic catch for arrays with >10 numbers
    compressed = compressed.replace(/\[(\s*-?\d*\.?\d+,){10,}\s*-?\d*\.?\d+\s*\]/g, '[...GEOMETRY_DATA_HIDDEN...]');
    return compressed;
};

// --- PHASE 1: SPLIT BLUEPRINT GENERATION ---

export const generateBlueprint = async (prefs: UserPreferences, onStatus?: (status: string) => void): Promise<GeneratedGame> => {
  
  // STEP 1: QUANTIZE REQUIREMENTS
  if (onStatus) onStatus("Quantizing Requirements...");
  
  const quantizationPrompt = `
    Act as a Lead Game Designer.
    Analyze these User Specifications and output a 'Quantized Spec Sheet' (JSON).

    Specs:
    - Genre: ${prefs.genre}
    - Visual Style: ${prefs.visualStyle}
    - Camera: ${prefs.cameraPerspective}
    - Environment: ${prefs.environmentType}
    - Atmosphere: ${prefs.atmosphere}
    - Pacing: ${prefs.pacing}
    - Concept: ${prefs.projectDescription}
    - Seed: ${prefs.seed} (Use this for any procedural generation logic)

    Task:
    Extract Title, Summary, Mechanics, and Visual Requirements.
    Output pure JSON. Be creative but concise.
  `;

  let specData: any;
  try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: quantizationPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: specSchema,
          thinkingConfig: { thinkingBudget: 1024 }, 
          maxOutputTokens: 16384
        }
      });
      specData = parseAndSanitize(response.text || "{}");
  } catch (e: any) {
      throw new Error("Failed to quantize requirements: " + e.message);
  }

  // STEP 2: GENERATE ARCHITECTURE
  if (onStatus) onStatus("Architecting System...");

  const architecturePrompt = `
    Act as a Software Architect.
    Using this Quantized Spec Sheet, design the system architecture.

    Spec Sheet:
    ${JSON.stringify(specData, null, 2)}

    Platform: ${prefs.platform}
    Preferred Architecture Style: ${prefs.architectureStyle}
    Target Capabilities: GPU: ${prefs.capabilities.gpuTier}, Input: ${prefs.capabilities.input}

    Task:
    Generate Architecture, Tech Stack, and Prerequisites.
    
    STRICT RULES:
    1. Output pure JSON only.
    2. 'nodes' must describe the actual Core Loop components for this specific game.
    3. Do NOT use placeholder text like "description description".
    4. Ensure descriptions are meaningful and distinct.
    5. KEEP STRINGS CONCISE to avoid JSON errors.
  `;

  let archData: any;
  try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: architecturePrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: architectureSchema,
          thinkingConfig: { thinkingBudget: 2048 },
          maxOutputTokens: 32768
        }
      });
      archData = parseAndSanitize(response.text || "{}");
  } catch (e: any) {
      throw new Error("Failed to generate architecture: " + e.message);
  }

  return { ...specData, ...archData };
};

// --- PHASE 2: GENERATE AUDIO ASSETS (New) ---

export const generateSoundscape = async (blueprint: GeneratedGame, prefs: UserPreferences, onStatus?: (status: string) => void): Promise<GameAudio> => {
    if (onStatus) onStatus("Designing Soundscape...");

    const audioPrompt = `
      Act as a Procedural Audio Engineer.
      Create a soundscape using PURE Web Audio API JavaScript code (Oscillators, GainNodes, Filters).
      NO external files (mp3/wav). All sound must be synthesized mathematically.

      Game Context:
      - Title: ${blueprint.title}
      - Atmosphere: ${prefs.atmosphere}
      - Genre: ${prefs.genre}
      - Mechanics: ${JSON.stringify((blueprint as any).coreMechanics)}

      Task:
      1. Write a function 'playMusic(ctx)' that creates a background loop.
         - For 'Horror', use low drones and dissonance.
         - For 'Arcade', use high tempo square/sawtooth waves.
         - For 'Space', use reverb-heavy sine pads.
      2. Write functions for 3-5 distinct Sound Effects (SFX) needed for the mechanics (e.g., Jump, Shoot, Collect).

      Output JSON matching the schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: audioPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: audioSchema,
                thinkingConfig: { thinkingBudget: 2048 },
                maxOutputTokens: 32768
            }
        });
        return parseAndSanitize(response.text || "{}");
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

// --- PHASE 3: GENERATE PROTOTYPE ---

export const generatePrototype = async (blueprint: GeneratedGame, prefs: UserPreferences, audio: GameAudio | undefined, onStatus?: (status: string) => void): Promise<GeneratedGame> => {
  if (onStatus) onStatus("Synthesizing Shaders & Logic...");

  // Construct Audio Context String for the Prompt
  let audioContextStr = "NO CUSTOM AUDIO.";
  if (audio && audio.soundEffects && audio.soundEffects.length > 0) {
      audioContextStr = `
      PROCEDURAL AUDIO ASSETS (You MUST integrate these):
      
      // BACKGROUND MUSIC CODE
      ${audio.backgroundMusic}
      
      // SOUND EFFECT FUNCTIONS
      ${audio.soundEffects.map(sfx => `
      // Trigger: ${sfx.trigger}
      ${sfx.code}
      `).join('\n')}
      
      INTEGRATION INSTRUCTIONS:
      1. Embed these functions in the script.
      2. Call 'playMusic(window.audioCtx)' inside the existing 'Click to Start' handler (after audioCtx.resume()).
      3. Call the specific SFX functions (e.g., 'playJump(window.audioCtx)') inside your game logic when the event occurs.
      `;
  }

  // --- STRICT GPU ENFORCEMENT ---
  const gpuRules = prefs.capabilities.gpuTier === 'low'
      ? "STRICT CONSTRAINTS: LOW POLY ONLY. MAX 100 INSTANCES. NO DYNAMIC SHADOWS. USE BAKED LIGHTING OR VERTEX COLORS. MOBILE OPTIMIZED SHADERS."
      : "CONSTRAINTS: HIGH POLY ALLOWED. DYNAMIC LIGHTING ENABLED. POST-PROCESSING (BLOOM) ALLOWED. TARGET 60FPS DESKTOP.";

  const prototypePrompt = `
    Act as an Expert 3D Web Graphics Engineer.

    BLUEPRINT:
    - Title: ${blueprint.title}
    - Summary: ${blueprint.summary}
    - Mechanics: ${JSON.stringify((blueprint as any).coreMechanics)}
    - Visuals: ${JSON.stringify((blueprint as any).visualRequirements)}

    USER SETTINGS (Strict Enforcement):
    - Style: ${prefs.visualStyle}
    - Camera: ${prefs.cameraPerspective}
    - Env: ${prefs.environmentType}
    - Atmo: ${prefs.atmosphere}
    - PROTOTYPE QUALITY: ${prefs.quality}
    - GPU TIER: ${prefs.capabilities.gpuTier}
    
    ${gpuRules}
    
    DETERMINISTIC SEED: "${prefs.seed}"
    You MUST implement a seeded random number generator (PRNG) and use it for ALL procedural generation (positions, colors, loot).
    
    AUDIO SYSTEM:
    ${audioContextStr}

    Task:
    Build a single-file HTML/JS/WebGL prototype (Three.js).
    
    CRITICAL IMPLEMENTATION RULES (READ CAREFULLY):
    1. Imports: 
       - Core: import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
       - Controls (FPS): import { PointerLockControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js';
       - Controls (Orbit): import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
    
    2. MODULE BOUNDARIES:
       - You MUST organize code into commented sections:
       // --- MODULE: CORE ---
       // --- MODULE: RENDERER ---
       // --- MODULE: INPUT ---
       // --- MODULE: PHYSICS ---
       // --- MODULE: GAMEPLAY ---
    
    3. 'CLICK TO PLAY' OVERLAY (MANDATORY):
       - You MUST include a <div id="overlay">...</div> covering the screen.
       - You MUST add a click event listener to this overlay that:
         a) Hides the overlay (style.display = 'none').
         b) Initializes 'window.audioCtx = new (window.AudioContext || window.webkitAudioContext)()'.
         c) Resumes AudioContext.
         d) CALLS THE 'playMusic(window.audioCtx)' FUNCTION PROVIDED ABOVE.
         e) Locks Pointer (controls.lock() or document.body.requestPointerLock()).
    
    4. TELEMETRY:
       ${prefs.capabilities.telemetry ? 
       `You MUST inject the following telemetry loop at the end of your requestAnimationFrame loop:
        // --- TELEMETRY INJECTION ---
        if (window.parent) {
             const now = performance.now();
             if (!window.lastTelUpdate || now - window.lastTelUpdate > 500) { // Update every 500ms
                 window.lastTelUpdate = now;
                 // Estimate fps roughly or use a frame counter
                 const fps = Math.round(1000 / (now - (window.lastFrameTime || now))); 
                 window.lastFrameTime = now;
                 const entities = scene ? scene.children.length : 0;
                 window.parent.postMessage({ type: 'forge-telemetry', fps: fps, entities: entities }, '*');
             }
        }` : ''}

    5. SEED IMPLEMENTATION:
       Include this class and use 'rng.next()' instead of 'Math.random()':
       class SeededRandom {
          constructor(seed) { this.seed = this.hash(seed); }
          hash(str) { let h = 0xdeadbeef; for(let i=0;i<str.length;i++) h = Math.imul(h ^ str.charCodeAt(i), 2654435761); return (h ^ h >>> 16) >>> 0; }
          next() { this.seed = (this.seed * 1664525 + 1013904223) % 4294967296; return this.seed / 4294967296; }
       }
       const rng = new SeededRandom("${prefs.seed}");

    Output: JSON with 'html' string and 'instructions'.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prototypePrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: prototypeSchema,
        thinkingConfig: { thinkingBudget: 4096 }, // Increased for better code quality
        maxOutputTokens: 65536 // Maximize for full code output
      }
    });
    const prototypeData = parseAndSanitize(response.text || "{}");

    // Generate Manifest
    const specHash = generateShortHash(JSON.stringify(blueprint));
    const buildHash = generateShortHash(prototypeData.html || "");
    
    const manifest: ForgeManifest = {
        version: "1.0.0",
        timestamp: Date.now(),
        seed: prefs.seed,
        specHash: specHash,
        buildHash: buildHash,
        platform: prefs.platform,
        quality: prefs.quality
    };

    return {
        ...blueprint,
        html: prototypeData.html,
        instructions: prototypeData.instructions,
        audio: audio,
        manifest: manifest
    };
  } catch (error: any) {
    throw new Error("Prototype Generation Failed: " + error.message);
  }
};

// --- PHASE 4: DIFFERENTIAL REFINEMENT ---

export const refineGame = async (currentGame: GeneratedGame, instruction: string): Promise<GeneratedGame> => {
    // Compress context to save tokens (remove huge assets)
    const contextCode = compressCodeForContext(currentGame.html || "");

    const prompt = `
      Act as a Game Programmer.
      User Instruction: "${instruction}"
      
      Original Code (Data assets hidden for brevity):
      ${contextCode}
      
      Task:
      Determine if this is a minor fix (use 'patch' mode) or a major overhaul (use 'rewrite' mode).
      
      STRATEGY:
      1. 'patch': Use for tweaking variables, changing colors, small logic fixes. Provide 'edits'.
      2. 'rewrite': Use for adding new systems, changing control schemes, structural refactoring, or if the original code is missing critical chunks. Provide 'fullCode'.

      IMPORTANT: Do not try to replace <BASE64_DATA_HIDDEN> placeholders in patch mode. If you need to change data, use 'rewrite'.
      
      REMINDER: Maintain the 'Click to Start' overlay logic and AUDIO handling.
    `;
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: refinementSchema,
          thinkingConfig: { thinkingBudget: 4096 }, // Increased thinking for complex refactors
          maxOutputTokens: 65536 // Increased to allow full file rewrite if needed
        }
      });
      
      const result = parseAndSanitize(response.text || "{}");
      
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
                 const normalize = (str: string) => str.replace(/\s+/g, ' ').trim();
                 
                 console.warn("Patch skipped - strict match failed. Attempting fuzzy match is risky, skipping.");
                 // In production, we might use diff-match-patch here.
                 // For now, we rely on the AI choosing 'rewrite' if it's unsure.
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