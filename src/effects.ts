import type { DesignState } from "./state";

// Mirrors exportW from editor.ts so text-derived vector effects (shadow/echo)
// scale against the design width, not a hardcoded 1920.
let designW = 1920;
export function setDesignWidth(w: number): void {
  designW = w;
}

// Buffer pool to avoid per-frame allocations in pixel effects.
// Each pool entry is an object with { w, h, buffers: Uint8ClampedArray[] }
const bufferPools = new Map<string, Uint8ClampedArray<ArrayBufferLike>[]>();

function getBuffer(w: number, h: number): Uint8ClampedArray<ArrayBufferLike> {
  const key = `${w}x${h}`;
  const pool = bufferPools.get(key);
  if (pool && pool.length > 0) {
    return pool.pop()!;
  }
  return new Uint8ClampedArray(w * h * 4);
}

function releaseBuffer(buf: Uint8ClampedArray, w: number, h: number): void {
  const key = `${w}x${h}`;
  let pool = bufferPools.get(key);
  if (!pool) {
    pool = [];
    bufferPools.set(key, pool);
  }
  // Cap pool size to 8 buffers per dimension to avoid unbounded growth
  if (pool.length < 8) {
    pool.push(buf);
  }
}

export function applyBackgroundEffects(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: DesignState,
): void {
  // Vector effects draw straight to the context — no pixel buffer needed,
  // so they must run even when no pixel op is active.
  if (s.bgLongShadow) drawLongShadow(ctx, w, h, s);
  if (s.bgEcho > 0) drawEcho(ctx, w, h, s);
  if (s.bgVignette > 0) drawVignette(ctx, w, h, s.bgVignette);

  const hasPixelOp =
    s.bgBlur > 0 ||
    s.bgChromatic > 0 ||
    s.bgWaveAmount > 0 ||
    s.bgGlitch > 0 ||
    s.bgFilmGrain > 0 ||
    s.bgBloom > 0 ||
    s.bgHalftone ||
    s.bgHalftoneRGB ||
    s.bgPixelate ||
    s.duotoneIntensity > 0;

  if (!hasPixelOp) return;

  const img = ctx.getImageData(0, 0, w, h);

  if (s.bgWaveAmount > 0) waveDistort(img, w, h, s.bgWaveAmount, s.bgWaveFrequency);
  if (s.bgChromatic > 0) chromaticAberration(img, w, h, s.bgChromatic);
  if (s.bgGlitch > 0) glitch(img, w, h, s.bgGlitch);
  if (s.bgFilmGrain > 0) filmGrain(img, s.bgFilmGrain);
  if (s.bgBloom > 0) bloom(img, w, h, s.bgBloom);
  if (s.bgHalftone) halftone(img, w, h);
  if (s.bgHalftoneRGB) halftoneRGB(img, w, h);
  if (s.bgPixelate) pixelate(img, w, h);
  if (s.bgBlur > 0) boxBlur(img, w, h, s.bgBlur);
  if (s.duotoneIntensity > 0) duotone(img, s.bgDuotone, s.duotoneColorA, s.duotoneColorB, s.duotoneIntensity);

  ctx.putImageData(img, 0, 0);
}

function boxBlur(img: ImageData, w: number, h: number, r: number): void {
  const d = img.data;
  const bufA = getBuffer(w, h);
  const bufB = getBuffer(w, h);
  let src: Uint8ClampedArray<ArrayBufferLike> = new Uint8ClampedArray(d);
  let dst: Uint8ClampedArray<ArrayBufferLike> = bufA;

  for (let pass = 0; pass < 3; pass++) {
    // Horizontal pass
    for (let y = 0; y < h; y++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
      // Initialize window at x=0
      for (let i = -r; i <= r; i++) {
        const xi = Math.max(0, Math.min(w - 1, i));
        const p = (y * w + xi) * 4;
        rSum += src[p]; gSum += src[p + 1]; bSum += src[p + 2]; aSum += src[p + 3];
      }
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        const count = Math.min(w, x + r + 1) - Math.max(0, x - r);
        dst[p] = rSum / count;
        dst[p + 1] = gSum / count;
        dst[p + 2] = bSum / count;
        dst[p + 3] = aSum / count;
        // Slide window
        const rm = Math.max(0, Math.min(w - 1, x - r));
        const ad = Math.max(0, Math.min(w - 1, x + r + 1));
        const rmp = (y * w + rm) * 4;
        const adp = (y * w + ad) * 4;
        rSum += src[adp] - src[rmp];
        gSum += src[adp + 1] - src[rmp + 1];
        bSum += src[adp + 2] - src[rmp + 2];
        aSum += src[adp + 3] - src[rmp + 3];
      }
    }
    // Vertical pass
    const tmp = dst === bufA ? bufB : bufA;
    for (let x = 0; x < w; x++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
      // Initialize window at y=0
      for (let i = -r; i <= r; i++) {
        const yi = Math.max(0, Math.min(h - 1, i));
        const p = (yi * w + x) * 4;
        rSum += dst[p]; gSum += dst[p + 1]; bSum += dst[p + 2]; aSum += dst[p + 3];
      }
      for (let y = 0; y < h; y++) {
        const p = (y * w + x) * 4;
        const count = Math.min(h, y + r + 1) - Math.max(0, y - r);
        tmp[p] = rSum / count;
        tmp[p + 1] = gSum / count;
        tmp[p + 2] = bSum / count;
        tmp[p + 3] = aSum / count;
        // Slide window
        const rm = Math.max(0, Math.min(h - 1, y - r));
        const ad = Math.max(0, Math.min(h - 1, y + r + 1));
        const rmp = (rm * w + x) * 4;
        const adp = (ad * w + x) * 4;
        rSum += dst[adp] - dst[rmp];
        gSum += dst[adp + 1] - dst[rmp + 1];
        bSum += dst[adp + 2] - dst[rmp + 2];
        aSum += dst[adp + 3] - dst[rmp + 3];
      }
    }
    src = tmp;
    dst = src === bufA ? bufB : bufA;
  }
  for (let i = 0; i < d.length; i++) d[i] = src[i];
  releaseBuffer(bufA, w, h);
  releaseBuffer(bufB, w, h);
}

function chromaticAberration(img: ImageData, w: number, h: number, amount: number): void {
  const d = img.data;
  const out = getBuffer(w, h);
  const px = Math.round(amount);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lx = Math.max(0, Math.min(w - 1, x - px));
      const rx = Math.max(0, Math.min(w - 1, x + px));
      out[i] = d[(y * w + lx) * 4];
      out[i + 1] = d[i + 1];
      out[i + 2] = d[(y * w + rx) * 4 + 2];
      out[i + 3] = d[i + 3];
    }
  }
  for (let i = 0; i < d.length; i++) d[i] = out[i];
  releaseBuffer(out, w, h);
}

function waveDistort(
  img: ImageData, w: number, h: number,
  amount: number, freq: number,
): void {
  const d = img.data;
  const out = getBuffer(w, h);
  const period = (2 * Math.PI * freq) / w;
  for (let y = 0; y < h; y++) {
    const shift = Math.round(amount * Math.sin(y * period));
    for (let x = 0; x < w; x++) {
      const sx = Math.max(0, Math.min(w - 1, x + shift));
      const di = (y * w + x) * 4;
      const si = (y * w + sx) * 4;
      out[di] = d[si]; out[di + 1] = d[si + 1];
      out[di + 2] = d[si + 2]; out[di + 3] = d[si + 3];
    }
  }
  for (let i = 0; i < d.length; i++) d[i] = out[i];
  releaseBuffer(out, w, h);
}

function glitch(img: ImageData, w: number, h: number, amount: number): void {
  const d = img.data;
  const src = getBuffer(w, h);
  // Copy current data to src buffer
  src.set(d);
  const intensity = amount / 100;
  const bands = Math.floor(h / 20);
  for (let b = 0; b < bands; b++) {
    if (Math.random() > intensity * 2) continue;
    const y0 = b * 20;
    const bandH = Math.min(20, h - y0);
    const shift = Math.round((Math.random() - 0.5) * w * intensity * 0.3);
    for (let y = y0; y < y0 + bandH; y++) {
      for (let x = 0; x < w; x++) {
        const sx = Math.max(0, Math.min(w - 1, x + shift));
        const di = (y * w + x) * 4;
        const si = (y * w + sx) * 4;
        d[di] = src[si]; d[di + 1] = src[si + 1]; d[di + 2] = src[si + 2];
      }
    }
  }
  // RGB split: red sampled ahead by `off`, blue sampled behind by `off`.
  if (intensity > 0.05) {
    const off = Math.round(intensity * 8);
    for (let y = 0; y < h; y++) {
      const rowStart = y * w * 4;
      for (let x = 0; x < w; x++) {
        const i = rowStart + x * 4;
        const xR = Math.min(w - 1, x + off);
        const xB = Math.max(0, x - off);
        d[i]     = src[rowStart + xR * 4];      // red sampled to the right
        d[i + 1] = src[i + 1];                  // green stays put
        d[i + 2] = src[rowStart + xB * 4 + 2];  // blue sampled to the left
        d[i + 3] = src[i + 3];
      }
    }
  }
  releaseBuffer(src, w, h);
}

function filmGrain(img: ImageData, amount: number): void {
  const d = img.data;
  const a = amount / 100;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * a;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
}

function bloom(img: ImageData, w: number, h: number, amount: number): void {
  const d = img.data;
  const threshold = 160;
  const r = Math.max(1, Math.round(4 * (w / 1920)));
  // Highlights: pixels above threshold scaled by themselves; below → 0.
  const hi = getBuffer(w, h);
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const k = lum > threshold ? 1 : 0;
    hi[i] = d[i] * k; hi[i + 1] = d[i + 1] * k; hi[i + 2] = d[i + 2] * k;
    hi[i + 3] = d[i + 3];
  }
  // Separable H+V box blur of the highlight layer.
  const tmp = getBuffer(w, h);
  const blurred = getBuffer(w, h);
  // Horizontal pass: hi → tmp
  for (let y = 0; y < h; y++) {
    let rSum = 0, gSum = 0, bSum = 0;
    for (let i = -r; i <= r; i++) {
      const xi = Math.max(0, Math.min(w - 1, i));
      const p = (y * w + xi) * 4;
      rSum += hi[p]; gSum += hi[p + 1]; bSum += hi[p + 2];
    }
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      const count = Math.min(w, x + r + 1) - Math.max(0, x - r);
      tmp[p] = rSum / count; tmp[p + 1] = gSum / count; tmp[p + 2] = bSum / count; tmp[p + 3] = hi[p + 3];
      const rm = Math.max(0, Math.min(w - 1, x - r));
      const ad = Math.max(0, Math.min(w - 1, x + r + 1));
      const rmp = (y * w + rm) * 4, adp = (y * w + ad) * 4;
      rSum += hi[adp] - hi[rmp];
      gSum += hi[adp + 1] - hi[rmp + 1];
      bSum += hi[adp + 2] - hi[rmp + 2];
    }
  }
  // Vertical pass: tmp → blurred
  for (let x = 0; x < w; x++) {
    let rSum = 0, gSum = 0, bSum = 0;
    for (let i = -r; i <= r; i++) {
      const yi = Math.max(0, Math.min(h - 1, i));
      const p = (yi * w + x) * 4;
      rSum += tmp[p]; gSum += tmp[p + 1]; bSum += tmp[p + 2];
    }
    for (let y = 0; y < h; y++) {
      const p = (y * w + x) * 4;
      const count = Math.min(h, y + r + 1) - Math.max(0, y - r);
      blurred[p] = rSum / count; blurred[p + 1] = gSum / count; blurred[p + 2] = bSum / count; blurred[p + 3] = tmp[p + 3];
      const rm = Math.max(0, Math.min(h - 1, y - r));
      const ad = Math.max(0, Math.min(h - 1, y + r + 1));
      const rmp = (rm * w + x) * 4, adp = (ad * w + x) * 4;
      rSum += tmp[adp] - tmp[rmp];
      gSum += tmp[adp + 1] - tmp[rmp + 1];
      bSum += tmp[adp + 2] - tmp[rmp + 2];
    }
  }
  // Additive composite of blurred highlights onto the original.
  const a = amount / 100;
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = Math.min(255, Math.round(d[i] + blurred[i] * a));
    d[i + 1] = Math.min(255, Math.round(d[i + 1] + blurred[i + 1] * a));
    d[i + 2] = Math.min(255, Math.round(d[i + 2] + blurred[i + 2] * a));
  }
  releaseBuffer(hi, w, h);
  releaseBuffer(tmp, w, h);
  releaseBuffer(blurred, w, h);
}

function halftone(img: ImageData, w: number, h: number): void {
  const d = img.data;
  // Professional halftone screens: 45° rotated grid (avoids the "cheap
  // pixelated dots" look of a straight axis-aligned grid — the single
  // biggest visual tell versus real print halftone), cell-averaged sampling
  // (smooths out single-pixel noise/edges instead of one corner sample per
  // cell), and smoothstep-based anti-aliasing on the dot edge.
  const step = Math.max(5, Math.floor(w / 90));
  const half = step >> 1;
  const maxR = half * 0.55;
  const angle = Math.PI / 4; // 45°, the classic print screen angle
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const diag = Math.sqrt(w * w + h * h);
  const gHalf = diag / 2;
  const sub = 3; // 3x3 sub-sample average per cell
  const subStep = step / sub;

  const src = getBuffer(w, h);
  src.set(d);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = 255;
  }

  for (let gy = -gHalf; gy <= gHalf; gy += step) {
    for (let gx = -gHalf; gx <= gHalf; gx += step) {
      // Rotate the cell center from grid-local space into canvas space.
      const cx = Math.round(gx * cos - gy * sin + w / 2);
      const cy = Math.round(gx * sin + gy * cos + h / 2);
      if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;

      // Average a 3x3 sub-sample grid (still in rotated-local space, each
      // point rotated individually) instead of one corner pixel — smooths
      // out noise and single-pixel spikes for a cleaner luminance read.
      let sr = 0, sg = 0, sb = 0, cnt = 0;
      for (let sy = 0; sy < sub; sy++) {
        for (let sx = 0; sx < sub; sx++) {
          const lx = gx - half + subStep * (sx + 0.5);
          const ly = gy - half + subStep * (sy + 0.5);
          const px = Math.round(lx * cos - ly * sin + w / 2);
          const py = Math.round(lx * sin + ly * cos + h / 2);
          if (px >= 0 && px < w && py >= 0 && py < h) {
            const pi = (py * w + px) * 4;
            sr += src[pi]; sg += src[pi + 1]; sb += src[pi + 2]; cnt++;
          }
        }
      }
      if (cnt === 0) continue;
      sr /= cnt; sg /= cnt; sb /= cnt;

      const lum = (0.299 * sr + 0.587 * sg + 0.114 * sb) / 255;
      const r = Math.round(maxR * Math.sqrt(1 - lum));
      if (r < 1) continue;
      const rSq = r * r;
      const x1 = Math.min(w, cx + r + 1), x0 = Math.max(0, cx - r);
      const y1 = Math.min(h, cy + r + 1), y0 = Math.max(0, cy - r);
      // Pure grayscale ink — no hue carried over, just black-ish dots on white.
      const gray = Math.round(lum * 255);
      const innerSq = (r - 1) * (r - 1);
      for (let y = y0; y < y1; y++) {
        const dy = y - cy, dySq = dy * dy;
        for (let x = x0; x < x1; x++) {
          const distSq = (x - cx) * (x - cx) + dySq;
          if (distSq > rSq) continue;
          const di = (y * w + x) * 4;
          // Smoothstep edge fade — rounder, less notchy than a linear ramp.
          if (distSq >= innerSq) {
            const edge = Math.max(0, Math.min(1, r - Math.sqrt(distSq)));
            const t = edge * edge * (3 - 2 * edge);
            d[di]     = Math.round(d[di]     * (1 - t) + gray * t);
            d[di + 1] = Math.round(d[di + 1] * (1 - t) + gray * t);
            d[di + 2] = Math.round(d[di + 2] * (1 - t) + gray * t);
          } else {
            d[di] = gray; d[di + 1] = gray; d[di + 2] = gray;
          }
        }
      }
    }
  }
  releaseBuffer(src, w, h);
}

function halftoneRGB(img: ImageData, w: number, h: number): void {
  const d = img.data;
  // Same rotated-grid + averaged-sampling upgrade as halftone(); only the
  // ink stays different (full-saturation color instead of gray).
  const step = Math.max(5, Math.floor(w / 90));
  const half = step >> 1;
  const maxR = half * 0.65;
  const angle = Math.PI / 4;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const diag = Math.sqrt(w * w + h * h);
  const gHalf = diag / 2;
  const sub = 3;
  const subStep = step / sub;

  // Snapshot source colors, then flatten to a white paper background —
  // dots are drawn fresh on top, no pixelated fill left behind.
  const src = getBuffer(w, h);
  src.set(d);
  const pix = getBuffer(w, h);
  for (let i = 0; i < d.length; i += 4) {
    pix[i] = 255; pix[i + 1] = 255; pix[i + 2] = 255; pix[i + 3] = 255;
  }

  for (let gy = -gHalf; gy <= gHalf; gy += step) {
    for (let gx = -gHalf; gx <= gHalf; gx += step) {
      const cx = Math.round(gx * cos - gy * sin + w / 2);
      const cy = Math.round(gx * sin + gy * cos + h / 2);
      if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;

      let sr = 0, sg = 0, sb = 0, cnt = 0;
      for (let sy = 0; sy < sub; sy++) {
        for (let sx = 0; sx < sub; sx++) {
          const lx = gx - half + subStep * (sx + 0.5);
          const ly = gy - half + subStep * (sy + 0.5);
          const px = Math.round(lx * cos - ly * sin + w / 2);
          const py = Math.round(lx * sin + ly * cos + h / 2);
          if (px >= 0 && px < w && py >= 0 && py < h) {
            const pi = (py * w + px) * 4;
            sr += src[pi]; sg += src[pi + 1]; sb += src[pi + 2]; cnt++;
          }
        }
      }
      if (cnt === 0) continue;
      sr /= cnt; sg /= cnt; sb /= cnt;

      const lum = (0.299 * sr + 0.587 * sg + 0.114 * sb) / 255;
      const r = Math.round(maxR * Math.sqrt(1 - lum));
      if (r < 1) continue;
      const rSq = r * r;
      const x1 = Math.min(w, cx + r + 1), x0 = Math.max(0, cx - r);
      const y1 = Math.min(h, cy + r + 1), y0 = Math.max(0, cy - r);
      // Full-saturation ink — real color halftone (CMYK) never dims the ink
      // itself; tone comes entirely from dot size/coverage, so dimming the
      // color on top just makes it muddy without adding real contrast.
      const dr = sr;
      const dg = sg;
      const db = sb;
      const innerSq = (r - 1) * (r - 1);
      for (let y = y0; y < y1; y++) {
        const dy = y - cy, dySq = dy * dy;
        for (let x = x0; x < x1; x++) {
          const dx = x - cx;
          const distSq = dx * dx + dySq;
          if (distSq > rSq) continue;
          const di = (y * w + x) * 4;
          if (distSq >= innerSq) {
            const edge = Math.max(0, Math.min(1, r - Math.sqrt(distSq)));
            const t = edge * edge * (3 - 2 * edge);
            pix[di]     = Math.round(pix[di]     * (1 - t) + dr * t);
            pix[di + 1] = Math.round(pix[di + 1] * (1 - t) + dg * t);
            pix[di + 2] = Math.round(pix[di + 2] * (1 - t) + db * t);
          } else {
            pix[di] = dr; pix[di + 1] = dg; pix[di + 2] = db;
          }
        }
      }
    }
  }
  for (let i = 0; i < d.length; i++) d[i] = pix[i];
  releaseBuffer(src, w, h);
  releaseBuffer(pix, w, h);
}

function pixelate(img: ImageData, w: number, h: number): void {
  const d = img.data;
  const block = Math.max(8, Math.floor(w / 60));
  for (let by = 0; by < h; by += block) {
    for (let bx = 0; bx < w; bx += block) {
      let r = 0, g = 0, b = 0, cnt = 0;
      for (let y = by; y < Math.min(by + block, h); y++) {
        for (let x = bx; x < Math.min(bx + block, w); x++) {
          const p = (y * w + x) * 4;
          r += d[p]; g += d[p + 1]; b += d[p + 2]; cnt++;
        }
      }
      r /= cnt; g /= cnt; b /= cnt;
      for (let y = by; y < Math.min(by + block, h); y++) {
        for (let x = bx; x < Math.min(bx + block, w); x++) {
          const p = (y * w + x) * 4;
          d[p] = r; d[p + 1] = g; d[p + 2] = b;
        }
      }
    }
  }
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number): void {
  const a = amount / 100;
  const g = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.25,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${a * 0.8})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function duotone(
  img: ImageData,
  mode: 0 | 1, colA: string, colB: string, intensity: number,
): void {
  if (intensity <= 0) return;
  const d = img.data;
  const a = Math.min(Math.max(intensity, 0), 100) / 100;

  // Validate and parse hex colors (6 or 8 digits; alpha bytes are ignored here —
  // duotone intensity is controlled separately by `intensity`).
  const parseHex = (hex: string): [number, number, number] => {
    let h = hex.replace(/^#/, "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const m = /^([0-9a-f]{6}|[0-9a-f]{8})$/i.exec(h);
    if (!m) {
      console.warn(`Invalid hex color "${hex}" for duotone, using black`);
      return [0, 0, 0];
    }
    const n = parseInt(m[1].slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  const [ar, ag, ab] = parseHex(colA);
  const [br, bg, bb] = parseHex(colB);
  const twin = mode === 1;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    let dr = ar + (br - ar) * lum;
    let dg = ag + (bg - ag) * lum;
    let db = ab + (bb - ab) * lum;
    if (twin) {
      const dl = lum < 0.5 ? 0 : 1;
      dr = ar + (br - ar) * dl;
      dg = ag + (bg - ag) * dl;
      db = ab + (bb - ab) * dl;
    }
    d[i]     = Math.round(r * (1 - a) + dr * a);
    d[i + 1] = Math.round(g * (1 - a) + dg * a);
    d[i + 2] = Math.round(b * (1 - a) + db * a);
  }
}

function drawLongShadow(ctx: CanvasRenderingContext2D, w: number, h: number, s: DesignState): void {
  if (!s.text) return;
  const scale = w / designW;
  const px = s.fontSize * scale;
  ctx.save();
  configureTextFont(ctx, w, s);
  const text = s.uppercase ? s.text.toUpperCase() : s.text;
  const x = textX(s, w);
  const y = h * (s.posY / 100);
  const steps = 40;
  const maxOff = Math.min(w, h) * 0.15;
  for (let i = 1; i <= steps; i++) {
    const off = (i / steps) * maxOff;
    ctx.fillStyle = `rgba(0,0,0,${(1 - i / steps) * 0.06 * s.shadowOpacity})`;
    const lines = text.split("\n");
    const lh = px * s.lineHeight;
    for (let k = 0; k < lines.length; k++) {
      ctx.fillText(lines[k], x + off, y + off + (k - (lines.length - 1) / 2) * lh);
    }
  }
  ctx.restore();
}

function drawEcho(ctx: CanvasRenderingContext2D, w: number, h: number, s: DesignState): void {
  if (!s.text || s.bgEcho <= 0) return;
  const scale = w / designW;
  const px = s.fontSize * scale;
  ctx.save();
  configureTextFont(ctx, w, s);
  const text = s.uppercase ? s.text.toUpperCase() : s.text;
  const x = textX(s, w);
  const y = h * (s.posY / 100);
  const copies = Math.min(s.bgEcho, 8);
  const offset = Math.min(w, h) * 0.04;
  for (let i = copies; i >= 1; i--) {
    ctx.globalAlpha = 0.08 * (1 - i / copies);
    ctx.fillStyle = s.textColor;
    const lines = text.split("\n");
    const lh = px * s.lineHeight;
    for (let k = 0; k < lines.length; k++) {
      ctx.fillText(lines[k], x - i * offset, y - i * offset + (k - (lines.length - 1) / 2) * lh);
    }
  }
  ctx.restore();
}

// Shared text setup used by the editor's main drawText and the echo/long-shadow
// effects so font, alignment and spacing never drift between them.
export function textX(s: DesignState, w: number): number {
  return w * (s.posX / 100);
}

export function configureTextFont(ctx: CanvasRenderingContext2D, w: number, s: DesignState): void {
  const scale = w / designW;
  const px = s.fontSize * scale;
  const style = s.italic ? "italic" : "normal";
  ctx.font = `${style} ${s.weight} ${px}px "${s.font}", system-ui, sans-serif`;
  ctx.textAlign = s.align;
  ctx.textBaseline = "middle";
  ctx.letterSpacing = `${s.letterSpacing * scale}px`;
}
