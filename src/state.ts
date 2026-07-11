import type { PatternName } from "./patterns";
export { PATTERNS } from "./patterns";

export type Align = "left" | "center" | "right";

export type LayerKey = "background" | "pattern" | "text";

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
  bgGradientAngle: number;
  cornerRadius: number;

  exportFormat: "png" | "jpeg" | "webp";
  exportQuality: number;

  pattern: PatternName;
  patternColor: string;
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
  bgDuotone: number;
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
    bgGradientAngle: 135,
    cornerRadius: 0,

    exportFormat: "png",
    exportQuality: 0.92,

    pattern: "None",
    patternColor: "#ffffff",
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
