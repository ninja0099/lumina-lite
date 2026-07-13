import type { DesignState } from "./state";
import { ensureFont } from "./fonts";
import { drawPattern } from "./patterns";
import { applyBackgroundEffects, setDesignWidth, configureTextFont, textX } from "./effects";

let exportW = 1920;
let exportH = 1080;

let bgImg: HTMLImageElement | null = null;
export function setBgImage(dataUrl: string | null): void {
  if (!dataUrl) { bgImg = null; return; }
  const img = new Image();
  img.onload = () => (bgImg = img);
  img.src = dataUrl;
}

function angleGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  deg: number,
  c0: string,
  c1: string,
): CanvasGradient {
  const a = (deg * Math.PI) / 180;
  const len = (Math.abs(Math.cos(a)) * w + Math.abs(Math.sin(a)) * h) / 2;
  const cx = w / 2;
  const cy = h / 2;
  const g = ctx.createLinearGradient(
    cx - Math.cos(a) * len,
    cy - Math.sin(a) * len,
    cx + Math.cos(a) * len,
    cy + Math.sin(a) * len,
  );
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  return g;
}

// animationPhase in [0,1): drives one seamless loop. Every style uses only
// sin/cos of (phase * 2π * cycles), so over phase 0→1 each node completes a
// whole number of periods — the end frame equals the start frame (no seam).
let animationPhase = 0;
let stateRef: DesignState | null = null;
function getStateRef(): DesignState | null {
  return stateRef;
}

// Integer oscillations per loop, derived from speed. Integer => seamless loop.
function cycleCount(speed: number): number {
  return Math.max(1, Math.round(speed * 2));
}

function nodeOffset(
  i: number,
  style: DesignState["meshAnimStyle"],
  amp: number,
  speed: number,
  phase: number,
): { dx: number; dy: number; scale: number; alpha: number } {
  const none = { dx: 0, dy: 0, scale: 1, alpha: 1 };
  if (amp <= 0) return none;
  const cycles = cycleCount(speed);
  const a = phase * Math.PI * 2 * cycles; // whole periods per loop
  const ph = (i * Math.PI * 2) / 7; // per-node phase offset
  const r = amp / 100;
  switch (style) {
    case "orbit":
      return { dx: Math.cos(a + ph) * r, dy: Math.sin(a + ph) * r, scale: 1, alpha: 1 };
    case "breathe":
      return { dx: 0, dy: 0, scale: 1 + Math.sin(a + ph) * r, alpha: 1 };
    case "wave":
      return { dx: Math.sin(a + ph * 0.7) * r, dy: Math.cos(a + ph * 0.5) * r * 0.6, scale: 1, alpha: 1 };
    case "float":
      return { dx: Math.sin(a + ph) * r, dy: Math.cos(a + ph * 1.3) * r, scale: 1, alpha: 1 };
    // --- new styles ---
    case "drift":
      // Constant directional travel that wraps via sin (seamless); wind-like.
      // dy uses cos(a) (not a*0.5) so it stays an integer multiple of `a`
      // and the loop seam stays clean even when cycleCount() is odd.
      return { dx: Math.sin(a) * r, dy: Math.cos(a) * r * 0.5, scale: 1, alpha: 1 };
    case "swarm":
      // Organic per-node wobble: each node uses a distinct pseudo-seed phase.
      // All time terms are integer multiples of `a` so the loop stays seamless.
      return {
        dx: Math.sin(a * 2 + ph * 3.1) * r,
        dy: Math.cos(a * 3 + ph * 2.3) * r,
        scale: 1 + Math.sin(a + ph) * r * 0.3,
        alpha: 1,
      };
    case "roam":
      // Nodes JOURNEY across the canvas: a large slow sweep carries the node
      // between regions, layered with a faster wobble. Distinct from float/
      // swarm because the center of motion itself translates, not just orbits.
      return {
        dx: (Math.sin(a * 1 + ph) * 0.7 + Math.sin(a * 3 + ph * 2.1) * 0.3) * r,
        dy: (Math.cos(a * 1 + ph * 1.3) * 0.7 + Math.cos(a * 2 + ph) * 0.3) * r,
        scale: 1,
        alpha: 1,
      };
    default:
      return none;
  }
}

function paintMesh(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: DesignState,
  phase: number,
): void {
  ctx.fillStyle = s.bgColor;
  ctx.fillRect(0, 0, w, h);

  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const octx = off.getContext("2d")!;
  const min = Math.min(w, h);
  // Merge: every node contributes at equal weight; later nodes don't bury
  // earlier ones. Stacked: each node paints over the previous (default 2D-canvas
  // source-over), so array order is the z-order.
  if (s.meshMode === "merge") octx.globalCompositeOperation = "lighter";

  // Blur the blobs on the offscreen canvas (over transparency), not when
  // compositing onto the opaque base — blurring at the canvas edge otherwise
  // fades toward transparent and exposes a hard ring of bgColor.
  const blurPx = s.meshBlur * 2 * (w / exportW);
  if (blurPx > 0) octx.filter = `blur(${blurPx}px)`;
  s.meshNodes.forEach((n, i) => {
    const { dx, dy, scale, alpha } = s.meshAnim
      ? nodeOffset(i, s.meshAnimStyle, s.meshAnimAmplitude, s.meshAnimSpeed, phase)
      : { dx: 0, dy: 0, scale: 1, alpha: 1 };
    const cx = (n.x / 100 + dx) * w;
    const cy = (n.y / 100 + dy) * h;
    const R = (n.radius / 100) * min * (s.meshSpread / 5) * scale;
    const g = octx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, R));
    g.addColorStop(0, hexWithAlpha(n.color, alpha));
    g.addColorStop(1, hexWithAlpha(n.color, 0));
    octx.fillStyle = g;
    octx.fillRect(0, 0, w, h);
  });
  octx.filter = "none";
  octx.globalCompositeOperation = "source-over";

  ctx.drawImage(off, 0, 0);

  if (s.bgVignette > 0 || s.bgLongShadow || s.bgEcho > 0 || s.duotoneIntensity > 0) {
    applyBackgroundEffects(ctx, w, h, s);
  }
}

let selectedNode = -1;
export function getSelectedNode(): number {
  return selectedNode;
}
export function setSelectedNode(i: number): void {
  selectedNode = i;
}

// Returns index of node under canvas pixel (px,py), or -1.
export function nodeAt(px: number, py: number, w: number, h: number): number {
  const s = getStateRef();
  if (!s || s.bgMode !== "mesh") return -1;
  let best = -1;
  let bestD = 9999;
  s.meshNodes.forEach((n, i) => {
    const cx = (n.x / 100) * w;
    const cy = (n.y / 100) * h;
    const d = Math.hypot(px - cx, py - cy);
    if (d < Math.max(14, (n.radius / 100) * Math.min(w, h) * (s.meshSpread / 5) * 0.4) && d < bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

function drawNodeHandles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: DesignState,
): void {
  ctx.save();
  ctx.lineWidth = 2;
  s.meshNodes.forEach((n, i) => {
    const cx = (n.x / 100) * w;
    const cy = (n.y / 100) * h;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fillStyle = n.color;
    ctx.fill();
    ctx.strokeStyle = i === selectedNode ? "#fff" : "rgba(255,255,255,0.65)";
    ctx.lineWidth = i === selectedNode ? 3 : 2;
    ctx.stroke();
  });
  ctx.restore();
}

function paintBg(ctx: CanvasRenderingContext2D, w: number, h: number, s: DesignState): void {
  ctx.clearRect(0, 0, w, h);
  if (s.layers.background && bgImg && !s.transparent) {
    const cx = w * (s.bgImageX / 100);
    const cy = h * (s.bgImageY / 100);
    const rot = (s.bgImageRotation * Math.PI) / 180;

    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d")!;
    octx.save();
    octx.globalAlpha = Math.max(0, Math.min(1, s.bgImageOpacity));
    octx.translate(cx, cy);
    octx.rotate(rot);
    if (s.bgImageFit === "tile") {
      const tile = Math.max(40, Math.min(w, h) * 0.2);
      for (let ty = -h; ty < h; ty += tile)
        for (let tx = -w; tx < w; tx += tile)
          octx.drawImage(bgImg, tx, ty, tile, tile);
    } else {
      let iw: number, ih: number;
      if (s.bgImageFit === "stretch") { iw = w; ih = h; }
      else {
        const sc =
          s.bgImageFit === "contain"
            ? Math.min(w / bgImg.width, h / bgImg.height)
            : Math.max(w / bgImg.width, h / bgImg.height);
        iw = bgImg.width * sc;
        ih = bgImg.height * sc;
      }
      octx.drawImage(bgImg, -iw / 2, -ih / 2, iw, ih);
    }
    octx.restore();
    if (s.bgBlur > 0 || s.bgChromatic > 0 || s.bgWaveAmount > 0 || s.bgGlitch > 0 || s.bgFilmGrain > 0 || s.bgVignette > 0 || s.bgBloom > 0 || s.bgHalftone || s.bgPixelate || s.bgLongShadow || s.bgEcho > 0 || s.duotoneIntensity > 0) {
      applyBackgroundEffects(octx, w, h, s);
    }
    ctx.drawImage(off, 0, 0);

    if (s.bgGradient) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, s.bgGradientOpacity));
      ctx.fillStyle = angleGradient(ctx, w, h, s.bgGradientAngle, s.bgColor, s.bgColor2);
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  } else if (s.layers.background && !s.transparent) {
    if (s.bgMode === "mesh") {
      paintMesh(ctx, w, h, s, animationPhase);
    } else {
      ctx.fillStyle = s.bgColor;
      ctx.fillRect(0, 0, w, h);
      if (s.bgGradient) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, s.bgGradientOpacity));
        ctx.fillStyle = angleGradient(ctx, w, h, s.bgGradientAngle, s.bgColor, s.bgColor2);
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
      if (s.bgVignette > 0 || s.bgLongShadow || s.bgEcho > 0 || s.duotoneIntensity > 0) {
        applyBackgroundEffects(ctx, w, h, s);
      }
    }
  }

  if (s.layers.pattern && s.pattern !== "None") {
    drawPattern(ctx, w, h, s.pattern, s.patternColor);
  }
}

function paintFg(ctx: CanvasRenderingContext2D, w: number, h: number, s: DesignState): void {
  if (s.layers.text && s.glassPanel) drawGlass(ctx, w, h);

  ctx.save();

  if (s.layers.text) drawText(ctx, w, h, s);

  if (s.borderGlow) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = Math.max(2, w / 120);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, s.textColor);
    g.addColorStop(1, s.textColor2);
    ctx.strokeStyle = g;
    ctx.shadowColor = s.textColor;
    ctx.shadowBlur = w / 18;
    ctx.strokeRect(w * 0.01, h * 0.01, w * 0.98, h * 0.98);
    ctx.restore();
  }

  ctx.restore();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  r: number,
): void {
  const rad = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(rad, 0);
  ctx.arcTo(w, 0, w, h, rad);
  ctx.arcTo(w, h, 0, h, rad);
  ctx.arcTo(0, h, 0, 0, rad);
  ctx.arcTo(0, 0, w, 0, rad);
  ctx.closePath();
}

function paint(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  s: DesignState,
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  // Rounded corners: clip the whole composition to a rounded rect so the
  // exported image itself has cut corners.
  if (s.cornerRadius > 0) {
    // cornerRadius is in export-px; scale to the current canvas width.
    roundRectPath(ctx, w, h, s.cornerRadius * (w / exportW));
    ctx.clip();
  }
  paintBg(ctx, w, h, s);
  paintFg(ctx, w, h, s);
  ctx.restore();
}

function drawGlass(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#ffffff";
  const pad = w * 0.08;
  const r = w * 0.02;
  const x = pad;
  const y = h * 0.2;
  const gw = w - pad * 2;
  const gh = h * 0.6;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + gw, y, x + gw, y + gh, r);
  ctx.arcTo(x + gw, y + gh, x, y + gh, r);
  ctx.arcTo(x, y + gh, x, y, r);
  ctx.arcTo(x, y, x + gw, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, w: number, h: number, s: DesignState): void {
  let text = s.uppercase ? s.text.toUpperCase() : s.text;
  if (!text) return;

  const scale = w / exportW;
  const px = s.fontSize * scale;
  configureTextFont(ctx, w, s);

  let fill: string | CanvasGradient = s.textColor;
  if (s.textGradient) {
    const a = (s.textGradientAngle * Math.PI) / 180;
    const metrics = ctx.measureText(s.text || "A");
    const tw = Math.max(metrics.width, px);
    const th = px * s.lineHeight;
    const tx = textX(s, w);
    const ty = h * (s.posY / 100);
    const len = (Math.abs(Math.cos(a)) * tw + Math.abs(Math.sin(a)) * th) / 2;
    const g = ctx.createLinearGradient(
      tx - Math.cos(a) * len,
      ty - Math.sin(a) * len,
      tx + Math.cos(a) * len,
      ty + Math.sin(a) * len,
    );
    g.addColorStop(0, s.textColor);
    g.addColorStop(1, s.textColor2);
    fill = g;
  }

  const x = textX(s, w);
  const y = h * (s.posY / 100);

  const lines = text.split("\n");
  const lh = px * s.lineHeight;

  const rot = (s.textRotation * Math.PI) / 180;
  if (rot !== 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.translate(-x, -y);
  }

  for (let i = 0; i < lines.length; i++) {
    const ly = y + (i - (lines.length - 1) / 2) * lh;

    if (s.transparentText) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "#000";
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      ctx.fillText(lines[i], x, ly);
      ctx.restore();
      continue;
    }

    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    if (s.textShadow) {
      ctx.shadowColor = hexWithAlpha(s.shadowColor, s.shadowOpacity);
      ctx.shadowBlur = s.shadowBlur * scale;
    }
    if (s.textGlow) {
      ctx.shadowColor = s.textColor;
      ctx.shadowBlur = Math.max(ctx.shadowBlur, w / 12);
    }

    ctx.globalAlpha = Math.max(0, Math.min(1, s.textOpacity));

    if (s.textOutline) {
      ctx.lineWidth = Math.max(1, s.textOutlineWidth * scale);
      ctx.strokeStyle = s.textOutlineColor;
      ctx.lineJoin = "round";
      ctx.strokeText(lines[i], x, ly);
    }
    ctx.fillStyle = fill;
    ctx.fillText(lines[i], x, ly);
  }
  if (rot !== 0) ctx.restore();
  ctx.globalAlpha = 1;
  ctx.letterSpacing = "0px";
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
}

function hexWithAlpha(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(0,0,0,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// --- Public API ---

export function createEditor(canvas: HTMLCanvasElement, getState: () => DesignState) {
  stateRef = getState();
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  let PW = 960;
  let PH = 540;

  function updateCanvasSize() {
    const ratio = exportH / exportW;
    PW = 960;
    PH = Math.round(PW * ratio);
    canvas.width = PW;
    canvas.height = PH;
  }
  updateCanvasSize();

  setDesignWidth(exportW);

  // Static render loop. scheduleDraw() (re)starts it; it paints one
  // frame then idles until the next scheduleDraw().
  let rafId = 0;
  const warmedFonts = new Set<string>();

  function render(): void {
    rafId = 0;
    const state = getState();
    if (state.bgMode === "mesh" && state.meshAnim) {
      animationPhase = ((performance.now() / 1000) % state.meshAnimDuration) /
        Math.max(1, state.meshAnimDuration);
      paint(ctx, canvas.width, canvas.height, state);
      drawNodeHandles(ctx, canvas.width, canvas.height, state);
      // keep looping while animation is active
      rafId = requestAnimationFrame(() => render());
      return;
    }
    paint(ctx, canvas.width, canvas.height, state);
    if (state.bgMode === "mesh") drawNodeHandles(ctx, canvas.width, canvas.height, state);
    if (!warmedFonts.has(state.font)) {
      warmedFonts.add(state.font);
      ensureFont(state.font, state.weight).then(() => {
        startLoop();
      });
    }
  }

  function startLoop(): void {
    if (!rafId) rafId = requestAnimationFrame(() => render());
  }

  function scheduleDraw(): void {
    startLoop();
  }

  function exportImage(phase = 0): void {
    const s = getState();
    const out = document.createElement("canvas");
    out.width = exportW;
    out.height = exportH;
    const octx = out.getContext("2d")!;
    const prev = animationPhase;
    animationPhase = phase;
    paint(octx, exportW, exportH, s);
    animationPhase = prev;
    const mime =
      s.exportFormat === "jpeg" ? "image/jpeg" : s.exportFormat === "webp" ? "image/webp" : "image/png";
    const url = out.toDataURL(mime);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lumina-lite.${s.exportFormat === "jpeg" ? "jpg" : s.exportFormat}`;
    a.click();
  }

  async function copyToClipboard(phase = 0): Promise<boolean> {
    const s = getState();
    const out = document.createElement("canvas");
    out.width = exportW;
    out.height = exportH;
    const octx = out.getContext("2d")!;
    const prev = animationPhase;
    animationPhase = phase;
    paint(octx, exportW, exportH, s);
    animationPhase = prev;
    const mime =
      s.exportFormat === "jpeg" ? "image/jpeg" : s.exportFormat === "webp" ? "image/webp" : "image/png";
    try {
      const blob: Blob | null = await new Promise((res) => out.toBlob(res, mime));
      if (!blob) return false;
      await navigator.clipboard.write([new ClipboardItem({ [mime]: blob })]);
      return true;
    } catch {
      return false;
    }
  }

  // Render one animation frame deterministically at phase t in [0,1).
  function paintFrame(t: number): HTMLCanvasElement {
    const s = getState();
    const out = document.createElement("canvas");
    out.width = exportW;
    out.height = exportH;
    const octx = out.getContext("2d")!;
    if (s.bgMode === "mesh" && s.transparent) {
      // transparent mesh: paint nodes only over clear canvas
      const prev = animationPhase;
      animationPhase = t;
      paintMesh(octx, exportW, exportH, s, t);
      animationPhase = prev;
    } else {
      animationPhase = t;
      paint(octx, exportW, exportH, s);
    }
    return out;
  }

  async function exportAnimation(
    fps = 25,
    onProgress?: (done: number, total: number, phase: string) => void,
  ): Promise<void> {
    const s = getState();
    const dur = s.meshAnimDuration;
    const frames = Math.max(4, Math.round(fps * dur));
    if (onProgress) onProgress(0, frames, "Rendering frames");

    // MP4 via WebCodecs
    if (typeof VideoEncoder === "undefined") {
      throw new Error("MP4 export requires a browser with WebCodecs (recent Chrome/Edge/Safari).");
    }
    const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: "avc", width: exportW, height: exportH, frameRate: fps },
      fastStart: "in-memory",
    });
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => console.error("VideoEncoder error", e),
    });
    encoder.configure({
      codec: "avc1.640033",
      width: exportW,
      height: exportH,
      bitrate: 8_000_000,
      framerate: fps,
    });
    let frame: VideoFrame;
    for (let i = 0; i < frames; i++) {
      const c = paintFrame(i / frames);
      frame = new VideoFrame(c, { timestamp: (i * 1_000_000) / fps, duration: (1_000_000) / fps });
      encoder.encode(frame, { keyFrame: i % fps === 0 });
      frame.close();
      if (onProgress) onProgress(i + 1, frames, "Encoding");
    }
    await encoder.flush();
    muxer.finalize();
    const { buffer } = muxer.target;
    downloadBlob(new Blob([buffer], { type: "video/mp4" }), "lumina-lite.mp4");
  }

  function downloadBlob(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  return {
    scheduleDraw,
    exportImage,
    copyToClipboard,
    exportAnimation,
    getExportSize(): { w: number; h: number } {
      return { w: exportW, h: exportH };
    },
    setAspectRatio(w: number, h: number) {
      exportW = w;
      exportH = h;
      setDesignWidth(w);
      updateCanvasSize();
    },
  };
}
