// Vector pattern overlays drawn directly on the 2D context. All cheap except
// Noise, which samples a cached tile (generated once) to avoid per-pixel work.

export const PATTERNS = [
  "None",
  "Liquid Glass (Apple)",
  "Dots",
  "Grid",
  "Checker",
  "Lines — Horizontal",
  "Lines — Vertical",
  "Lines — Diagonal",
  "Crosshatch",
  "Hexagons",
  "Triangles",
  "Waves",
  "Circuit",
  "Stars",
  "Scanlines",
  "Noise / Grain",
  "Vignette",
] as const;

export type PatternName = (typeof PATTERNS)[number];

let noiseTile: HTMLCanvasElement | null = null;
function getNoiseTile(): HTMLCanvasElement {
  if (noiseTile) return noiseTile;
  const s = 128;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const x = c.getContext("2d")!;
  const img = x.createImageData(s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 28;
  }
  x.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

export function drawPattern(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  name: PatternName,
  color: string,
): void {
  if (name === "None") return;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  if (name === "Vignette") {
    const g = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.2,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.75,
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return;
  }

  if (name === "Noise / Grain") {
    const tile = getNoiseTile();
    const pat = ctx.createPattern(tile, "repeat")!;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return;
  }

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1, w / 900);

  switch (name) {
    case "Liquid Glass (Apple)": {
      // Soft blurred blobs suggesting frosted glass.
      ctx.globalAlpha = 0.12;
      const blobs = 6;
      for (let i = 0; i < blobs; i++) {
        const cx = (w / blobs) * (i + 0.5);
        const cy = h * (0.3 + 0.4 * ((i % 2) ? 1 : 0));
        const r = Math.min(w, h) * 0.28;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "Dots": {
      const step = w / 40;
      ctx.globalAlpha = 0.5;
      for (let y = step / 2; y < h; y += step)
        for (let x = step / 2; x < w; x += step) {
          ctx.beginPath();
          ctx.arc(x, y, step * 0.12, 0, Math.PI * 2);
          ctx.fill();
        }
      break;
    }
    case "Grid": {
      ctx.globalAlpha = 0.35;
      const step = w / 32;
      for (let x = 0; x <= w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      break;
    }
    case "Checker": {
      const step = w / 24;
      ctx.globalAlpha = 0.25;
      for (let y = 0; y < h; y += step)
        for (let x = 0; x < w; x += step)
          if (((x / step + y / step) | 0) % 2 === 0) ctx.fillRect(x, y, step, step);
      break;
    }
    case "Lines — Horizontal":
      ctx.globalAlpha = 0.3;
      lineRow(ctx, w, h);
      break;
    case "Lines — Vertical":
      ctx.globalAlpha = 0.3;
      lineCol(ctx, w, h);
      break;
    case "Lines — Diagonal":
      ctx.globalAlpha = 0.25;
      drawDiagonal(ctx, w, h);
      break;
    case "Crosshatch":
      ctx.globalAlpha = 0.2;
      drawDiagonal(ctx, w, h);
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      drawDiagonal(ctx, w, h);
      ctx.restore();
      break;
    case "Hexagons":
      ctx.globalAlpha = 0.3;
      drawHexagons(ctx, w, h);
      break;
    case "Triangles":
      ctx.globalAlpha = 0.28;
      drawTriangles(ctx, w, h);
      break;
    case "Waves":
      ctx.globalAlpha = 0.3;
      drawWaves(ctx, w, h);
      break;
    case "Circuit":
      ctx.globalAlpha = 0.3;
      drawCircuit(ctx, w, h);
      break;
    case "Stars":
      ctx.globalAlpha = 0.45;
      drawStars(ctx, w, h);
      break;
    case "Scanlines":
      ctx.globalAlpha = 0.18;
      for (let y = 0; y < h; y += w / 60) ctx.fillRect(0, y, w, Math.max(1, w / 240));
      break;
  }

  ctx.restore();

  function lineRow(c: CanvasRenderingContext2D, w: number, h: number) {
    const step = h / 26;
    for (let y = 0; y <= h; y += step) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }
  }
  function lineCol(c: CanvasRenderingContext2D, w: number, h: number) {
    const step = w / 30;
    for (let x = 0; x <= w; x += step) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
  }
  function drawDiagonal(c: CanvasRenderingContext2D, w: number, h: number) {
    const step = w / 28;
    for (let x = -h; x < w; x += step) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + h, h);
      c.stroke();
    }
  }
  function drawHexagons(c: CanvasRenderingContext2D, w: number, h: number) {
    const r = w / 36;
    const dx = r * 1.5;
    const dy = r * Math.sqrt(3);
    for (let y = 0; y < h + dy; y += dy)
      for (let x = 0, col = 0; x < w + dx; x += dx, col++) {
        const ox = col % 2 ? dx / 2 : 0;
        hex(c, x + ox, y, r);
      }
  }
  function hex(c: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + r * Math.cos(a);
      const py = cy + r * Math.sin(a);
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath();
    c.stroke();
  }
  function drawTriangles(c: CanvasRenderingContext2D, w: number, h: number) {
    const s = w / 20;
    for (let y = 0; y < h + s; y += s)
      for (let x = 0; x < w + s; x += s) {
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + s, y);
        c.lineTo(x, y + s);
        c.closePath();
        c.stroke();
      }
  }
  function drawWaves(c: CanvasRenderingContext2D, w: number, h: number) {
    const amp = h / 40;
    const step = w / 16;
    for (let base = 0; base < h; base += h / 12) {
      c.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const y = base + amp * Math.sin((x / step) * Math.PI * 2);
        x ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    }
  }
  function drawCircuit(c: CanvasRenderingContext2D, w: number, h: number) {
    const step = w / 18;
    c.lineWidth = Math.max(1, w / 600);
    for (let y = step / 2; y < h; y += step)
      for (let x = step / 2; x < w; x += step) {
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + step / 2, y);
        c.lineTo(x + step / 2, y - step / 2);
        c.stroke();
        c.beginPath();
        c.arc(x, y, step * 0.08, 0, Math.PI * 2);
        c.stroke();
      }
  }
  function drawStars(c: CanvasRenderingContext2D, w: number, h: number) {
    const s = Math.min(w, h) / 40;
    for (let y = s * 2; y < h; y += s * 4)
      for (let x = s * 2; x < w; x += s * 4) star(c, x, y, s);
  }
  function star(c: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 ? r * 0.45 : r;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const px = cx + rad * Math.cos(a);
      const py = cy + rad * Math.sin(a);
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath();
    c.fill();
  }
}
