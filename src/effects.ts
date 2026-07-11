import type { DesignState } from "./state";

export function applyBackgroundEffects(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: DesignState,
): void {
  const hasPixelOp =
    s.bgBlur > 0 ||
    s.bgChromatic > 0 ||
    s.bgWaveAmount > 0 ||
    s.bgGlitch > 0 ||
    s.bgFilmGrain > 0 ||
    s.bgVignette > 0 ||
    s.bgBloom > 0 ||
    s.bgHalftone ||
    s.bgPixelate;

  if (!hasPixelOp) return;

  const img = ctx.getImageData(0, 0, w, h);

  if (s.bgWaveAmount > 0) waveDistort(img, w, h, s.bgWaveAmount, s.bgWaveFrequency);
  if (s.bgChromatic > 0) chromaticAberration(img, w, h, s.bgChromatic);
  if (s.bgGlitch > 0) glitch(img, w, h, s.bgGlitch);
  if (s.bgFilmGrain > 0) filmGrain(img, w, h, s.bgFilmGrain);
  if (s.bgBloom > 0) bloom(img, w, h, s.bgBloom);
  if (s.bgHalftone) halftone(ctx, img, w, h);
  if (s.bgPixelate) pixelate(img, w, h);
  if (s.bgBlur > 0) boxBlur(img, w, h, s.bgBlur);

  ctx.putImageData(img, 0, 0);

  if (s.bgVignette > 0) drawVignette(ctx, w, h, s.bgVignette);
  if (s.bgLongShadow) drawLongShadow(ctx, w, h, s);
  if (s.bgEcho > 0) drawEcho(ctx, w, h, s);
}

function boxBlur(img: ImageData, w: number, h: number, r: number): void {
  const d = img.data;
  const out = new Uint8ClampedArray(d.length);
  const size = r * 2 + 1;
  for (let pass = 0; pass < 3; pass++) {
    const src = pass === 0 ? d : out;
    const dst = pass === 0 ? out : pass === 1 ? d : out;
    for (let y = 0; y < h; y++) {
      let r0 = 0, g0 = 0, b0 = 0, a0 = 0;
      for (let i = -r; i <= r; i++) {
        const p = (y * w + Math.max(0, Math.min(w - 1, i))) * 4;
        r0 += src[p]; g0 += src[p + 1]; b0 += src[p + 2]; a0 += src[p + 3];
      }
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        dst[p] = r0 / size; dst[p + 1] = g0 / size; dst[p + 2] = b0 / size; dst[p + 3] = a0 / size;
        const rm = (y * w + Math.max(0, Math.min(w - 1, x - r))) * 4;
        const ad = (y * w + Math.max(0, Math.min(w - 1, x + r + 1))) * 4;
        r0 += src[ad] - src[rm]; g0 += src[ad + 1] - src[rm + 1];
        b0 += src[ad + 2] - src[rm + 2]; a0 += src[ad + 3] - src[rm + 3];
      }
    }
    const tmp = new Uint8ClampedArray(dst.length);
    for (let x = 0; x < w; x++) {
      let r0 = 0, g0 = 0, b0 = 0, a0 = 0;
      for (let i = -r; i <= r; i++) {
        const p = (Math.max(0, Math.min(h - 1, i)) * w + x) * 4;
        r0 += dst[p]; g0 += dst[p + 1]; b0 += dst[p + 2]; a0 += dst[p + 3];
      }
      for (let y = 0; y < h; y++) {
        const p = (y * w + x) * 4;
        tmp[p] = r0 / size; tmp[p + 1] = g0 / size; tmp[p + 2] = b0 / size; tmp[p + 3] = a0 / size;
        const rm = (Math.max(0, Math.min(h - 1, y - r)) * w + x) * 4;
        const ad = (Math.max(0, Math.min(h - 1, y + r + 1)) * w + x) * 4;
        r0 += dst[ad] - dst[rm]; g0 += dst[ad + 1] - dst[rm + 1];
        b0 += dst[ad + 2] - dst[rm + 2]; a0 += dst[ad + 3] - dst[rm + 3];
      }
    }
    if (pass < 2) {
      for (let i = 0; i < tmp.length; i++) (pass === 0 ? out : d)[i] = tmp[i];
    } else {
      for (let i = 0; i < tmp.length; i++) out[i] = tmp[i];
    }
  }
  for (let i = 0; i < d.length; i++) d[i] = out[i];
}

function chromaticAberration(img: ImageData, w: number, h: number, amount: number): void {
  const d = img.data;
  const out = new Uint8ClampedArray(d.length);
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
}

function waveDistort(
  img: ImageData, w: number, h: number,
  amount: number, freq: number,
): void {
  const d = img.data;
  const out = new Uint8ClampedArray(d.length);
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
}

function glitch(img: ImageData, w: number, h: number, amount: number): void {
  const d = img.data;
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
        d[di] = d[si]; d[di + 1] = d[si + 1]; d[di + 2] = d[si + 2];
      }
    }
  }
  if (intensity > 0.05) {
    const off = Math.round(intensity * 8);
    for (let i = 0; i < d.length; i += 4) {
      const x = (i / 4) % w;
      if (x >= w - off) continue;
      const si = i + off * 4;
      if (si >= d.length) continue;
      d[i] = d[si];
    }
  }
}

function filmGrain(img: ImageData, w: number, h: number, amount: number): void {
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
  const a = amount / 100;
  const out = new Uint8ClampedArray(d.length);
  const r = 3;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rr = 0, gg = 0, bb = 0, cnt = 0;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const sx = Math.max(0, Math.min(w - 1, x + dx));
          const sy = Math.max(0, Math.min(h - 1, y + dy));
          const p = (sy * w + sx) * 4;
          const lum = (d[p] + d[p + 1] + d[p + 2]) / 3;
          if (lum > 160) {
            rr += d[p]; gg += d[p + 1]; bb += d[p + 2]; cnt++;
          }
        }
      }
      if (cnt > 0) {
        const i = (y * w + x) * 4;
        out[i] = Math.min(255, d[i] + (rr / cnt) * a);
        out[i + 1] = Math.min(255, d[i + 1] + (gg / cnt) * a);
        out[i + 2] = Math.min(255, d[i + 2] + (bb / cnt) * a);
      } else {
        const i = (y * w + x) * 4;
        out[i] = d[i]; out[i + 1] = d[i + 1]; out[i + 2] = d[i + 2];
      }
    }
  }
  for (let i = 0; i < d.length; i += 4) {
    d[i] = out[i]; d[i + 1] = out[i + 1]; d[i + 2] = out[i + 2];
  }
}

function halftone(target: CanvasRenderingContext2D, img: ImageData, w: number, h: number): void {
  const d = img.data;
  const step = Math.max(6, Math.floor(w / 80));
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const p = (y * w + x) * 4;
      const lum = (d[p] + d[p + 1] + d[p + 2]) / 3;
      const r = (1 - lum / 255) * step * 0.5;
      const i = (y * w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = lum;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = Math.floor(x / step) * step;
      const gy = Math.floor(y / step) * step;
      if (gx >= w || gy >= h) continue;
      const src = (gy * w + gx) * 4;
      const dst = (y * w + x) * 4;
      d[dst] = d[src]; d[dst + 1] = d[src + 1]; d[dst + 2] = d[src + 2];
    }
  }
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

function drawLongShadow(ctx: CanvasRenderingContext2D, w: number, h: number, s: DesignState): void {
  if (!s.text) return;
  const scale = w / 1920;
  const px = s.fontSize * scale;
  const style = s.italic ? "italic" : "normal";
  ctx.save();
  ctx.font = `${style} ${s.weight} ${px}px "${s.font}", system-ui, sans-serif`;
  ctx.textAlign = s.align;
  ctx.textBaseline = "middle";
  ctx.letterSpacing = `${s.letterSpacing * scale}px`;
  const text = s.uppercase ? s.text.toUpperCase() : s.text;
  const x = s.align === "left" ? w * 0.06 : s.align === "right" ? w * 0.94 : w * (s.posX / 100);
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
  const scale = w / 1920;
  const px = s.fontSize * scale;
  const style = s.italic ? "italic" : "normal";
  ctx.save();
  ctx.font = `${style} ${s.weight} ${px}px "${s.font}", system-ui, sans-serif`;
  ctx.textAlign = s.align;
  ctx.textBaseline = "middle";
  ctx.letterSpacing = `${s.letterSpacing * scale}px`;
  const text = s.uppercase ? s.text.toUpperCase() : s.text;
  const x = s.align === "left" ? w * 0.06 : s.align === "right" ? w * 0.94 : w * (s.posX / 100);
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
