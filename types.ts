
export enum Genre {
  FPS = 'First Person Shooter',
  RPG = 'Role Playing Game',
  Racing = 'Racing / Vehicle',
  Simulation = 'Simulation',
  Puzzle = 'Puzzle',
  Platformer = '3D Platformer',
  Arcade = 'Arcade / Action',
  Horror = 'Survival Horror',
  Strategy = 'Strategy / RTS'
}

export enum Platform {
  Web = 'Web (WebGL/WebGPU)',
  Desktop = 'Desktop (Windows/Mac/Linux)',
  Mobile = 'Mobile (iOS/Android)',
  Console = 'Console (PS5/Xbox/Switch)'
}

export enum SkillLevel {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Advanced = 'Advanced'
}

export enum ArchitectureStyle {
  Auto = 'AI Recommended',
  ECS = 'Entity Component System (ECS)',
  OOP = 'Object Oriented (OOP)',
  Functional = 'Functional / Reactive',
  DataOriented = 'Data Oriented Design'
}

// --- NEW DESIGN SETTINGS ---

export enum VisualStyle {
  Minimalist = 'Minimalist / Abstract',
  LowPoly = 'Low Poly / Flat Shaded',
  Cyberpunk = 'Cyberpunk / Neon',
  Retro = 'Retro / Voxel',
  Noir = 'Noir / High Contrast',
  Realistic = 'Realistic (PBR Simulated)',
  Toon = 'Toon / Cel Shaded'
}

export enum CameraPerspective {
  FirstPerson = 'First Person (FPS)',
  ThirdPerson = 'Third Person (Over Shoulder)',
  Isometric = 'Isometric / Top-Down',
  SideScroller = 'Side Scroller (2.5D)',
  Orbital = 'Orbital / God View'
}

export enum EnvironmentType {
  Arena = 'Arena / Enclosed',
  Dungeon = 'Dungeon / Corridors',
  OpenWorld = 'Open Field / Terrain',
  City = 'Urban / Cityscape',
  Space = 'Space / Void',
  Interior = 'Interior / House'
}

export enum Atmosphere {
  Sunny = 'Bright / Sunny',
  Dark = 'Dark / Horror',
  Neon = 'Night / Neon',
  Foggy = 'Misty / Foggy',
  Space = 'Starfield / Void'
}

export enum Pacing {
  Arcade = 'Fast / Arcade',
  Tactical = 'Slow / Tactical',
  Simulation = 'Real-time / Simulation',
  TurnBased = 'Turn-Based / Static'
}

// --- PRO FEATURES ---

export enum GameEngine {
  ThreeJS = 'Three.js (Standard)',
  ThreeJS_WebGPU = 'Three.js (WebGPU Experimental)',
  P5JS = 'p5.js (Creative Coding)',
  BabylonJS = 'Babylon.js (Enterprise 3D)',
  KaboomJS = 'Kaboom.js (2D/Retro)',
  RawWebGL = 'Raw WebGL (No Engine)'
}

export enum QualityLevel {
  Sketch = 'Sketch (Low Detail, Fast)',
  Prototype = 'Prototype (Standard)',
  VerticalSlice = 'Vertical Slice (High Polish)'
}

export interface CapabilityFlags {
  gpuTier: 'low' | 'mid' | 'high';
  input: 'mouse' | 'touch' | 'gamepad';
  telemetry: boolean;
}

export interface UserPreferences {
  // Core
  genre: Genre;
  platform: Platform;
  gameEngine: GameEngine;
  skillLevel: SkillLevel;
  architectureStyle: ArchitectureStyle;
  projectDescription: string;
  
  // Design & Assets
  visualStyle: VisualStyle;
  cameraPerspective: CameraPerspective;
  environmentType: EnvironmentType;
  atmosphere: Atmosphere;
  pacing: Pacing;

  // Pro Features
  seed: string;
  quality: QualityLevel;
  capabilities: CapabilityFlags;
}

export interface ArchitectureNode {
  name: string;
  type: 'system' | 'component' | 'data' | 'pattern';
  description: string;
}

export interface TechStackItem {
  category: string;
  name: string;
  description: string;
  link?: string;
}

export interface Prerequisite {
  item: string;
  command?: string;
  importance: 'Critical' | 'Recommended' | 'Optional';
}

export interface GameAudio {
  description: string;
  backgroundMusic: string; // Javascript code
  soundEffects: {
    name: string;
    trigger: string;
    code: string; // Javascript code
  }[];
}

export interface RefinementSettings {
  temperature: number;      // Creativity (0.0 - 2.0)
  maxOutputTokens: number;  // Length
  topP: number;            // Probability Mass
  topK: number;            // Token Pool Size
}

export interface ForgeManifest {
  version: string;
  timestamp: number;
  seed: string;
  specHash: string; // Hash of the blueprint
  buildHash: string; // Hash of the generated HTML
  platform: Platform;
  quality: QualityLevel;
  parentHash?: string; // For diffing/lineage
}

export interface GeneratedGame {
  title: string;
  summary: string;
  
  // Playable Prototype
  html?: string; 
  instructions?: string; 

  // Architectural Advice
  recommendedEngine: string;
  language: string;
  architecture: {
    style: string;
    description: string;
    nodes: ArchitectureNode[];
  };
  techStack: TechStackItem[];
  prerequisites: Prerequisite[];
  
  // Assets
  audio?: GameAudio;
  
  // Metadata
  manifest?: ForgeManifest;
}

export interface TokenTransaction {
  id: string;
  timestamp: number;
  action: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}
