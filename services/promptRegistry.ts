import { UserPreferences, GeneratedGame, GameAudio, GameEngine } from "../types";

/**
 * PROMPT REGISTRY
 * Centralized storage for all System Instructions and Prompts.
 * Allows for easy A/B testing and updates without touching logic code.
 */

const ENGINE_SPECS: Record<string, string> = {
  [GameEngine.ThreeJS]: `
    FRAMEWORK: Three.js (Standard WebGL)
    IMPORTS: 
      import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
      import { PointerLockControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js';
      import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';
    BOILERPLATE: Standard Scene, Camera, WebGLRenderer.
    CHECK: Ensure canvas is attached to body.
  `,
  [GameEngine.ThreeJS_WebGPU]: `
    FRAMEWORK: Three.js (WebGPU - Experimental)
    IMPORTS: 
       import * as THREE from 'https://unpkg.com/three@0.167.0/build/three.module.js';
       import WebGPURenderer from 'https://unpkg.com/three@0.167.0/examples/jsm/renderers/webgpu/WebGPURenderer.js';
       import { PointerLockControls } from 'https://unpkg.com/three@0.167.0/examples/jsm/controls/PointerLockControls.js';
    BOILERPLATE: 
       const renderer = new WebGPURenderer({ antialias: true });
       await renderer.init();
    IMPORTANT: Do NOT use legacy materials if possible, use MeshStandardMaterialNode or standard materials compatible with WebGPU.
  `,
  [GameEngine.P5JS]: `
    FRAMEWORK: p5.js (Creative Coding)
    IMPORTS: None (Global Mode via CDN)
    INJECTION: You MUST include this script tag in the HTML head: <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.js"></script>
    BOILERPLATE: 
       function setup() { createCanvas(windowWidth, windowHeight, WEBGL); ... }
       function draw() { ... }
       function windowResized() { resizeCanvas(windowWidth, windowHeight); }
    NOTE: Use 'WEBGL' mode in createCanvas for 3D requirements. Use p5's immediate mode geometry (box, sphere) or loadModel.
  `,
  [GameEngine.BabylonJS]: `
    FRAMEWORK: Babylon.js
    IMPORTS: None (Global via CDN)
    INJECTION: <script src="https://cdn.babylonjs.com/babylon.js"></script><script src="https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js"></script>
    BOILERPLATE:
       const canvas = document.getElementById("renderCanvas"); // Create this canvas
       const engine = new BABYLON.Engine(canvas, true);
       const createScene = function() { ... return scene; };
       const scene = createScene();
       engine.runRenderLoop(function () { scene.render(); });
  `,
  [GameEngine.KaboomJS]: `
    FRAMEWORK: Kaboom.js
    IMPORTS: import kaboom from "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.mjs";
    BOILERPLATE:
       kaboom({ background: [0,0,0] });
       // Define scenes and go('main');
    NOTE: This is a 2D engine. If the user asked for 3D, simulate it or create a 2.5D pseudo-3D style.
  `,
  [GameEngine.RawWebGL]: `
    FRAMEWORK: Raw WebGL API (No Engine)
    IMPORTS: None.
    BOILERPLATE: 
       const gl = canvas.getContext("webgl");
       // You must write the vertex and fragment shaders as string variables.
       // You must handle buffer creation, linking, and the draw loop manually.
    WARNING: Keep it simple. A colored cube or basic terrain is sufficient given the complexity.
  `
};

export const PromptRegistry = {
  
  // --- BLUEPRINT PHASE ---
  
  QuantizeRequirements: (prefs: UserPreferences) => `
    Act as a Lead Game Designer.
    Analyze these User Specifications and output a 'Quantized Spec Sheet' (JSON).

    Specs:
    - Target Engine: ${prefs.gameEngine}
    - Genre: ${prefs.genre}
    - Visual Style: ${prefs.visualStyle}
    - Camera: ${prefs.cameraPerspective}
    - Environment: ${prefs.environmentType}
    - Atmosphere: ${prefs.atmosphere}
    - Pacing: ${prefs.pacing}
    - Concept: ${prefs.projectDescription}
    - Seed: ${prefs.seed}

    Task:
    Extract Title, Summary, Mechanics, and Visual Requirements.
    Output pure JSON. Be creative but concise.
  `,

  ArchitectSystem: (specData: any, prefs: UserPreferences) => `
    Act as a Software Architect.
    Using this Quantized Spec Sheet, design the system architecture.

    Spec Sheet:
    ${JSON.stringify(specData, null, 2)}

    Platform: ${prefs.platform}
    Engine: ${prefs.gameEngine}
    Preferred Architecture Style: ${prefs.architectureStyle}
    Target Capabilities: GPU: ${prefs.capabilities.gpuTier}

    Task:
    Generate Architecture, Tech Stack, and Prerequisites.
    
    STRICT RULES:
    1. Output pure JSON only.
    2. 'nodes' must describe the actual Core Loop components for this specific game.
    3. Ensure descriptions are meaningful and distinct.
    4. KEEP STRINGS CONCISE to avoid JSON errors.
  `,

  // --- ASSET PHASE ---

  DesignSoundscape: (blueprint: GeneratedGame, prefs: UserPreferences) => `
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
    2. Write functions for 3-5 distinct Sound Effects (SFX) needed for the mechanics.

    Output JSON matching the schema.
  `,

  // --- PROTOTYPE PHASE ---

  BuildPrototype: (blueprint: GeneratedGame, prefs: UserPreferences, audioContextStr: string, gpuRules: string) => `
    Act as an Expert Creative Coder and Game Engine Specialist.

    BLUEPRINT:
    - Title: ${blueprint.title}
    - Mechanics: ${JSON.stringify((blueprint as any).coreMechanics)}
    - Visuals: ${JSON.stringify((blueprint as any).visualRequirements)}

    USER SETTINGS (Strict Enforcement):
    - ENGINE: ${prefs.gameEngine}
    - PLATFORM: ${prefs.platform}
    - INPUT MODE: ${prefs.capabilities.input}
    - Style: ${prefs.visualStyle}
    - Camera: ${prefs.cameraPerspective}
    - Env: ${prefs.environmentType}
    - PROTOTYPE QUALITY: ${prefs.quality}
    - GPU TIER: ${prefs.capabilities.gpuTier}
    
    ${gpuRules}

    ENGINE SPECIFIC INSTRUCTIONS:
    ${ENGINE_SPECS[prefs.gameEngine] || ENGINE_SPECS[GameEngine.ThreeJS]}
    
    DETERMINISTIC SEED: "${prefs.seed}"
    You MUST implement a seeded random number generator (PRNG) and use it for ALL procedural generation.
    
    AUDIO SYSTEM:
    ${audioContextStr}

    Task:
    Build a single-file HTML/JS prototype.
    
    CRITICAL IMPLEMENTATION RULES:
    1. SINGLE FILE: All HTML, CSS, and JS must be in one string.
    2. MODULE BOUNDARIES: Organize code into commented sections (CORE, RENDERER, INPUT, LOGIC).
    3. 'CLICK TO PLAY' OVERLAY (MANDATORY):
       - You MUST include a <div id="overlay">...</div> covering the screen.
       - You MUST add a click event listener to this overlay to unlock AudioContext and start the loop.
    
    4. TELEMETRY:
       ${prefs.capabilities.telemetry ? 
       `You MUST inject telemetry code to post 'forge-telemetry' messages with fps and entities count to window.parent.` : ''}

    Output: JSON with 'html' string and 'instructions'.
  `,

  // --- REFINEMENT PHASE ---

  RefineCode: (instruction: string, contextCode: string) => `
    Act as a Game Programmer.
    User Instruction: "${instruction}"
    
    Original Code (Data assets hidden for brevity):
    ${contextCode}
    
    Task:
    Determine if this is a minor fix (use 'patch' mode) or a major overhaul (use 'rewrite' mode).
    
    STRATEGY:
    1. 'patch': Use for tweaking variables, changing colors, small logic fixes. Provide 'edits'.
    2. 'rewrite': Use for adding new systems, changing control schemes, structural refactoring, or if the original code is missing critical chunks. Provide 'fullCode'.
  `
};