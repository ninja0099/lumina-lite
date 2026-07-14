// Coloris distribution wrapper. The vendored Coloris ships as a UMD IIFE
// that assigns `Coloris` to `window`. We import it for side-effects, then
// re-export the global to keep callers in main.ts free of `window.` clutter.

import "./coloris.min.js";

interface ColorisOptions {
  el?: string | HTMLElement | HTMLElement[];
  parent?: string | HTMLElement;
  theme?: "default" | "large" | "polaroid" | "pill";
  themeMode?: "light" | "dark" | "auto";
  format?: "hex" | "rgb" | "hsl" | "auto" | "mixed";
  formatToggle?: boolean;
  alpha?: boolean;
  forceAlpha?: boolean;
  swatches?: string[];
  swatchesOnly?: boolean;
  focusInput?: boolean;
  selectInput?: boolean;
  clearButton?: boolean;
  clearLabel?: string;
  closeButton?: boolean;
  closeLabel?: string;
  margin?: number;
  wrap?: boolean;
  rtl?: boolean;
  inline?: boolean;
  defaultColor?: string;
  onChange?: (color: string, input: HTMLElement) => void;
}

interface ColorisNamespace {
  (options?: ColorisOptions): void;
  setInstance(selector: string, options: ColorisOptions): void;
  close(): void;
}

declare global {
  interface Window {
    Coloris: ColorisNamespace;
  }
}

const Coloris: ColorisNamespace = window.Coloris;
export default Coloris;
