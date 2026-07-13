// Shared color math used by the OKLCH picker and the palette generator.
// Keep this file dependency-free (no imports from main.ts) so the picker
// can stand alone.

export interface Oklab {
  L: number;
  a: number;
  b: number;
}

// OKLCH -> OKLab (cheap, no sRGB roundtrip in the inner loop).
export function oklchToOklab(L: number, C: number, hueDeg: number): Oklab {
  const hr = (hueDeg * Math.PI) / 180;
  return { L, a: C * Math.cos(hr), b: C * Math.sin(hr) };
}

// OKLab -> linear sRGB (Björn Ottosson coefficients). Returns true on
// success; false if any channel falls outside [0, 1] (chroma too high
// for that hue on this monitor gamut).
export function oklabToLinearSrgb(L: number, a: number, b: number): [number, number, number, boolean] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const lc = l_ ** 3, mc = m_ ** 3, sc = s_ ** 3;
  const r =  4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  const g = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  const bl = -0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc;
  const inGamut = r >= 0 && r <= 1 && g >= 0 && g <= 1 && bl >= 0 && bl <= 1;
  return [r, g, bl, inGamut];
}

// OKLCH -> sRGB hex (clamps chroma on out-of-gamut, then gamma-encodes).
export function oklchToHex(L: number, C: number, hueDeg: number): string {
  let lab = oklchToOklab(L, C, hueDeg);
  let [, , , inGamut] = oklabToLinearSrgb(lab.L, lab.a, lab.b);
  let c = C;
  for (let k = 0; k < 8 && !inGamut; k++) {
    c *= 0.8;
    lab = oklchToOklab(L, c, hueDeg);
    [, , , inGamut] = oklabToLinearSrgb(lab.L, lab.a, lab.b);
  }
  const [r, g, bl] = oklabToLinearSrgb(lab.L, lab.a, lab.b);
  const toSrgb = (v: number): number =>
    v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  const toHex = (v: number): string =>
    Math.round(Math.min(1, Math.max(0, toSrgb(v))) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

// Hex -> {0..1} rgb + OKLCH (L 0..1, C 0..~0.4, hue 0..360).
// Accepts "#rgb", "#rrggbb", with or without leading #. Returns null on bad input.
export interface Oklch { L: number; C: number; h: number; }
export interface Rgb { r: number; g: number; b: number; }

export function parseHex(input: string): { hex: string; rgb: Rgb; oklch: Oklch } | null {
  let s = input.trim().toLowerCase();
  if (s.startsWith("#")) s = s.slice(1);
  if (!/^[0-9a-f]+$/.test(s)) return null;
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  if (s.length !== 6) return null;
  const v = parseInt(s, 16);
  const r = ((v >> 16) & 0xff) / 255;
  const g = ((v >> 8) & 0xff) / 255;
  const b = (v & 0xff) / 255;
  return { hex: `#${s}`, rgb: { r, g, b }, oklch: rgbToOklch(r, g, b) };
}

// sRGB (0..1) -> OKLCH. Björn Ottosson linear sRGB -> OKLab then to polar.
// Inverse of `oklabToLinearSrgb`, but tristimulated via the standard sRGB->XYZ->Lab->OKLab chain.
export function rgbToOklch(r: number, g: number, b: number): Oklch {
  const toLin = (v: number): number =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const rl = toLin(r), gl = toLin(g), bl = toLin(b);
  const x = 0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl;
  const y = 0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl;
  const z = 0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl;
  // OKLab from XYZ (Björn Ottosson)
  const l_ = 0.2104542553 * x + 0.7936177850 * y - 0.0040720468 * z;
  const m_ = 1.9779984951 * x - 2.4285922420 * y + 0.4505937099 * z;
  const s_ = 0.0259040371 * x + 0.7827717662 * y - 0.8086757660 * z;
  const lc = Math.cbrt(l_), mc = Math.cbrt(m_), sc = Math.cbrt(s_);
  const L = 0.2104542553 * lc + 0.7936177850 * mc - 0.0040720468 * sc;
  const a = 1.9779984951 * lc - 2.4285922420 * mc + 0.4505937099 * sc;
  const bv = 0.0259040371 * lc + 0.7827717662 * mc - 0.8086757660 * sc;
  const C = Math.hypot(a, bv);
  let h = (Math.atan2(bv, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}

// Hex -> hex normalized to "#rrggbb" lowercase; returns input unchanged on failure.
export function normalizeHex(input: string): string | null {
  return parseHex(input)?.hex ?? null;
}
