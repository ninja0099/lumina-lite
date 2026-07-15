import type { PatternName } from "./patterns";
export { PATTERNS } from "./patterns";

export type Align = "left" | "center" | "right";

export type LayerKey = "background" | "pattern" | "text";

export type BgMode = "linear" | "mesh";

export type MeshMode = "stacked" | "merge";

export interface MeshNode {
  x: number; // center x, percent of width (0-100)
  y: number; // center y, percent of height (0-100)
  color: string;
  radius: number; // blob radius, percent of min(w,h)
  opacity: number; // 0-1, per-node alpha
  softness: number; // 0-1: position of the falloff stop (0 = full linear fade, 1 = hard orb)
  locked?: boolean; // if true, palette refresh preserves this node's color
}

export type MeshAnimStyle =
  | "float"
  | "orbit"
  | "breathe"
  | "wave"
  | "drift"
  | "swarm"
  | "roam";

export interface DesignState {
  text: string;
  uppercase: boolean;
  italic: boolean;
  font: string;
  fontSize: number;
  fontSizeUnit: "px" | "pct";
  weight: number;
  weightUnit: "weight" | "px";
  letterSpacing: number;
  letterSpacingUnit: "px" | "pct";
  lineHeight: number;
  lineHeightUnit: "ratio" | "px";
  posX: number;
  posXUnit: "px" | "pct";
  posY: number;
  posYUnit: "px" | "pct";
  textRotation: number;
  align: Align;

  textGradient: boolean;
  textColor: string;
  textColor2: string;
  textGradientAngle: number;
  transparentText: boolean;
  textShadow: boolean;
  shadowBlur: number;
  shadowOpacity: number;
  shadowColor: string;
  textGlow: boolean;

  textOpacity: number;
  textOutline: boolean;
  textOutlineWidth: number;
  textOutlineColor: string;

  transparent: boolean;
  bgGradient: boolean;
  bgGradientOpacity: number;
  bgColor: string;
  bgColor2: string;
  bgColorMid: string;
  bgUseColorMid: boolean;
  bgGradientType: "linear" | "radial" | "conic";
  bgGradientAngle: number;
  cornerRadius: number;

  bgMode: BgMode;
  meshNodes: MeshNode[];
  meshMode: MeshMode;
  meshSpread: number;
  meshBlur: number;
  meshBaseOpacity: number; // alpha of the solid base fill (0 = transparent)
  meshAnim: boolean;
  meshAnimStyle: MeshAnimStyle;
  meshAnimSpeed: number;
  meshAnimAmplitude: number;
  meshAnimDuration: number;

  exportW: number;
  exportH: number;

  exportFormat: "png" | "jpeg" | "webp";

  pattern: PatternName;
  patternColor: string;
  patternOpacity: number;
  glassPanel: boolean;
  borderGlow: boolean;

  bgImageDataUrl: string | null;
  bgImageOpacity: number;
  bgImageX: number;
  bgImageY: number;
  bgImageRotation: number;
  bgImageFit: "cover" | "contain" | "stretch" | "tile";
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
  bgDuotone: 0 | 1;
  duotoneColorA: string;
  duotoneColorB: string;
  duotoneIntensity: number;

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

export function createDefaultState(): DesignState {
  return {
    text: "Insert text",
    uppercase: false,
    italic: false,
    font: "Bebas Neue",
    fontSize: 220,
    fontSizeUnit: "px",
    weight: 700,
    weightUnit: "weight",
    letterSpacing: 4,
    letterSpacingUnit: "px",
    lineHeight: 1.2,
    lineHeightUnit: "ratio",
    posX: 50,
    posXUnit: "pct",
    posY: 50,
    posYUnit: "pct",
    textRotation: 0,
    align: "center",

    textGradient: false,
    textColor: "#ffffff",
    textColor2: "#9aa0ff",
    textGradientAngle: 135,
    transparentText: false,
    textShadow: false,
    shadowBlur: 40,
    shadowOpacity: 0.6,
    shadowColor: "#000000",
    textGlow: false,

    textOpacity: 1,
    textOutline: false,
    textOutlineWidth: 4,
    textOutlineColor: "#000000",

    transparent: false,
    bgGradient: true,
    bgGradientOpacity: 0.45,
    bgColor: "#0b0b12",
    bgColor2: "#1b1b3a",
    bgColorMid: "#4a2a6a",
    bgUseColorMid: true,
    bgGradientType: "linear",
    bgGradientAngle: 135,
    cornerRadius: 0,

    bgMode: "linear",
    meshNodes: [
      { x: 25, y: 30, color: "#7a0d0d", radius: 60, opacity: 1, softness: 0 },
      { x: 80, y: 25, color: "#1b1b3a", radius: 60, opacity: 1, softness: 0 },
      { x: 55, y: 80, color: "#9aa0ff", radius: 60, opacity: 1, softness: 0 },
    ],
    meshMode: "stacked",
    meshSpread: 5,
    meshBlur: 30,
    meshBaseOpacity: 1,
    meshAnim: false,
    meshAnimStyle: "float",
    meshAnimSpeed: 1,
    meshAnimAmplitude: 15,
    meshAnimDuration: 6,

    exportW: 1920,
    exportH: 1080,

    exportFormat: "png",

    pattern: "None",
    patternColor: "#ffffff",
    patternOpacity: 1,
    glassPanel: false,
    borderGlow: false,

    bgImageDataUrl: null,
    bgImageOpacity: 0.6,
    bgImageX: 50,
    bgImageY: 50,
    bgImageRotation: 0,
    bgImageFit: "cover",
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

    layers: { background: true, pattern: true, text: true },

    activePreset: null,
  };
}
