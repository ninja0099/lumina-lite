import type { DesignState } from "./state";

export interface Preset {
  name: string;
  apply: Partial<DesignState>;
}

export const PRESETS: Preset[] = [
  { name: "Pure Black", apply: { bgGradient: false, bgColor: "#000000", textColor: "#ffffff" } },
  { name: "Light", apply: { bgGradient: false, bgColor: "#f4f4f6", textColor: "#111118", textGradient: false } },
  { name: "Action", apply: { bgGradient: true, bgColor: "#7a0d0d", bgColor2: "#1a0202", textColor: "#ffd54a", font: "Anton" } },
  { name: "Sci-Fi", apply: { bgGradient: true, bgColor: "#03102b", bgColor2: "#0a3a5c", textColor: "#7df9ff", font: "Orbitron" } },
  { name: "Minimal", apply: { bgGradient: false, bgColor: "#ffffff", textColor: "#0b0b12", font: "Inter", letterSpacing: 8 } },
  { name: "Noir", apply: { bgGradient: true, bgColor: "#101012", bgColor2: "#2b2b30", textColor: "#e8e8e8", font: "Cinzel" } },
  { name: "Apple Glass", apply: { bgGradient: true, bgColor: "#dbe6ff", bgColor2: "#9fb3ff", textColor: "#0b1020", font: "Sora" } },
  { name: "Netflix", apply: { bgGradient: false, bgColor: "#000000", textColor: "#e50914", font: "Bebas Neue" } },
  { name: "HBO Max", apply: { bgGradient: true, bgColor: "#120016", bgColor2: "#3a0050", textColor: "#b06bff", font: "Big Shoulders Display" } },
  { name: "Disney+", apply: { bgGradient: true, bgColor: "#011b3a", bgColor2: "#0a4c8c", textColor: "#ffffff", font: "Poppins" } },
  { name: "Paramount+", apply: { bgGradient: true, bgColor: "#001a2e", bgColor2: "#00568c", textColor: "#ffd23f", font: "Archivo Black" } },
  { name: "Apple TV+", apply: { bgGradient: false, bgColor: "#000000", textColor: "#ffffff", font: "Sora" } },
  { name: "Prime Video", apply: { bgGradient: true, bgColor: "#0c1a2b", bgColor2: "#0a3a5c", textColor: "#00a8e1", font: "Inter" } },
  { name: "Hulu", apply: { bgGradient: true, bgColor: "#0a2e1a", bgColor2: "#1f8a4c", textColor: "#9cff5a", font: "Montserrat" } },
  { name: "Peacock", apply: { bgGradient: true, bgColor: "#10204a", bgColor2: "#2f6bff", textColor: "#ffffff", font: "Poppins" } },
  { name: "Max", apply: { bgGradient: true, bgColor: "#1a0033", bgColor2: "#5a00a3", textColor: "#c77dff", font: "Big Shoulders Display" } },
  { name: "SkyShowtime", apply: { bgGradient: true, bgColor: "#001b3a", bgColor2: "#6a1b9a", textColor: "#20e3b2", font: "Space Grotesk" } },
  { name: "Gold", apply: { bgGradient: true, bgColor: "#2a1c00", bgColor2: "#7a5500", textColor: "#ffd700", font: "Cinzel" } },
  { name: "Ice", apply: { bgGradient: true, bgColor: "#04263b", bgColor2: "#7fd4ff", textColor: "#ffffff", font: "Russo One" } },
  { name: "Fire", apply: { bgGradient: true, bgColor: "#2b0500", bgColor2: "#ff5a1f", textColor: "#ffe08a", font: "Oswald" } },
];
