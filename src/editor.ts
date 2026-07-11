import type { DesignState } from "./state";
import { ensureFont } from "./fonts";
import { drawPattern } from "./patterns";
import { applyMask } from "./masks";
import { applyBackgroundEffects } from "./effects";

let exportW = 1920;
let exportH = 1080;

let logoImg: HTMLImageElement | null = null;
export function setLogo(dataUrl: string | null): void {
  if (!dataUrl) { logoImg = null; return; }
  const img = new Image();
  img.onload = () => (logoImg = img);
  img.src = dataUrl;
}

let bgImg: HTMLImageElement | null = null;
export function setBgImage(dataUrl: string | null): void {
  if (!dataUrl) { bgImg = null; return; }
  const img = new Image();
  img.onload = () => (bgImg = img);
  img.src = dataUrl;
}

function paintBg(ctx: CanvasRenderingContext2D, w: number, h: number, s: DesignState): void {
  ctx.clearRect(0, 0, w, h);

  if (s.layers.background && bgImg && !s.transparent) {
    const scale = Math.max(w / bgImg.width, h / bgImg.height);
    const iw = bgImg.width * scale;
    const ih = bgImg.height * scale;
    const ox = (w - iw) / 2;
    const oy = (h - ih) / 2;

    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d")!;
    octx.drawImage(bgImg, ox, oy, iw, ih);
    if (s.bgBlur > 0 || s.bgChromatic > 0 || s.bgWaveAmount > 0 || s.bgGlitch > 0 || s.bgFilmGrain > 0 || s.bgVignette > 0 || s.bgBloom > 0 || s.bgHalftone || s.bgPixelate || s.bgLongShadow || s.bgEcho > 0) {
      applyBackgroundEffects(octx, w, h, s);
    }
    ctx.drawImage(off, 0, 0);

    if (s.bgGradient) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, s.bgColor);
      g.addColorStop(1, s.bgColor2);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  } else if (s.layers.background && !s.transparent) {
    if (s.bgGradient) {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, s.bgColor);
      g.addColorStop(1, s.bgColor2);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = s.bgColor;
    }
    ctx.fillRect(0, 0, w, h);
    if (s.bgVignette > 0 || s.bgLongShadow || s.bgEcho > 0) {
      applyBackgroundEffects(ctx, w, h, s);
    }
  }

  if (s.layers.pattern && s.pattern !== "None") {
    drawPattern(ctx, w, h, s.pattern, s.patternColor);
  }
}

function paintFg(ctx: CanvasRenderingContext2D, w: number, h: number, s: DesignState): void {
  if (s.layers.text && s.glassPanel) drawGlass(ctx, w, h);

  ctx.save();
  if (s.mask !== "None") applyMask(ctx, w, h, s.mask);

  if (s.layers.logo && logoImg) {
    const lw = w * s.logoScale;
    const scale = lw / logoImg.width;
    const lh = logoImg.height * scale;
    ctx.drawImage(logoImg, (w - lw) / 2, h * 0.12, lw, lh);
  }

  if (s.layers.text) drawText(ctx, w, h, s);

  ctx.restore();

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
}

function paint(ctx: CanvasRenderingContext2D, w: number, h: number, s: DesignState): void {
  ctx.clearRect(0, 0, w, h);
  paintBg(ctx, w, h, s);
  paintFg(ctx, w, h, s);
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
  if (currentCharLimit !== undefined) text = text.slice(0, currentCharLimit);

  const scale = w / exportW;
  const px = s.fontSize * scale;
  const style = s.italic ? "italic" : "normal";
  ctx.font = `${style} ${s.weight} ${px}px "${s.font}", system-ui, sans-serif`;
  ctx.textAlign = s.align;
  ctx.textBaseline = "middle";
  ctx.letterSpacing = `${s.letterSpacing * scale}px`;

  let fill: string | CanvasGradient = s.textColor;
  if (s.textGradient) {
    const g = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.7);
    g.addColorStop(0, s.textColor);
    g.addColorStop(1, s.textColor2);
    fill = g;
  }

  const x =
    s.align === "left" ? w * 0.06 : s.align === "right" ? w * 0.94 : w * (s.posX / 100);
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
      ctx.shadowColor = `rgba(0,0,0,${s.shadowOpacity})`;
      ctx.shadowBlur = s.shadowBlur * scale;
    }
    if (s.textGlow) {
      ctx.shadowColor = s.textColor;
      ctx.shadowBlur = Math.max(ctx.shadowBlur, w / 12);
    }

    ctx.fillStyle = fill;
    ctx.fillText(lines[i], x, ly);
  }
  if (rot !== 0) ctx.restore();
  ctx.letterSpacing = "0px";
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
}

// --- Animation ---

let animStart = 0;
let currentCharLimit: number | undefined;

export function resetAnimation(): void {
  animStart = performance.now();
}

function applyAnimation(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  s: DesignState,
  time: number,
): void {
  const anim = s.animation;
  currentCharLimit = undefined;
  if (anim === "None") return;

  if (!animStart) animStart = time;
  const t = Math.min((time - animStart) / 1000, 100);
  const loopPeriod = s.gifDuration || 2;
  const loop = t % loopPeriod;

  ctx.save();
  const cx = w / 2, cy = h / 2;

  switch (anim) {
    case "Pulse": {
      const sc = 1 + 0.08 * Math.sin(loop * Math.PI);
      ctx.translate(cx, cy);
      ctx.scale(sc, sc);
      ctx.translate(-cx, -cy);
      break;
    }
    case "Slide In": {
      const p = easeOut(Math.min(t / 0.8, 1));
      ctx.globalAlpha = p;
      break;
    }
    case "Slide ← In": {
      const p = easeOut(Math.min(t / 0.8, 1));
      ctx.translate(-w * (1 - p), 0);
      break;
    }
    case "Slide → In": {
      const p = easeOut(Math.min(t / 0.8, 1));
      ctx.translate(w * (1 - p), 0);
      break;
    }
    case "Slide ↑ In": {
      const p = easeOut(Math.min(t / 0.8, 1));
      ctx.translate(0, -h * (1 - p));
      break;
    }
    case "Slide ↓ In": {
      const p = easeOut(Math.min(t / 0.8, 1));
      ctx.translate(0, h * (1 - p));
      break;
    }
    case "Fade In": {
      const p = easeOut(Math.min(t / 1, 1));
      ctx.globalAlpha = p;
      break;
    }
    case "Zoom In": {
      const p = easeOut(Math.min(t / 0.8, 1));
      const sc = 0.3 + 0.7 * p;
      ctx.translate(cx, cy);
      ctx.scale(sc, sc);
      ctx.translate(-cx, -cy);
      break;
    }
    case "Zoom Out": {
      const p = easeOut(Math.min(t / 0.8, 1));
      const sc = 1.7 - 0.7 * p;
      ctx.translate(cx, cy);
      ctx.scale(sc, sc);
      ctx.translate(-cx, -cy);
      break;
    }
    case "Glow Pulse": {
      ctx.shadowColor = s.textColor;
      ctx.shadowBlur = (w / 12) * (0.6 + 0.4 * Math.sin(loop * Math.PI));
      break;
    }
    case "Bounce": {
      const p = Math.abs(Math.sin(t * 3));
      ctx.translate(0, -h * 0.08 * p);
      break;
    }
    case "Shake": {
      const dx = Math.sin(t * 25) * w * 0.01;
      const dy = Math.cos(t * 20) * h * 0.005;
      ctx.translate(dx, dy);
      break;
    }
    case "Wave": {
      const dy = Math.sin(t * 2) * h * 0.04;
      ctx.translate(0, dy);
      break;
    }
    case "Rotate": {
      const angle = Math.sin(t * 1.5) * 0.06;
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.translate(-cx, -cy);
      break;
    }
    case "Swing": {
      const angle = Math.sin(t * 3) * 0.08;
      ctx.translate(cx, h * 0.2);
      ctx.rotate(angle);
      ctx.translate(-cx, -h * 0.2);
      break;
    }
    case "Flip": {
      const p = (1 - Math.cos(t * 2)) / 2;
      ctx.translate(cx, cy);
      ctx.scale(1 - 2 * p * 0.3, 1);
      ctx.translate(-cx, -cy);
      break;
    }
    case "Float": {
      const dx = Math.sin(t * 1.2) * w * 0.015;
      const dy = Math.cos(t * 0.8) * h * 0.02;
      ctx.translate(dx, dy);
      break;
    }
    case "Rainbow": {
      const hue = (t * 60) % 360;
      ctx.filter = `hue-rotate(${hue}deg)`;
      break;
    }
    case "Blink": {
      ctx.globalAlpha = Math.sin(t * 4) > 0 ? 1 : 0.15;
      break;
    }
    case "Typewriter": {
      currentCharLimit = Math.floor(Math.min(t / 1.2, 1) * s.text.length * 2);
      break;
    }
  }
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// --- Public API ---

export function createEditor(canvas: HTMLCanvasElement, getState: () => DesignState) {
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

  let pending = false;

  function scheduleDraw() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      const state = getState();
      applyAnimation(ctx, canvas.width, canvas.height, state, performance.now());
      paint(ctx, canvas.width, canvas.height, state);
      ensureFont(state.font).then(() => {
        paint(ctx, canvas.width, canvas.height, getState());
      });
    });
  }

  // Render a specific animation frame to a given canvas context (for GIF export).
  function renderFrame(
    target: CanvasRenderingContext2D,
    w: number,
    h: number,
    state: DesignState,
    timeMs: number,
  ): void {
    if (state.animateBg && state.animation !== "None") {
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const octx = off.getContext("2d")!;
      applyAnimation(octx, w, h, state, timeMs);
      paintBg(octx, w, h, state);
      target.clearRect(0, 0, w, h);
      target.drawImage(off, 0, 0);
      paintFg(target, w, h, state);
    } else {
      applyAnimation(target, w, h, state, timeMs);
      paint(target, w, h, state);
    }
  }

  function exportPng(): void {
    const out = document.createElement("canvas");
    out.width = exportW;
    out.height = exportH;
    const octx = out.getContext("2d")!;
    paint(octx, exportW, exportH, getState());
    const url = out.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "lumina-lite.png";
    a.click();
  }

  function exportGif(state: DesignState, onComplete?: () => void): void {
    const dur = state.gifDuration;
    const fps = state.gifFps;
    const maxSz = state.gifMaxSize;
    const scale = maxSz / PW;
    const gw = Math.round(PW * scale);
    const gh = Math.round(PH * scale);
    const frameCount = Math.round(dur * fps);
    const delay = 1000 / fps;

    const offscreen = document.createElement("canvas");
    offscreen.width = gw;
    offscreen.height = gh;
    const octx = offscreen.getContext("2d", { willReadFrequently: true })!;
    octx.scale(scale, scale);

    const frameData: { data: Uint8ClampedArray; delay: number }[] = [];
    for (let i = 0; i < frameCount; i++) {
      const t = (i / frameCount) * dur * 1000;
      octx.clearRect(0, 0, gw, gh);
      renderFrame(octx, gw, gh, state, t);
      frameData.push({
        data: new Uint8ClampedArray(octx.getImageData(0, 0, gw, gh).data),
        delay,
      });
    }

    const worker = new Worker(
      new URL("./gif-worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (e) => {
      const { blob } = e.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lumina-lite.gif";
      a.click();
      URL.revokeObjectURL(url);
      onComplete?.();
    };
    worker.postMessage({
      frames: frameData,
      width: gw,
      height: gh,
      loop: state.gifLoop,
    });
  }

  return {
    scheduleDraw,
    exportPng,
    exportGif,
    resetAnimation,
    setAspectRatio(w: number, h: number) {
      exportW = w;
      exportH = h;
      updateCanvasSize();
    },
  };
}
