export function applyBackgroundEffects(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  blur: number,
  chromatic: number,
  waveAmount: number,
  waveFreq: number,
): void {
  if (blur <= 0 && chromatic <= 0 && waveAmount <= 0) return;

  const img = ctx.getImageData(0, 0, w, h);

  if (waveAmount > 0) waveDistort(img, w, h, waveAmount, waveFreq);
  if (chromatic > 0) chromaticAberration(img, w, h, chromatic);
  if (blur > 0) boxBlur(img, w, h, blur);

  ctx.putImageData(img, 0, 0);
}

function boxBlur(img: ImageData, w: number, h: number, r: number): void {
  const d = img.data;
  const out = new Uint8ClampedArray(d.length);
  const size = r * 2 + 1;
  // 3 passes ≈ gaussian
  for (let pass = 0; pass < 3; pass++) {
    const src = pass === 0 ? d : out;
    const dst = pass === 0 ? out : pass === 1 ? d : out;
    // Horizontal
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
    // Vertical
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
      out[i] = d[(y * w + lx) * 4];         // R shifted left
      out[i + 1] = d[i + 1];                 // G stays
      out[i + 2] = d[(y * w + rx) * 4 + 2];  // B shifted right
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
