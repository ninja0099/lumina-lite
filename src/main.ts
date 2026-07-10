import "./styles.css";
import {
  createDefaultState,
  FONTS,
  PATTERNS,
  MASKS,
  ANIMATIONS,
  type DesignState,
  type Align,
  type LayerKey,
} from "./state";
import { PRESETS } from "./presets";
import { createEditor, setLogo, setBgImage } from "./editor";

const state = createDefaultState();
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const canvas = $<HTMLCanvasElement>("preview");
const editor = createEditor(canvas, () => state);

type Binder = {
  id: string;
  apply: (s: DesignState, v: string | boolean | number) => void;
};

const binders: Binder[] = [
  { id: "text", apply: (s, v) => (s.text = String(v)) },
  { id: "uppercase", apply: (s, v) => (s.uppercase = Boolean(v)) },
  { id: "italic", apply: (s, v) => (s.italic = Boolean(v)) },
  { id: "font", apply: (s, v) => (s.font = String(v)) },
  { id: "fontSize", apply: (s, v) => (s.fontSize = Number(v)) },
  { id: "weight", apply: (s, v) => (s.weight = Number(v)) },
  { id: "spacing", apply: (s, v) => (s.letterSpacing = Number(v)) },
  { id: "lineHeight", apply: (s, v) => (s.lineHeight = Number(v)) },
  { id: "posX", apply: (s, v) => (s.posX = Number(v)) },
  { id: "posY", apply: (s, v) => (s.posY = Number(v)) },
  { id: "textGradient", apply: (s, v) => (s.textGradient = Boolean(v)) },
  { id: "textColor", apply: (s, v) => (s.textColor = String(v)) },
  { id: "transparentText", apply: (s, v) => (s.transparentText = Boolean(v)) },
  { id: "shadowBlur", apply: (s, v) => (s.shadowBlur = Number(v)) },
  { id: "shadowOpacity", apply: (s, v) => (s.shadowOpacity = Number(v)) },
  { id: "textGlow", apply: (s, v) => (s.textGlow = Boolean(v)) },
  { id: "transparent", apply: (s, v) => (s.transparent = Boolean(v)) },
  { id: "bgGradient", apply: (s, v) => (s.bgGradient = Boolean(v)) },
  { id: "bgColor", apply: (s, v) => (s.bgColor = String(v)) },
  { id: "borderGlow", apply: (s, v) => (s.borderGlow = Boolean(v)) },
  { id: "glassPanel", apply: (s, v) => (s.glassPanel = Boolean(v)) },
  { id: "pattern", apply: (s, v) => (s.pattern = v as DesignState["pattern"]) },
  { id: "logoScale", apply: (s, v) => (s.logoScale = Number(v)) },
  { id: "bgBlur", apply: (s, v) => (s.bgBlur = Number(v)) },
  { id: "bgChromatic", apply: (s, v) => (s.bgChromatic = Number(v)) },
  { id: "bgWaveAmount", apply: (s, v) => (s.bgWaveAmount = Number(v)) },
  { id: "bgWaveFrequency", apply: (s, v) => (s.bgWaveFrequency = Number(v)) },
  { id: "animateBg", apply: (s, v) => (s.animateBg = Boolean(v)) },
  { id: "gifDuration", apply: (s, v) => { s.gifDuration = Number(v); updateGifInfo(); } },
  { id: "gifFps", apply: (s, v) => { s.gifFps = Number(v); updateGifInfo(); } },
  { id: "gifQuality", apply: (s, v) => (s.gifQuality = Number(v)) },
  { id: "gifMaxSize", apply: (s, v) => (s.gifMaxSize = Number(v)) },
  { id: "gifLoop", apply: (s, v) => (s.gifLoop = Boolean(v)) },
];

function readValue(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "range")) {
    return el.type === "checkbox" ? el.checked : Number(el.value);
  }
  return el.value;
}

// Wire inputs -> state -> coalesced redraw.
for (const b of binders) {
  const el = $<HTMLInputElement>(b.id);
  const sync = () => {
    b.apply(state, readValue(el));
    pushHistory();
    editor.scheduleDraw();
  };
  el.addEventListener("input", sync);
  el.addEventListener("change", sync);
}

// Live value labels
const labels: [string, string][] = [
  ["fontSize", "fontSizeVal"],
  ["weight", "weightVal"],
  ["spacing", "spacingVal"],
  ["lineHeight", "lineHeightVal"],
  ["posX", "posXVal"],
  ["posY", "posYVal"],
  ["shadowBlur", "shadowBlurVal"],
  ["shadowOpacity", "shadowOpacityVal"],
  ["logoScale", "logoScaleVal"],
  ["bgBlur", "bgBlurVal"],
  ["bgChromatic", "bgChromaticVal"],
  ["bgWaveAmount", "bgWaveAmountVal"],
  ["bgWaveFrequency", "bgWaveFrequencyVal"],
  ["gifDuration", "gifDurationVal"],
  ["gifFps", "gifFpsVal"],
  ["gifQuality", "gifQualityVal"],
  ["gifMaxSize", "gifMaxSizeVal"],
];
for (const [input, label] of labels) {
  const el = $<HTMLInputElement>(input);
  const out = $(label);
  el.addEventListener("input", () => (out.textContent = el.value));
}

// Font dropdown
const fontSel = $<HTMLSelectElement>("font");
for (const f of FONTS) {
  const opt = document.createElement("option");
  opt.value = f;
  opt.textContent = f;
  fontSel.appendChild(opt);
}
fontSel.value = state.font;

// Pattern dropdown
const patternSel = $<HTMLSelectElement>("pattern");
for (const p of PATTERNS) {
  const opt = document.createElement("option");
  opt.value = p;
  opt.textContent = p;
  patternSel.appendChild(opt);
}

// Mask buttons
const maskGroup = $("maskGroup");
for (const m of MASKS) {
  const btn = document.createElement("button");
  btn.className = "btn toggle" + (m === state.mask ? " active" : "");
  btn.textContent = m;
  btn.dataset.val = m;
  btn.addEventListener("click", () => {
    maskGroup.querySelectorAll(".btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.mask = m as DesignState["mask"];
    pushHistory();
    editor.scheduleDraw();
  });
  maskGroup.appendChild(btn);
}

// Animation buttons
const animGroup = $("animGroup");
for (const a of ANIMATIONS) {
  const btn = document.createElement("button");
  btn.className = "btn toggle" + (a === state.animation ? " active" : "");
  btn.textContent = a;
  btn.dataset.val = a;
  btn.addEventListener("click", () => {
    animGroup.querySelectorAll(".btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.animation = a;
    pushHistory();
    editor.scheduleDraw();
  });
  animGroup.appendChild(btn);
}

// Align buttons
const alignGroup = $("alignGroup");
alignGroup.querySelectorAll<HTMLButtonElement>(".btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    alignGroup.querySelectorAll(".btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.align = btn.dataset.val as Align;
    pushHistory();
    editor.scheduleDraw();
  });
});

// Aspect ratio buttons
const aspectBtns = document.querySelectorAll<HTMLButtonElement>(".aspect-btn");
const ASPECTS: Record<string, { w: number; h: number }> = {
  "16:9": { w: 1920, h: 1080 },
  "1:1": { w: 1080, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
  "2:3": { w: 1080, h: 1620 },
};
aspectBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    aspectBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const ratio = btn.dataset.ratio!;
    const asp = ASPECTS[ratio];
    $("exportW").textContent = String(asp.w);
    $("exportH").textContent = String(asp.h);
    $("aspectLabel").textContent = ratio;
    editor.setAspectRatio(asp.w, asp.h);
    pushHistory();
    editor.scheduleDraw();
  });
});

// Zoom controls
const wrap = $("canvasWrap");
const zoomLabel = $("zoomLabel");
let zoomVal = 100;

function setZoom(v: number) {
  zoomVal = Math.max(50, Math.min(200, v));
  wrap.style.transform = `scale(${zoomVal / 100})`;
  zoomLabel.textContent = `${zoomVal}%`;
  document.querySelectorAll<HTMLButtonElement>(".zoom-preset").forEach((b) => {
    b.classList.toggle("active", Number(b.dataset.z) === zoomVal);
  });
}

$("zoomIn").addEventListener("click", () => setZoom(zoomVal + 10));
$("zoomOut").addEventListener("click", () => setZoom(zoomVal - 10));
document.querySelectorAll<HTMLButtonElement>(".zoom-preset").forEach((btn) => {
  btn.addEventListener("click", () => setZoom(Number(btn.dataset.z)));
});

// Presets
const grid = $("presets");
const presetEls = new Map<string, HTMLButtonElement>();
for (const p of PRESETS) {
  const btn = document.createElement("button");
  btn.className = "preset";
  btn.textContent = p.name;
  btn.addEventListener("click", () => {
    Object.assign(state, p.apply);
    syncInputsFromState();
    presetEls.forEach((e) => e.classList.remove("active"));
    btn.classList.add("active");
    state.activePreset = p.name;
    pushHistory();
    editor.scheduleDraw();
  });
  presetEls.set(p.name, btn);
  grid.appendChild(btn);
}

// Reset
$("reset").addEventListener("click", () => {
  Object.assign(state, createDefaultState());
  presetEls.forEach((e) => e.classList.remove("active"));
  state.activePreset = null;
  syncInputsFromState();
  pushHistory();
  editor.scheduleDraw();
});

// Push current state back into the DOM controls (after preset/reset).
function syncInputsFromState() {
  for (const b of binders) {
    const el = $<HTMLInputElement>(b.id);
    const val = (state as unknown as Record<string, unknown>)[b.id];
    if (el instanceof HTMLInputElement && el.type === "checkbox") el.checked = Boolean(val);
    else if (el instanceof HTMLInputElement && el.type === "range") el.value = String(val);
    else el.value = String(val);
  }
  fontSel.value = state.font;
  patternSel.value = state.pattern;
  for (const [input, label] of labels) {
    $(label).textContent = $<HTMLInputElement>(input).value;
  }
  // Sync button groups
  alignGroup.querySelectorAll<HTMLButtonElement>(".btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.val === state.align);
  });
  maskGroup.querySelectorAll<HTMLButtonElement>(".btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.val === state.mask);
  });
  animGroup.querySelectorAll<HTMLButtonElement>(".btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.val === state.animation);
  });
  for (const k of ["background", "pattern", "logo", "text"] as LayerKey[]) {
    ($(`layer${k[0].toUpperCase()}${k.slice(1)}`) as HTMLInputElement).checked = state.layers[k];
  }
  $("clearLogo").style.display = state.logoDataUrl ? "block" : "none";
}

// Layer toggles
for (const k of ["background", "pattern", "logo", "text"] as LayerKey[]) {
  const el = $(`layer${k[0].toUpperCase()}${k.slice(1)}`) as HTMLInputElement;
  el.addEventListener("change", () => {
    state.layers[k] = el.checked;
    pushHistory();
    editor.scheduleDraw();
  });
}

// Font from device
$<HTMLInputElement>("fontFile").addEventListener("change", (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const name = file.name.replace(/\.[^.]+$/, "");
    const face = new FontFace(name, reader.result as ArrayBuffer);
    face.load().then(() => {
      document.fonts.add(face);
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      fontSel.appendChild(opt);
      fontSel.value = name;
      state.font = name;
      pushHistory();
      editor.scheduleDraw();
    });
  };
  reader.readAsArrayBuffer(file);
});

// Logo from device
$<HTMLInputElement>("logoFile").addEventListener("change", (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const url = reader.result as string;
    state.logoDataUrl = url;
    setLogo(url);
    $("clearLogo").style.display = "block";
    pushHistory();
    editor.scheduleDraw();
  };
  reader.readAsDataURL(file);
});

$("clearLogo").addEventListener("click", () => {
  state.logoDataUrl = null;
  setLogo(null);
  $("clearLogo").style.display = "none";
  pushHistory();
  editor.scheduleDraw();
});

// Background image from device
$<HTMLInputElement>("bgImageFile").addEventListener("change", (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const url = reader.result as string;
    state.bgImageDataUrl = url;
    setBgImage(url);
    pushHistory();
    editor.scheduleDraw();
  };
  reader.readAsDataURL(file);
});

// GIF frame count info
function updateGifInfo() {
  const frames = Math.round(state.gifDuration * state.gifFps);
  $("gifInfo").textContent = `Total frames: ${frames}. Higher FPS / size / quality = bigger file and slower export.`;
}

// Export GIF — re-enable button when worker posts back the blob
$("exportGifBtn").addEventListener("click", () => {
  const btn = $("exportGifBtn") as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = "Exporting...";
  editor.exportGif(state, () => {
    btn.disabled = false;
    btn.textContent = "Export as GIF";
  });
});

// History (undo/redo)
const history: DesignState[] = [structuredClone(state)];
let histIdx = 0;
let suspend = false;

function pushHistory() {
  if (suspend) return;
  history.splice(histIdx + 1);
  history.push(structuredClone(state));
  histIdx = history.length - 1;
  updateHistoryButtons();
}

function applyHistory(snap: DesignState) {
  suspend = true;
  Object.assign(state, structuredClone(snap));
  syncInputsFromState();
  suspend = false;
  editor.scheduleDraw();
}

function updateHistoryButtons() {
  ($("undo") as HTMLButtonElement).disabled = histIdx <= 0;
  ($("redo") as HTMLButtonElement).disabled = histIdx >= history.length - 1;
}

$("undo").addEventListener("click", () => {
  if (histIdx <= 0) return;
  histIdx--;
  applyHistory(history[histIdx]);
  updateHistoryButtons();
});
$("redo").addEventListener("click", () => {
  if (histIdx >= history.length - 1) return;
  histIdx++;
  applyHistory(history[histIdx]);
  updateHistoryButtons();
});

// Export
$("exportPng").addEventListener("click", () => editor.exportPng());

// Initial render
syncInputsFromState();
updateHistoryButtons();
editor.scheduleDraw();
