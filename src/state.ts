import type { PatternName } from "./patterns";
import type { MaskName } from "./masks";
export { PATTERNS } from "./patterns";
export { MASKS } from "./masks";

export type Align = "left" | "center" | "right";

export type LayerKey = "background" | "pattern" | "logo" | "text";

export interface DesignState {
  text: string;
  uppercase: boolean;
  italic: boolean;
  font: string;
  fontSize: number;
  weight: number;
  letterSpacing: number;
  lineHeight: number;
  posX: number;
  posY: number;
  textRotation: number;
  align: Align;

  textGradient: boolean;
  textColor: string;
  textColor2: string;
  transparentText: boolean;
  textShadow: boolean;
  shadowBlur: number;
  shadowOpacity: number;
  textGlow: boolean;

  transparent: boolean;
  bgGradient: boolean;
  bgColor: string;
  bgColor2: string;

  pattern: PatternName;
  patternColor: string;
  glassPanel: boolean;
  borderGlow: boolean;

  bgImageDataUrl: string | null;
  bgBlur: number;
  bgChromatic: number;
  bgWaveAmount: number;
  bgWaveFrequency: number;
  bgGlitch: number;
  bgFilmGrain: number;
  bgHalftone: boolean;
  bgVignette: number;
  bgPixelate: boolean;
  bgBloom: number;
  bgLongShadow: boolean;
  bgEcho: number;
  bgDuotone: number;
  duotoneColorA: string;
  duotoneColorB: string;
  duotoneIntensity: number;

  mask: MaskName;
  logoDataUrl: string | null;
  logoScale: number;

  animation: string;
  animateBg: boolean;

  gifDuration: number;
  gifFps: number;
  gifQuality: number;
  gifMaxSize: number;
  gifLoop: boolean;

  layers: Record<LayerKey, boolean>;

  activePreset: string | null;
}

export const FONTS = [
  "Bebas Neue",
  "Inter",
  "Playfair Display",
  "Montserrat",
  "Oswald",
  "Anton",
  "Archivo Black",
  "Cinzel",
  "Space Grotesk",
  "Orbitron",
  "Rubik Mono One",
  "Russo One",
  "Audiowide",
  "Unbounded",
  "Teko",
  "Barlow Condensed",
  "Big Shoulders Display",
  "Sora",
  "DM Serif Display",
  "Cormorant Garamond",
  "Manrope",
  "Poppins",
  "Rajdhani",
] as const;

export const ANIMATIONS = [
  "None",
  "Pulse",
  "Slide In",
  "Slide ← In",
  "Slide → In",
  "Slide ↑ In",
  "Slide ↓ In",
  "Fade In",
  "Zoom In",
  "Zoom Out",
  "Typewriter",
  "Glow Pulse",
  "Bounce",
  "Shake",
  "Wave",
  "Rotate",
  "Swing",
  "Flip",
  "Float",
  "Rainbow",
  "Blink",
] as const;

export function createDefaultState(): DesignState {
  return {
    text: "Insert text",
    uppercase: false,
    italic: false,
    font: "Bebas Neue",
    fontSize: 220,
    weight: 700,
    letterSpacing: 4,
    lineHeight: 1.2,
    posX: 50,
    posY: 50,
    textRotation: 0,
    align: "center",

    textGradient: false,
    textColor: "#ffffff",
    textColor2: "#9aa0ff",
    transparentText: false,
    textShadow: false,
    shadowBlur: 40,
    shadowOpacity: 0.6,
    textGlow: false,

    transparent: false,
    bgGradient: true,
    bgColor: "#0b0b12",
    bgColor2: "#1b1b3a",

    pattern: "None",
    patternColor: "#ffffff",
    glassPanel: false,
    borderGlow: false,

    mask: "None",
    logoDataUrl: null,
    logoScale: 0.3,

    bgImageDataUrl: null,
    bgBlur: 0,
    bgChromatic: 0,
    bgWaveAmount: 0,
    bgWaveFrequency: 4,
    bgGlitch: 0,
    bgFilmGrain: 0,
    bgHalftone: false,
    bgVignette: 0,
    bgPixelate: false,
    bgBloom: 0,
    bgLongShadow: false,
    bgEcho: 0,
    bgDuotone: 0,
    duotoneColorA: "#0b0b12",
    duotoneColorB: "#9aa0ff",
    duotoneIntensity: 0,

    animation: "None",
    animateBg: false,

    gifDuration: 1.2,
    gifFps: 16,
    gifQuality: 15,
    gifMaxSize: 500,
    gifLoop: true,

    layers: { background: true, pattern: true, logo: true, text: true },

    activePreset: null,
  };
}
