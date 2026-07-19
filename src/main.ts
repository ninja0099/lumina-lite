import "./styles.css";
import {
  createDefaultState,
  FONTS,
  PATTERNS,
  type DesignState,
  type Align,
  type LayerKey,
} from "./state";
import {
  loadPresets,
  createPreset,
  updatePreset,
  deletePreset,
  restoreDefaults,
  snapshotState,
} from "./presetStore";
import { setSyncListeners, initSync, type SyncStatus } from "./sync";
import { createEditor, setBgImage, getSelectedNode, setSelectedNode, nodeAt } from "./editor";
import { oklchToHex, parseHex } from "./color";
import Coloris from "./vendor/coloris/coloris";
import { checkVp9TenBitSupport } from "./codecCapabilities";

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
  { id: "textRotation", apply: (s, v) => (s.textRotation = Number(v)) },
  { id: "textGradient", apply: (s, v) => (s.textGradient = Boolean(v)) },
  { id: "textColor", apply: (s, v) => (s.textColor = String(v)) },
  { id: "textColor2", apply: (s, v) => (s.textColor2 = String(v)) },
  { id: "textGradientAngle", apply: (s, v) => (s.textGradientAngle = Number(v)) },
  { id: "transparentText", apply: (s, v) => (s.transparentText = Boolean(v)) },
  { id: "textShadow", apply: (s, v) => (s.textShadow = Boolean(v)) },
  { id: "shadowBlur", apply: (s, v) => (s.shadowBlur = Number(v)) },
  { id: "shadowOpacity", apply: (s, v) => (s.shadowOpacity = Number(v)) },
  { id: "shadowColor", apply: (s, v) => (s.shadowColor = String(v)) },
  { id: "textGlow", apply: (s, v) => (s.textGlow = Boolean(v)) },
  { id: "textOpacity", apply: (s, v) => (s.textOpacity = Number(v)) },
  { id: "textOutline", apply: (s, v) => (s.textOutline = Boolean(v)) },
  { id: "textOutlineWidth", apply: (s, v) => (s.textOutlineWidth = Number(v)) },
  { id: "textOutlineColor", apply: (s, v) => (s.textOutlineColor = String(v)) },
  { id: "transparent", apply: (s, v) => (s.transparent = Boolean(v)) },
  { id: "bgGradient", apply: (s, v) => (s.bgGradient = Boolean(v)) },
  { id: "bgColor", apply: (s, v) => (s.bgColor = String(v)) },
  { id: "bgMeshColor", apply: (s, v) => (s.bgColor = String(v)) },
  { id: "bgColor2", apply: (s, v) => (s.bgColor2 = String(v)) },
  { id: "bgColorMid", apply: (s, v) => (s.bgColorMid = String(v)) },
  { id: "bgUseColorMid", apply: (s, v) => (s.bgUseColorMid = Boolean(v)) },
  { id: "bgGradientType", apply: (s, v) => (s.bgGradientType = String(v) as DesignState["bgGradientType"]) },
  { id: "bgGradientAngle", apply: (s, v) => (s.bgGradientAngle = Number(v)) },
  { id: "bgGradientOpacity", apply: (s, v) => (s.bgGradientOpacity = Number(v)) },
  { id: "cornerRadius", apply: (s, v) => (s.cornerRadius = Number(v)) },
  { id: "meshSpread", apply: (s, v) => (s.meshSpread = Number(v)) },
  { id: "meshBlur", apply: (s, v) => (s.meshBlur = Number(v)) },
  { id: "meshBaseOpacity", apply: (s, v) => (s.meshBaseOpacity = Number(v)) },
  { id: "meshAnim", apply: (s, v) => (s.meshAnim = Boolean(v)) },
  { id: "meshAnimStyle", apply: (s, v) => (s.meshAnimStyle = v as DesignState["meshAnimStyle"]) },
  { id: "meshAnimSpeed", apply: (s, v) => (s.meshAnimSpeed = Number(v)) },
  { id: "meshAnimAmplitude", apply: (s, v) => (s.meshAnimAmplitude = Number(v)) },
  { id: "meshAnimDuration", apply: (s, v) => (s.meshAnimDuration = Number(v)) },
  { id: "borderGlow", apply: (s, v) => (s.borderGlow = Boolean(v)) },
  { id: "glassPanel", apply: (s, v) => (s.glassPanel = Boolean(v)) },
  { id: "pattern", apply: (s, v) => (s.pattern = v as DesignState["pattern"]) },
  { id: "patternColor", apply: (s, v) => (s.patternColor = String(v)) },
  { id: "bgImageOpacity", apply: (s, v) => (s.bgImageOpacity = Number(v)) },
  { id: "bgImageFit", apply: (s, v) => (s.bgImageFit = String(v) as DesignState["bgImageFit"]) },
  { id: "bgImageX", apply: (s, v) => (s.bgImageX = Number(v)) },
  { id: "bgImageY", apply: (s, v) => (s.bgImageY = Number(v)) },
  { id: "bgImageRotation", apply: (s, v) => (s.bgImageRotation = Number(v)) },
  { id: "bgBlur", apply: (s, v) => (s.bgBlur = Number(v)) },
  { id: "bgChromatic", apply: (s, v) => (s.bgChromatic = Number(v)) },
  { id: "bgWaveAmount", apply: (s, v) => (s.bgWaveAmount = Number(v)) },
  { id: "bgWaveFrequency", apply: (s, v) => (s.bgWaveFrequency = Number(v)) },
  { id: "bgGlitch", apply: (s, v) => (s.bgGlitch = Number(v)) },
  { id: "bgFilmGrain", apply: (s, v) => (s.bgFilmGrain = Number(v)) },
  { id: "bgHalftone", apply: (s, v) => (s.bgHalftone = Boolean(v)) },
  { id: "bgHalftoneRGB", apply: (s, v) => (s.bgHalftoneRGB = Boolean(v)) },
  { id: "bgVignette", apply: (s, v) => (s.bgVignette = Number(v)) },
  { id: "bgPixelate", apply: (s, v) => (s.bgPixelate = Boolean(v)) },
  { id: "bgBloom", apply: (s, v) => (s.bgBloom = Number(v)) },
  { id: "bgLongShadow", apply: (s, v) => (s.bgLongShadow = Boolean(v)) },
  { id: "bgEcho", apply: (s, v) => (s.bgEcho = Number(v)) },
  { id: "bgDuotone", apply: (s, v) => (s.bgDuotone = Number(v) as 0 | 1) },
  { id: "duotoneColorA", apply: (s, v) => (s.duotoneColorA = String(v)) },
  { id: "duotoneColorB", apply: (s, v) => (s.duotoneColorB = String(v)) },
  { id: "duotoneIntensity", apply: (s, v) => (s.duotoneIntensity = Number(v)) },
  { id: "patternOpacity", apply: (s, v) => (s.patternOpacity = Number(v)) },
  { id: "exportFormat", apply: (s, v) => (s.exportFormat = String(v) as DesignState["exportFormat"]) },
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
  const apply = () => {
    b.apply(state, readValue(el));
    if (state.activePreset !== null) {
      state.activePreset = null;
      syncPresetHighlight();
    }
  };
  const commit = () => {
    apply();
    pushHistory();
    editor.scheduleDraw();
  };
  // Ranges fire a burst of 'input' while dragging — redraw live but only
  // commit one history entry when the drag ends ('change'). Checkboxes,
  // selects, and text use 'change'/'input' (already discrete).
  if (el.type === "range") {
    el.addEventListener("input", apply);
    el.addEventListener("input", editor.scheduleDraw);
    el.addEventListener("change", commit);
  } else {
    if (el.type === "checkbox" || el.tagName === "SELECT") {
      el.addEventListener("change", commit);
    } else {
      el.addEventListener("input", () => { apply(); editor.scheduleDraw(); });
      el.addEventListener("change", commit);
    }
  }
}

// Vendor: Coloris color picker. We bind to our `class="coloris"` text inputs
// and let Coloris wrap them. With wrap=true, Coloris renders a swatch overlay
// on the input and opens its own dialog on click. It dispatches `input` on the
// underlying input with a hex string, so the binder contract is preserved.
// parent is left as default (body) so the picker isn't clipped by the panel's
// overflow-y:auto and opens in the correct position relative to the viewport.
Coloris({
  el: ".coloris",
  themeMode: "dark",
  alpha: true,
  format: "auto",
  wrap: true,
  focusInput: false, // prevent mobile keyboard from opening on picker show
});

// Close the Coloris picker on scroll or touch/click outside.
// Coloris handles click-outside natively, but scroll and mobile touch need
// explicit listeners so the dialog doesn't stay open while the user navigates.
document.addEventListener("scroll", () => Coloris.close(), true);
document.addEventListener("touchstart", (e) => {
  if (!(e.target as Element).closest(".clr-picker, .coloris, .clr-field")) {
    Coloris.close();
  }
}, { passive: true });

// Initialize swatches: Coloris sets .clr-field { color: transparent } initially.
// We need to propagate each input's value to the wrapper so the button::after
// swatch shows the actual color instead of the checkerboard placeholder.
// We also patch the .value setter so any programmatic assignment auto-updates.
function syncSwatch(el: HTMLInputElement): void {
  const field = el.closest(".clr-field");
  if (field) (field as HTMLElement).style.color = el.value;
}
function initColorSwatches(): void {
  document.querySelectorAll<HTMLInputElement>(".coloris").forEach((el) => {
    // Prevent mobile keyboard: tabIndex=-1 removes from tab order, mousedown
    // preventDefault stops the browser from focusing the input on touch/tap.
    // Coloris binds its own click handler separately so the picker still opens.
    el.tabIndex = -1;
    if (!(el as any).__colorisFocusGuard) {
      el.addEventListener("mousedown", (e) => e.preventDefault());
      (el as any).__colorisFocusGuard = true;
    }
    syncSwatch(el);
    // Patch .value setter once per element so future programmatic writes update swatch
    if (!(el as any).__colorisPatched) {
      const proto = HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, "value")!;
      const set = desc.set!;
      Object.defineProperty(el, "value", {
        get: desc.get,
        set(v: string) {
          set.call(this, v);
          syncSwatch(this);
        },
        configurable: true,
      });
      (el as any).__colorisPatched = true;
    }
  });
}
// Run once after DOM ready for the static 12 inputs
requestAnimationFrame(initColorSwatches);

// Live value labels. Optional formatter formats the raw slider value.
type LabelRow = [string, string] | [string, string, (v: string) => string];
const labels: LabelRow[] = [
  ["textRotation", "textRotationVal"],
  ["shadowBlur", "shadowBlurVal"],
  ["shadowOpacity", "shadowOpacityVal"],
  ["textOpacity", "textOpacityVal"],
  ["textOutlineWidth", "textOutlineWidthVal"],
  ["bgImageOpacity", "bgImageOpacityVal"],
  ["bgImageX", "bgImageXVal"],
  ["bgImageY", "bgImageYVal"],
  ["bgImageRotation", "bgImageRotationVal"],
  ["bgBlur", "bgBlurVal"],
  ["bgChromatic", "bgChromaticVal"],
  ["bgWaveAmount", "bgWaveAmountVal"],
  ["bgWaveFrequency", "bgWaveFrequencyVal"],
  ["bgGlitch", "bgGlitchVal"],
  ["bgFilmGrain", "bgFilmGrainVal"],
  ["bgVignette", "bgVignetteVal"],
  ["bgBloom", "bgBloomVal"],
  ["bgEcho", "bgEchoVal"],
  ["duotoneIntensity", "duotoneIntensityVal"],
  ["bgGradientOpacity", "bgGradientOpacityVal"],
  ["bgGradientAngle", "bgGradientAngleVal", (v) => `${v}°`],
  ["meshBaseOpacity", "meshBaseOpacityVal", (v) => `${Math.round(Number(v) * 100)}%`],
  ["cornerRadius", "cornerRadiusVal"],
  ["meshBlur", "meshBlurVal", (v) => `${v}px`],
  ["meshAnimSpeed", "meshAnimSpeedVal"],
  ["meshAnimAmplitude", "meshAnimAmplitudeVal", (v) => `${v}%`],
  ["meshAnimDuration", "meshAnimDurationVal"],
];
for (const row of labels) {
  const [input, label, fmt] = row;
  const el = $<HTMLInputElement>(input);
  const out = $(label);
  const set = () => (out.textContent = fmt ? fmt(el.value) : el.value);
  el.addEventListener("input", set);
  set();
}

// Font size: stored as px internally (stable for presets/export). The
// slider displays px or % of canvas height; switching only rescales the
// mapping, the underlying px value is preserved so the visual never jumps.
const PX_RANGE: [number, number] = [40, 500];
const PCT_RANGE: [number, number] = [2, 60];
const fontSizeEl = $<HTMLInputElement>("fontSize");
const fontSizeUnitEl = $<HTMLSelectElement>("fontSizeUnit");
const pxToPct = (px: number, h: number) => Math.round((px / h) * 100);
const pctToPx = (pct: number, h: number) => Math.round((pct / 100) * h);

function updateFontSizeLabel(): void {
  const h = editor.getExportSize().h;
  const disp = state.fontSizeUnit === "pct" ? pxToPct(state.fontSize, h) : state.fontSize;
  $("fontSizeVal").textContent = `${disp}${state.fontSizeUnit}`;
}

function configureFontSizeSlider(): void {
  const h = editor.getExportSize().h;
  const [min, max] = state.fontSizeUnit === "pct" ? PCT_RANGE : PX_RANGE;
  fontSizeEl.min = String(min);
  fontSizeEl.max = String(max);
  fontSizeEl.value = String(
    state.fontSizeUnit === "pct" ? pxToPct(state.fontSize, h) : state.fontSize,
  );
  updateFontSizeLabel();
}

fontSizeEl.addEventListener("input", () => {
  const h = editor.getExportSize().h;
  const disp = Number(fontSizeEl.value);
  state.fontSize = state.fontSizeUnit === "pct" ? pctToPx(disp, h) : disp;
  updateFontSizeLabel();
  editor.scheduleDraw();
});
fontSizeEl.addEventListener("change", () => pushHistory());

fontSizeUnitEl.addEventListener("change", () => {
  state.fontSizeUnit = fontSizeUnitEl.value as "px" | "pct";
  configureFontSizeSlider();
  editor.scheduleDraw();
  pushHistory();
});

// --- Unit sliders (px / % switches) ---
// Each slider stores its value in a "native" unit. The unit select toggles
// between native and a single "alt" unit; the slider only converts across
// that boundary. ref() is the quantity the alt unit is expressed against
// (canvas height, canvas width, or font size, depending on the slider).
type Unit = "weight" | "px" | "ratio" | "pct";
type UnitSlider = {
  id: string;
  stateKey: keyof DesignState;
  unitId: string;
  nativeUnit: Unit;
  nativeRange: [number, number];
  nativeStep: number;
  altUnit: Unit;
  altRange: [number, number];
  altStep: number;
  ref: () => number;
  toAlt: (native: number, ref: number) => number;
  toNative: (alt: number, ref: number) => number;
  fmt: (s: DesignState) => string;
};

const unitSliders: UnitSlider[] = [
  {
    id: "weight", stateKey: "weight", unitId: "weightUnit",
    nativeUnit: "weight", nativeRange: [400, 900], nativeStep: 100,
    altUnit: "px", altRange: [400, 900], altStep: 0.05,
    ref: () => 0, toAlt: (w) => w, toNative: (px) => px,
    fmt: (s) => `${s.weightUnit === "px" ? s.weight.toFixed(2) + "px" : Math.round(s.weight)}`,
  },
  {
    id: "patternOpacity", stateKey: "patternOpacity", unitId: "",
    nativeUnit: "ratio", nativeRange: [0, 1], nativeStep: 0.01,
    altUnit: "ratio", altRange: [0, 1], altStep: 0.01,
    ref: () => 1, toAlt: (v) => v, toNative: (v) => v,
    fmt: (s) => `${Math.round(s.patternOpacity * 100)}%`,
  },
  {
    id: "spacing", stateKey: "letterSpacing", unitId: "letterSpacingUnit",
    nativeUnit: "px", nativeRange: [-10, 40], nativeStep: 0.05,
    altUnit: "pct", altRange: [-2, 8], altStep: 0.1,
    ref: () => editor.getExportSize().h,
    toAlt: (px, h) => (px / h) * 100, toNative: (pct, h) => (pct / 100) * h,
    fmt: (s) => s.letterSpacingUnit === "pct" ? `${(s.letterSpacing / editor.getExportSize().h * 100).toFixed(1)}%` : `${s.letterSpacing.toFixed(2)}px`,
  },
  {
    id: "lineHeight", stateKey: "lineHeight", unitId: "lineHeightUnit",
    nativeUnit: "ratio", nativeRange: [0.6, 3], nativeStep: 0.1,
    altUnit: "px", altRange: [10, 400], altStep: 0.05,
    ref: () => state.fontSize,
    toAlt: (r, fs) => r * fs, toNative: (px, fs) => px / fs,
    fmt: (s) => s.lineHeightUnit === "px" ? `${(s.lineHeight * state.fontSize).toFixed(2)}px` : s.lineHeight.toFixed(1),
  },
  {
    id: "posX", stateKey: "posX", unitId: "posXUnit",
    nativeUnit: "pct", nativeRange: [0, 100], nativeStep: 0.1,
    altUnit: "px", altRange: [0, 1920], altStep: 0.05,
    ref: () => editor.getExportSize().w,
    toAlt: (pct, w) => (pct / 100) * w, toNative: (px, w) => (px / w) * 100,
    fmt: (s) => s.posXUnit === "pct" ? `${Math.round(s.posX)}%` : `${(s.posX / 100 * editor.getExportSize().w).toFixed(2)}px`,
  },
  {
    id: "posY", stateKey: "posY", unitId: "posYUnit",
    nativeUnit: "pct", nativeRange: [0, 100], nativeStep: 0.1,
    altUnit: "px", altRange: [0, 1080], altStep: 0.05,
    ref: () => editor.getExportSize().h,
    toAlt: (pct, h) => (pct / 100) * h, toNative: (px, h) => (px / h) * 100,
    fmt: (s) => s.posYUnit === "pct" ? `${Math.round(s.posY)}%` : `${(s.posY / 100 * editor.getExportSize().h).toFixed(2)}px`,
  },
];

function isNativeUnit(us: UnitSlider): boolean {
  if (!us.unitId) return true;
  return (state as unknown as Record<string, string>)[us.unitId] === us.nativeUnit;
}

function configureUnitSlider(us: UnitSlider): void {
  const el = $<HTMLInputElement>(us.id);
  const native = isNativeUnit(us);
  const [min, max] = native ? us.nativeRange : us.altRange;
  el.min = String(min);
  el.max = String(max);
  el.step = String(native ? us.nativeStep : us.altStep);
  const v = (state as unknown as Record<string, number>)[us.stateKey];
  const ref = us.ref();
  el.value = String(native ? v : us.toAlt(v, ref));
  $(`${us.id}Val`).textContent = us.fmt(state);
}

function reconfigureAllUnitSliders(): void {
  for (const us of unitSliders) configureUnitSlider(us);
}

for (const us of unitSliders) {
  const el = $<HTMLInputElement>(us.id);
  el.addEventListener("input", () => {
    const native = isNativeUnit(us);
    const disp = Number(el.value);
    const ref = us.ref();
    (state as unknown as Record<string, number>)[us.stateKey] =
      native ? disp : us.toNative(disp, ref);
    $(`${us.id}Val`).textContent = us.fmt(state);
    editor.scheduleDraw();
  });
  el.addEventListener("change", () => pushHistory());
  if (us.unitId) {
    $<HTMLSelectElement>(us.unitId).addEventListener("change", () => {
      (state as unknown as Record<string, string>)[us.unitId] =
        $<HTMLSelectElement>(us.unitId).value;
      configureUnitSlider(us);
      editor.scheduleDraw();
      pushHistory();
    });
  }
}

// Angle labels append the degree symbol
for (const id of ["textGradientAngle", "bgGradientAngle"]) {
  const el = $<HTMLInputElement>(id);
  const out = $(`${id}Val`);
  el.addEventListener("input", () => (out.textContent = `${el.value}°`));
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
const resW = $("resW") as HTMLInputElement;
const resH = $("resH") as HTMLInputElement;

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function syncRangeSlider(id: string, labelId: string, fmt?: (v: number) => string): void {
  const el = $<HTMLInputElement>(id);
  const v = (state as unknown as Record<string, number>)[id];
  el.value = String(v);
  const out = $(labelId);
  if (out) out.textContent = fmt ? fmt(v) : String(v);
}

// Stored in export-px and rendered with scale = w/exportW, so each param's frame
// fraction = value/exportW. Rescale by the width ratio on resolution change so the
// fraction — and thus the on-screen preview size — stays "as it is".
const EXPORT_PX_FIELDS = ["shadowBlur", "textOutlineWidth", "cornerRadius", "meshBlur"] as const;

function commitResolution(w: number, h: number, label?: string): void {
  state.exportW = w;
  state.exportH = h;
  $("exportW").textContent = String(w);
  $("exportH").textContent = String(h);
  const g = gcd(w, h) || 1;
  $("aspectLabel").textContent = label ?? `${w / g}:${h / g}`;
  resW.value = String(w);
  resH.value = String(h);
  if (lockRatio) lockRatio = w / h;
  editor.setAspectRatio(w, h);
  configureFontSizeSlider();
  reconfigureAllUnitSliders();
  for (const f of EXPORT_PX_FIELDS) {
    syncRangeSlider(f, `${f}Val`, f === "meshBlur" ? (v) => `${v}px` : undefined);
  }
  syncAspectHighlight();
}

function applyResolution(w: number, h: number, label?: string): void {
  const k = w / editor.getExportSize().w;
  const kh = h / editor.getExportSize().h;
  if (k !== 1 || kh !== 1) {
    state.fontSize *= k;
    for (const f of EXPORT_PX_FIELDS) (state as unknown as Record<string, number>)[f] *= k;
    if (state.letterSpacingUnit === "px") state.letterSpacing *= k;
    if (state.posXUnit === "px") state.posX *= k;
    if (state.posYUnit === "px") state.posY *= kh;
  }
  commitResolution(w, h, label);
  pushHistory();
  editor.scheduleDraw();
}

function syncAspectHighlight(): void {
  const g = gcd(state.exportW, state.exportH) || 1;
  const key = `${state.exportW / g}:${state.exportH / g}`;
  aspectBtns.forEach((b) => b.classList.toggle("active", b.dataset.ratio === key));
}

aspectBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const ratio = btn.dataset.ratio!;
    const asp = ASPECTS[ratio];
    applyResolution(asp.w, asp.h, ratio);
  });
});

const resLock = $("resLock") as HTMLInputElement;
let lockRatio = 1920 / 1080;
const clampRes = (v: number) => Math.round(Math.max(16, Math.min(8000, v || 0)));

resLock.addEventListener("change", () => {
  if (resLock.checked) lockRatio = (Number(resW.value) || 1) / (Number(resH.value) || 1);
});

function onResolutionChange(edited: "w" | "h"): void {
  let w = clampRes(Number(resW.value));
  let h = clampRes(Number(resH.value));
  if (resLock.checked) {
    if (edited === "w") h = clampRes(w / lockRatio);
    else w = clampRes(h * lockRatio);
  }
  applyResolution(w, h);
}

resW.addEventListener("change", () => onResolutionChange("w"));
resH.addEventListener("change", () => onResolutionChange("h"));

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

// Presets — local CRUD layer (storage + KV sync layered on later)
const grid = $("presets");
const presetCountEl = $("presetCount");
const newNameInput = $<HTMLInputElement>("newPresetName");

// Only one preset menu open at a time. The menu is portaled to <body> so it
// escapes the side-panel's overflow clipping and never overlaps sibling tiles.
let openMenu: { el: HTMLElement; btn: HTMLElement } | null = null;

function closeMenu(): void {
  if (!openMenu) return;
  openMenu.el.remove();
  openMenu.btn.setAttribute("aria-expanded", "false");
  openMenu = null;
}

document.addEventListener("pointerdown", (e) => {
  if (!openMenu) return;
  // close on any outside press (covers mouse leave, mobile tap-away, scroll)
  const t = e.target as Node;
  if (t !== openMenu.el && t !== openMenu.btn && !openMenu.el.contains(t)) closeMenu();
}, true);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});

function openMenuFor(tile: HTMLElement, p: { id: string; name: string }): void {
  closeMenu();
  const menu = document.createElement("div");
  menu.className = "preset-menu";
  menu.setAttribute("role", "menu");

  const make = (text: string, cls: string, fn: () => void) => {
    const b = document.createElement("button");
    b.className = `preset-menu-item ${cls}`;
    b.textContent = text;
    b.setAttribute("role", "menuitem");
    b.addEventListener("click", (e) => { e.stopPropagation(); closeMenu(); fn(); });
    menu.appendChild(b);
    return b;
  };

  make("Rename", "", () => {
    const name = window.prompt("Rename preset", p.name);
    if (name === null) return;
    updatePreset(p.id, { name });
    state.activePreset = p.id;
    renderPresets();
    markActive(p.id);
  });
  make("Overwrite with current", "", () => {
    updatePreset(p.id, { apply: snapshotState(state) });
    state.activePreset = p.id;
    renderPresets();
    markActive(p.id);
    editor.scheduleDraw();
  });
  make("Delete", "preset-menu-del", () => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    deletePreset(p.id);
    if (state.activePreset === p.id) state.activePreset = null;
    renderPresets();
  });

  const r = tile.getBoundingClientRect();
  menu.style.top = `${r.bottom + 4}px`;
  menu.style.left = `${Math.max(8, r.right - 150)}px`;
  document.body.appendChild(menu);
  openMenu = { el: menu, btn: tile.querySelector(".preset-menu-btn") as HTMLElement };
  openMenu.btn.setAttribute("aria-expanded", "true");
}

function renderPresets(): void {
  closeMenu();
  const list = loadPresets();
  grid.querySelectorAll(".preset, .preset-add").forEach((e) => e.remove());
  presetCountEl.textContent = String(list.length);

  for (const p of list) {
    const tile = document.createElement("div");
    tile.className = "preset";
    tile.dataset.id = p.id;

    const label = document.createElement("span");
    label.className = "preset-name";
    label.textContent = p.name;
    tile.appendChild(label);

    const menuBtn = document.createElement("button");
    menuBtn.className = "preset-menu-btn";
    menuBtn.textContent = "⋮";
    menuBtn.title = "Preset options";
    menuBtn.setAttribute("aria-haspopup", "true");
    menuBtn.setAttribute("aria-expanded", "false");

    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (openMenu && openMenu.btn === menuBtn) closeMenu();
      else openMenuFor(tile, p);
    });

    tile.append(menuBtn);
    tile.addEventListener("click", (ev) => {
      if (ev.target === menuBtn) return;
      closeMenu();
      Object.assign(state, createDefaultState(), structuredClone(p.apply));
      commitResolution(state.exportW, state.exportH);
      syncInputsFromState();
      state.activePreset = p.id;
      pushHistory();
      editor.scheduleDraw();
      markActive(p.id);
    });
    grid.appendChild(tile);
  }

  const add = document.createElement("div");
  add.className = "preset preset-add";
  add.textContent = "+ Save current";
  add.title = "Save the current design as a new preset";
  add.addEventListener("click", () => {
    const name = (newNameInput.value || "").trim();
    if (!name && !confirm("Save preset with an auto-generated name?")) return;
    createPreset(name, snapshotState(state));
    newNameInput.value = "";
    state.activePreset = null;
    renderPresets();
    editor.scheduleDraw();
  });
  grid.appendChild(add);
}

function markActive(id: string): void {
  grid.querySelectorAll(".preset").forEach((e) => {
    e.classList.toggle("active", (e as HTMLElement).dataset.id === id);
  });
}

$("savePreset").addEventListener("click", () => {
  const name = (newNameInput.value || "").trim();
  if (!name && !confirm("Save preset with an auto-generated name?")) return;
  createPreset(name, snapshotState(state));
  newNameInput.value = "";
  state.activePreset = null;
  renderPresets();
  editor.scheduleDraw();
});

$("restoreDefaults").addEventListener("click", () => {
  if (!confirm("Restore the 20 built-in presets? This replaces your current preset list.")) return;
  restoreDefaults();
  state.activePreset = null;
  renderPresets();
});

renderPresets();

// --- Cross-device sync (Worker + KV, config baked in) ---
const syncStatusEl = $("syncStatus");

function renderSyncStatus(s: SyncStatus, msg: string): void {
  const labels: Record<SyncStatus, string> = {
    local: "Local only",
    synced: "Synced",
    offline: "Offline",
    conflict: "Refreshed",
  };
  syncStatusEl.textContent = msg || labels[s];
  syncStatusEl.dataset.status = s;
}
setSyncListeners(renderPresets, renderSyncStatus);

void initSync();

// Reveal 10-bit VP9/WebM export only after confirming the browser's encoder
// actually honors the bit depth (not just isConfigSupported()=true — see
// codecCapabilities.ts for why that alone isn't trustworthy).
checkVp9TenBitSupport().then((result) => {
  const btn = $<HTMLButtonElement>("exportWebm");
  if (result.supported) {
    btn.classList.remove("hidden");
  } else {
    // Leave hidden. Uncomment for debugging during development:
    // console.info("10-bit VP9 unavailable:", result.reason);
  }
});

// Reset
$("reset").addEventListener("click", () => {
  Object.assign(state, createDefaultState());
  state.activePreset = null;
  commitResolution(state.exportW, state.exportH);
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
  // bgMeshColor aliases bgColor but has no state field — sync explicitly
  ($("bgMeshColor") as HTMLInputElement).value = state.bgColor;
  fontSel.value = state.font;
  patternSel.value = state.pattern;
  fontSizeUnitEl.value = state.fontSizeUnit;
  configureFontSizeSlider();
  for (const us of unitSliders) {
    if (!us.unitId) continue;
    $<HTMLSelectElement>(us.unitId).value = (state as unknown as Record<string, string>)[us.unitId];
  }
  reconfigureAllUnitSliders();
  for (const [input, label] of labels) {
    $(label).textContent = $<HTMLInputElement>(input).value;
  }
  for (const id of ["textGradientAngle", "bgGradientAngle"]) {
    $(`${id}Val`).textContent = `${$<HTMLInputElement>(id).value}°`;
  }
  // Sync button groups
  alignGroup.querySelectorAll<HTMLButtonElement>(".btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.val === state.align);
  });
  for (const k of ["background", "pattern", "text"] as LayerKey[]) {
    ($(`layer${k[0].toUpperCase()}${k.slice(1)}`) as HTMLInputElement).checked = state.layers[k];
  }
  // keep the mesh selection across undo/preset/reset when it's still in range
  const sel = getSelectedNode();
  setSelectedNode(sel >= 0 && sel < state.meshNodes.length ? sel : -1);
  syncMeshUI();
}

// Layer toggles
for (const k of ["background", "pattern", "text"] as LayerKey[]) {
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
    }).catch(() => {
      alert("Could not load that font file.");
    });
  };
  reader.readAsArrayBuffer(file);
});

// Background image from device
$<HTMLInputElement>("bgImageFile").addEventListener("change", (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const url = reader.result as string;
    state.bgImageDataUrl = url;
    await setBgImage(url);
    pushHistory();
    editor.scheduleDraw();
  };
  reader.readAsDataURL(file);
});

// History (undo/redo) — capped at 100 entries to bound memory.
const history: DesignState[] = [structuredClone(state)];
let histIdx = 0;
const MAX_HISTORY = 100;

function pushHistory() {
  history.splice(histIdx + 1);
  history.push(structuredClone(state));
  histIdx = history.length - 1;
  if (history.length > MAX_HISTORY) {
    history.shift();
    histIdx--;
  }
  updateHistoryButtons();
}

function applyHistory(snap: DesignState) {
  Object.assign(state, structuredClone(snap));
  syncInputsFromState();
  editor.scheduleDraw();
  syncPresetHighlight();
}

function syncPresetHighlight() {
  const list = loadPresets();
  const match = list.find((p) => p.id === state.activePreset);
  markActive(match ? match.id : "");
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

// --- Mesh gradient mode ---
const bgModeLinear = $("bgModeLinear");
const bgModeMesh = $("bgModeMesh");
const linearBg = $("linearBg");
const meshBg = $("meshBg");
const meshAnimControls = $("meshAnimControls");
const meshNodeRadius = $("meshNodeRadius") as HTMLInputElement;
const meshNodeOpacity = $("meshNodeOpacity") as HTMLInputElement;
const meshNodeSoftness = $("meshNodeSoftness") as HTMLInputElement;
const meshRadiusAll = $("meshRadiusAll") as HTMLInputElement;
const meshOpacityAll = $("meshOpacityAll") as HTMLInputElement;
const meshSoftnessAll = $("meshSoftnessAll") as HTMLInputElement;

function syncMeshUI(): void {
  const mesh = state.bgMode === "mesh";
  bgModeLinear.classList.toggle("active", !mesh);
  bgModeMesh.classList.toggle("active", mesh);
  linearBg.classList.toggle("hidden", mesh);
  meshBg.classList.toggle("hidden", !mesh);
  meshAnimControls.classList.toggle("hidden", !state.meshAnim);
  ($("bgMeshColor") as HTMLInputElement).value = state.bgColor;
  $("meshCountVal").textContent = String(state.meshNodes.length);
  $("meshModeStacked").classList.toggle("active", state.meshMode === "stacked");
  $("meshModeMerge").classList.toggle("active", state.meshMode === "merge");
  renderNodeList();
  // Re-initialize Coloris on newly created .coloris inputs so .clr-field wrapper is created
  Coloris({ el: ".coloris" });
  initColorSwatches();
  const sel = getSelectedNode();
  const node = state.meshNodes[sel] ?? state.meshNodes[state.meshNodes.length - 1];
  if (node) {
    meshNodeRadius.value = String(node.radius);
    $("meshNodeRadiusVal").textContent = `${node.radius}%`;
    meshNodeOpacity.value = String(node.opacity);
    $("meshNodeOpacityVal").textContent = `${Math.round(node.opacity * 100)}%`;
    meshNodeSoftness.value = String(node.softness);
    $("meshNodeSoftnessVal").textContent = `${Math.round(node.softness * 100)}%`;
  }
}

// Select a node WITHOUT rebuilding the list — used by row/swatch clicks. A full
// syncMeshUI() would innerHTML="" the list mid-click and destroy the color
// input before the native picker anchors, making the picker jump to top-right.
function markSelected(i: number): void {
  setSelectedNode(i);
  const node = state.meshNodes[i];
  if (!node) return;
  $("meshNodeList").querySelectorAll(".node-row").forEach((el, di) => {
    const idx = state.meshNodes.length - 1 - di; // display order -> true index
    el.classList.toggle("sel", idx === i);
  });
  meshNodeRadius.value = String(node.radius);
  $("meshNodeRadiusVal").textContent = `${node.radius}%`;
  meshNodeOpacity.value = String(node.opacity);
  $("meshNodeOpacityVal").textContent = `${Math.round(node.opacity * 100)}%`;
  meshNodeSoftness.value = String(node.softness);
  $("meshNodeSoftnessVal").textContent = `${Math.round(node.softness * 100)}%`;
}

// Build one editable row per node: color swatch + radius + per-row up/down/
// delete. Clicking a row selects it (so canvas drag + the sliders below target
// it). Array order == z-order, so up/down reorders layers directly. In Merge
// mode z-order is irrelevant, so the up/down buttons are hidden.
function renderNodeList(): void {
  const list = $("meshNodeList");
  list.innerHTML = "";
  const sel = getSelectedNode();
  const last = state.meshNodes.length - 1;
  const merged = state.meshMode === "merge";
  // Render top-layer-first (last painted = top of panel) so the ↑/↓ buttons
  // match the visual order: up the list == up a layer. Node identity (num) and
  // the true array index travel with the row.
  for (let di = state.meshNodes.length - 1; di >= 0; di--) {
    const i = di; // true array index (paint order)
    const n = state.meshNodes[i];
    const row = document.createElement("div");
    row.className = "node-row" + (i === sel ? " sel" : "");

    const num = document.createElement("span");
    num.className = "node-num";
    num.textContent = String(state.meshNodes.length - di); // display order: top row = 1

    const pick = document.createElement("input");
    pick.type = "text";
    pick.className = "node-color coloris";
    pick.value = n.color;
    pick.title = "Node color — click to select";
    pick.addEventListener("input", (e) => {
      e.stopPropagation();
      n.color = pick.value;
      editor.scheduleDraw();
    });
    pick.addEventListener("change", () => { pushHistory(); });
    // Select on the swatch too, but via markSelected (no list rebuild) so the
    // native picker anchors to this input instead of jumping to top-right.
    pick.addEventListener("mousedown", (e) => { e.stopPropagation(); markSelected(i); });

    const r = document.createElement("span");
    r.className = "node-r";
    r.dataset.idx = String(i);
    r.textContent = `r${n.radius}%`;

    const o = document.createElement("span");
    o.className = "node-o";
    o.dataset.idx = String(i);
    o.textContent = `o${Math.round(n.opacity * 100)}%`;

    const soft = document.createElement("span");
    soft.className = "node-s";
    soft.dataset.idx = String(i);
    soft.textContent = `s${Math.round(n.softness * 100)}%`;

    const LOCK_SVG = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    const UNLOCK_SVG = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>';
    const lock = document.createElement("button");
    lock.className = "node-lock" + (n.locked ? " locked" : "");
    lock.innerHTML = n.locked ? LOCK_SVG : UNLOCK_SVG;
    lock.title = n.locked ? "Unlock color (palette refresh will change it)" : "Lock color (palette refresh will skip it)";
    lock.addEventListener("click", (e) => {
      e.stopPropagation();
      n.locked = !n.locked;
      lock.innerHTML = n.locked ? LOCK_SVG : UNLOCK_SVG;
      lock.title = n.locked ? "Unlock color (palette refresh will change it)" : "Lock color (palette refresh will skip it)";
      lock.classList.toggle("locked", !!n.locked);
      pushHistory();
    });

    row.append(num, pick, r, o, soft, lock);
    // Whole row is clickable to select (skips rebuild to keep the picker anchored).
    row.addEventListener("mousedown", (e) => { e.stopPropagation(); markSelected(i); });

    if (!merged) {
      const up = document.createElement("button");
      up.className = "mini-btn";
      up.textContent = "↑";
      up.title = "Move up a layer";
      up.disabled = i >= last;
      up.addEventListener("click", (e) => { e.stopPropagation(); moveNode(1, i); });

      const down = document.createElement("button");
      down.className = "mini-btn";
      down.textContent = "↓";
      down.title = "Move down a layer";
      down.disabled = i <= 0;
      down.addEventListener("click", (e) => { e.stopPropagation(); moveNode(-1, i); });

      row.append(up, down);
    }

    const del = document.createElement("button");
    del.className = "mini-btn";
    del.textContent = "×";
    del.title = "Delete node";
    del.disabled = state.meshNodes.length <= 1;
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      state.meshNodes.splice(i, 1);
      setSelectedNode(Math.max(0, Math.min(i, state.meshNodes.length - 1)));
      syncMeshUI();
      pushHistory();
      editor.scheduleDraw();
    });

    row.append(del);
    list.appendChild(row);
  }
}

function selectNode(i: number): void {
  setSelectedNode(i);
  syncMeshUI();
}

bgModeLinear.addEventListener("click", () => { state.bgMode = "linear"; syncMeshUI(); pushHistory(); editor.scheduleDraw(); });
bgModeMesh.addEventListener("click", () => { state.bgMode = "mesh"; syncMeshUI(); pushHistory(); editor.scheduleDraw(); });

$("meshAdd").addEventListener("click", () => {
  const hue = Math.round(Math.random() * 360);
  const color = "#" + [hue, 70, 55].map((v, i) =>
    Math.round((i === 0 ? v / 360 : v / 100) * 255).toString(16).padStart(2, "0")).join("");
  state.meshNodes.push({
    x: 20 + Math.random() * 60,
    y: 20 + Math.random() * 60,
    color,
    radius: 60,
    opacity: 1,
    softness: 0,
  });
  selectNode(state.meshNodes.length - 1);
  pushHistory();
  editor.scheduleDraw();
});

$("meshDel").addEventListener("click", () => {
  const sel = getSelectedNode();
  if (sel < 0 || sel >= state.meshNodes.length) return;
  if (state.meshNodes.length <= 1) return;
  state.meshNodes.splice(sel, 1);
  selectNode(Math.max(0, sel - 1));
  pushHistory();
  editor.scheduleDraw();
});

// Build a hex palette of `count` visually distinct colors.
//
// Pipeline (best zero-input / quality-over-speed):
//   1. generate a large candidate pool in OKLCH — equidistant hue for small N,
//      golden-angle stepping for large N, paired (L, C) bands so neighbors
//      land on different brightness/chroma zones
//   2. score pairwise separation in CIE Lab (ΔE 2000 approximation)
//   3. pick by maximizing the minimum distance to already-chosen colors
//   4. run a handful of random-shuffle restarts, keep the set with the
//      largest worst-pair distance
// Settings tuned to stay under ~30 ms on a mid-tier laptop for N ≤ ~16.
//
// References:
//   - https://clhenrick.io/blog/color-experiments-with-oklch/
//   - https://theproductguy.in/blogs/programmatic-color-generation/
//   - https://mokole.com/palette.html (Lab pairwise-distance approach)
function hash32(x: number): number {
  let h = (x | 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

interface Oklab { L: number; a: number; b: number; }

// OKLCH -> OKLab (cheap, no sRGB roundtrip in the inner loop).
function oklchToOklab(L: number, C: number, hueDeg: number): Oklab {
  const hr = (hueDeg * Math.PI) / 180;
  return { L, a: C * Math.cos(hr), b: C * Math.sin(hr) };
}

// OKLab -> linear sRGB (Björn Ottosson coefficients). Returns true on
// success; false if any channel falls outside [0, 1] (chroma too high for
// that hue on this monitor gamut).
function oklabToLinearSrgb(L: number, a: number, b: number): [number, number, number, boolean] {
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
// OKLCH -> sRGB hex lives in ./color. Imported at the top of this file.

// Linear sRGB -> CIE XYZ (D65). Input is already linear (from oklabToLinearSrgb).
function linearSrgbToXyz(r: number, g: number, b: number): [number, number, number] {
  return [
    0.4124564 * r + 0.3575761 * g + 0.1804375 * b,
    0.2126729 * r + 0.7151522 * g + 0.0721750 * b,
    0.0193339 * r + 0.1191920 * g + 0.9503041 * b,
  ];
}

// XYZ -> CIE Lab (D65 reference white).
function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const ref = [0.95047, 1.0, 1.08883];
  const f = (t: number) =>
    t > 0.008856451679035631 /*(6/29)^3*/ ? Math.cbrt(t) : (t / 0.12841855 /*(29/6)^2 ÷ 3*/) + 0.13793103 /*4/29*/;
  const fx = f(x / ref[0]), fy = f(y / ref[1]), fz = f(z / ref[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// Cache Lab values per OKLCH color — ΔE reads are the inner loop.
const labCache = new Map<string, [number, number, number]>();
function oklchToLab(L: number, C: number, hueDeg: number): [number, number, number] {
  const key = `${L.toFixed(3)}|${C.toFixed(3)}|${hueDeg.toFixed(1)}`;
  const hit = labCache.get(key);
  if (hit) return hit;
  const lab = oklchToOklab(L, C, hueDeg);
  const [r, g, bl] = oklabToLinearSrgb(lab.L, lab.a, lab.b).slice(0, 3) as [number, number, number];
  const [x, y, z] = linearSrgbToXyz(Math.min(1, Math.max(0, r)), Math.min(1, Math.max(0, g)), Math.min(1, Math.max(0, bl)));
  const out = xyzToLab(x, y, z);
  if (labCache.size < 4096) labCache.set(key, out);
  return out;
}

// Cheap perceptual distance (Euclidean in Lab). Good enough for relative
// ranking; full ΔE2000 is overkill here since we only compare *within one
// run* and the inner loop dominates cost.
function labDist(a: [number, number, number], b: [number, number, number]): number {
  const dl = a[0] - b[0], da = a[1] - b[1], db = a[2] - b[2];
  return dl * dl + da * da + db * db;
}

interface Candidate {
  L: number;
  C: number;
  hue: number;
  lab: [number, number, number];
  hex: string;
}

// Build a candidate pool in OKLab space, restricting to in-sRGB-gamut colors.
// Wider L/C range than before — gives dark moody, vivid punchy, and pastel palettes
// in addition to the original mid-tone range.
function buildCandidatePool(count: number, seed: number): Candidate[] {
  const rnd = (i: number) => hash32(seed + i * 2654435761) / 0xffffffff;
  const offset = seed % 360;
  // Warm/cool bias: pick a random hue sector so palettes are thematically coherent
  // instead of always rainbow. Weighted toward the sector with a complementary tail.
  const warmCool = rnd(9999) < 0.5; // true = warm, false = cool
  const sectorCenter = warmCool ? (rnd(9998) * 60 + 15) : (rnd(9998) * 60 + 195); // warm: 15–75, cool: 195–255
  // Equidistant only makes sense when count is large enough to fill the hue
  // circle meaningfully. For count<=4 (linear palettes are always 3) the
  // fixed h*360/count columns repeat on every click — use sector sampling
  // instead so the hue structure itself varies across calls.
  const useEquidistant = count >= 6;
  const N_hues = count <= 6 ? count : count <= 8 ? 24 : count <= 14 ? 36 : 48;
  // Wider bands with more entries near the middle for weighted distribution
  const L_BANDS = [0.35, 0.45, 0.52, 0.58, 0.64, 0.70, 0.78, 0.85];
  const C_BANDS = [0.05, 0.10, 0.14, 0.18, 0.22, 0.28];
  const out: Candidate[] = [];
  for (let h = 0; h < N_hues; h++) {
    let hue: number;
    if (useEquidistant) {
      // Small N: pure equidistant with small jitter for variety
      hue = (offset + (h * 360) / count + rnd(h) * 8) % 360;
    } else {
      // Large N: bias hues toward the chosen sector
      const baseHue = (offset + (h * 360) / N_hues) % 360;
      const distFromSector = Math.abs(((baseHue - sectorCenter + 180) % 360) - 180);
      const bias = distFromSector < 90 ? 0 : distFromSector < 140 ? 0.3 : 0.6;
      hue = rnd(h) < (1 - bias)
        ? (sectorCenter + (baseHue - sectorCenter) * (0.3 + rnd(h + 5000) * 0.5) + rnd(h) * 15) % 360
        : baseHue;
    }
    for (const L of L_BANDS) {
      for (const C of C_BANDS) {
        const lab = oklchToOklab(L, C, hue);
        const [, , , inGamut] = oklabToLinearSrgb(lab.L, lab.a, lab.b);
        if (!inGamut) continue;
        const labPt = oklchToLab(L, C, hue);
        out.push({ L, C, hue, lab: labPt, hex: oklchToHex(L, C, hue) });
      }
    }
  }
  return out;
}

// Greedy farthest-point selection with lightness-contrast weighting.
// Scores = Lab distance + 0.4 × lightness difference. This ensures the palette
// has both hue/chroma spread AND enough L contrast for visual depth in mesh blends.
function pickFarthest(pool: Candidate[], count: number, startIdx: number): number[] {
  if (count <= 0 || pool.length === 0) return [];
  const chosen: number[] = [((startIdx % pool.length) + pool.length) % pool.length];
  while (chosen.length < count) {
    let best = -1;
    let bestMin = -1;
    for (let i = 0; i < pool.length; i++) {
      if (chosen.includes(i)) continue;
      let minD = Infinity;
      for (const c of chosen) {
        const d = labDist(pool[i].lab, pool[c].lab) + 0.4 * Math.abs(pool[i].L - pool[c].L);
        if (d < minD) minD = d;
      }
      if (minD > bestMin) { bestMin = minD; best = i; }
    }
    if (best < 0) break;
    chosen.push(best);
  }
  return chosen;
}

function paletteColors(count: number): string[] {
  if (count <= 0) return [];
  const seed = hash32(Date.now() ^ Math.floor(Math.random() * 0xffffffff));
  const pool = buildCandidatePool(count, seed);
  if (pool.length <= count) return baseBanded(count, seed);
  const restarts = count <= 8 ? 12 : count <= 14 ? 8 : 4;
  type Scored = { idxs: number[]; worst: number };
  const ranked: Scored[] = [];
  for (let r = 0; r < restarts; r++) {
    const picked = pickFarthest(pool, count, r * 17);
    let worst = Infinity;
    for (let i = 0; i < picked.length; i++) {
      for (let j = i + 1; j < picked.length; j++) {
        const d = labDist(pool[picked[i]].lab, pool[picked[j]].lab);
        if (d < worst) worst = d;
      }
    }
    ranked.push({ idxs: picked, worst });
  }
  ranked.sort((a, b) => b.worst - a.worst);
  // Keep sets within 90% of the best — not just the single global optimum.
  // Pick one of the qualifying sets non-deterministically so consecutive
  // clicks return genuinely different palettes.
  const threshold = ranked[0].worst * 0.9;
  const viable = ranked.filter((s) => s.worst >= threshold);
  const chosen = viable[Math.floor(Math.random() * viable.length)].idxs;
  // Sort by chroma ascending: low-C (background base) first, high-C (accent) last
  return chosen
    .map((i) => pool[i])
    .sort((a, b) => a.C - b.C)
    .map((c) => c.hex);
}

// Fallback for huge counts where the OKLab pool can't supply enough
// in-gamut candidates. Uses wider L/C range and banded equidistant hues.
function baseBanded(count: number, seed: number): string[] {
  const rnd = (i: number) => hash32(seed + i * 2654435761) / 0xffffffff;
  const offset = seed % 360;
  return Array.from({ length: count }, (_, i) => {
    const hue = (offset + (i * 360) / count) % 360;
    const band = i % 3;
    const L = band === 0 ? 0.50 + rnd(i) * 0.10
            : band === 1 ? 0.65 + rnd(i) * 0.10
            : 0.78 + rnd(i) * 0.07;
    const C = band === 0 ? 0.10 + rnd(i + 1000) * 0.08
            : band === 1 ? 0.16 + rnd(i + 1000) * 0.08
            : 0.08 + rnd(i + 1000) * 0.06;
    return oklchToHex(L, C, hue);
  });
}

// Set the node count to n, preserving existing nodes and filling gaps with
// golden-angle palette colors.
function setNodeCount(n: number): void {
  const cur = state.meshNodes;
  const colors = paletteColors(n);
  while (cur.length < n) {
    const k = cur.length;
    cur.push({ x: 15 + ((k * 37) % 70), y: 15 + ((k * 53) % 70), color: colors[k], radius: 60, opacity: 1, softness: 0 });
  }
  if (cur.length > n) cur.length = n;
  const sel = getSelectedNode();
  selectNode(Math.min(sel < 0 ? 0 : sel, n - 1));
  syncMeshUI();
  pushHistory();
  editor.scheduleDraw();
}

document.querySelectorAll<HTMLButtonElement>("#meshBg [data-nodes]").forEach((btn) => {
  btn.addEventListener("click", () => setNodeCount(Number(btn.dataset.nodes)));
});

// Generate a fresh palette sized to the current node count.
$("meshPaletteRefresh").addEventListener("click", () => {
  const colors = paletteColors(state.meshNodes.length);
  let ci = 0;
  for (let i = 0; i < state.meshNodes.length; i++) {
    if (state.meshNodes[i].locked) continue;
    state.meshNodes[i].color = colors[ci % colors.length];
    ci++;
  }
  syncMeshUI();
  pushHistory();
  editor.scheduleDraw();
});

// Generate a gradient palette for linear mode (3 colors sorted by hue).
$("linearPaletteRefresh").addEventListener("click", () => {
  const hexes = paletteColors(3);
  // Sort by hue for a smooth gradient transition
  const withHue = hexes.map((h) => {
    const p = parseHex(h);
    return { hex: h, hue: p ? p.oklch.h : 0 };
  });
  withHue.sort((a, b) => a.hue - b.hue);
  state.bgColor = withHue[0].hex;
  state.bgColorMid = withHue[1].hex;
  state.bgColor2 = withHue[2].hex;
  syncInputsFromState();
  pushHistory();
  editor.scheduleDraw();
});

meshNodeRadius.addEventListener("input", () => {
  const val = Number(meshNodeRadius.value);
  $("meshNodeRadiusVal").textContent = `${meshNodeRadius.value}%`;
  if (meshRadiusAll.checked) {
    state.meshNodes.forEach(n => { n.radius = val; });
    // Update per-row text spans without rebuilding DOM
    $("meshNodeList").querySelectorAll<HTMLElement>(".node-r").forEach(el => el.textContent = `r${meshNodeRadius.value}%`);
  } else {
    const sel = getSelectedNode();
    if (state.meshNodes[sel]) {
      state.meshNodes[sel].radius = val;
      const rowR = $("meshNodeList").querySelector<HTMLElement>(`.node-r[data-idx="${sel}"]`);
      if (rowR) rowR.textContent = `r${meshNodeRadius.value}%`;
    }
  }
  editor.scheduleDraw();
});
meshNodeRadius.addEventListener("change", () => {
  if (meshRadiusAll.checked) { renderNodeList(); Coloris({ el: ".coloris" }); initColorSwatches(); }
  pushHistory();
});
meshNodeOpacity.addEventListener("input", () => {
  const val = Number(meshNodeOpacity.value);
  $("meshNodeOpacityVal").textContent = `${Math.round(val * 100)}%`;
  if (meshOpacityAll.checked) {
    state.meshNodes.forEach(n => { n.opacity = val; });
    $("meshNodeList").querySelectorAll<HTMLElement>(".node-o").forEach(el => el.textContent = `o${Math.round(val * 100)}%`);
  } else {
    const sel = getSelectedNode();
    if (state.meshNodes[sel]) {
      state.meshNodes[sel].opacity = val;
      const rowO = $("meshNodeList").querySelector<HTMLElement>(`.node-o[data-idx="${sel}"]`);
      if (rowO) rowO.textContent = `o${Math.round(val * 100)}%`;
    }
  }
  editor.scheduleDraw();
});
meshNodeOpacity.addEventListener("change", () => {
  if (meshOpacityAll.checked) { renderNodeList(); Coloris({ el: ".coloris" }); initColorSwatches(); }
  pushHistory();
});
meshNodeSoftness.addEventListener("input", () => {
  const val = Number(meshNodeSoftness.value);
  $("meshNodeSoftnessVal").textContent = `${Math.round(val * 100)}%`;
  if (meshSoftnessAll.checked) {
    state.meshNodes.forEach(n => { n.softness = val; });
    $("meshNodeList").querySelectorAll<HTMLElement>(".node-s").forEach(el => el.textContent = `s${Math.round(val * 100)}%`);
  } else {
    const sel = getSelectedNode();
    if (state.meshNodes[sel]) {
      state.meshNodes[sel].softness = val;
      const rowS = $("meshNodeList").querySelector<HTMLElement>(`.node-s[data-idx="${sel}"]`);
      if (rowS) rowS.textContent = `s${Math.round(val * 100)}%`;
    }
  }
  editor.scheduleDraw();
});
meshNodeSoftness.addEventListener("change", () => {
  if (meshSoftnessAll.checked) { renderNodeList(); Coloris({ el: ".coloris" }); initColorSwatches(); }
  pushHistory();
});
$("meshAnim").addEventListener("change", () => { syncMeshUI(); });

$("meshModeStacked").addEventListener("click", () => { state.meshMode = "stacked"; syncMeshUI(); pushHistory(); editor.scheduleDraw(); });
$("meshModeMerge").addEventListener("click", () => { state.meshMode = "merge"; syncMeshUI(); pushHistory(); editor.scheduleDraw(); });

// Reorder z-order (array = paint order; last is top). dir +1 moves toward top.
// Optional `idx` targets a specific row's buttons; defaults to the selection.
function moveNode(dir: number, idx: number = getSelectedNode()): void {
  if (idx < 0 || idx >= state.meshNodes.length) return;
  const to = idx + dir;
  if (to < 0 || to >= state.meshNodes.length) return;
  const nodes = state.meshNodes;
  [nodes[idx], nodes[to]] = [nodes[to], nodes[idx]];
  setSelectedNode(to);
  syncMeshUI();
  pushHistory();
  editor.scheduleDraw();
}

// Drag nodes on the canvas
function canvasPoint(e: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}
canvas.addEventListener("pointerdown", (e) => {
  if (state.bgMode !== "mesh") return;
  const p = canvasPoint(e);
  const hit = nodeAt(p.x, p.y, canvas.width, canvas.height);
  if (hit >= 0) {
    selectNode(hit);
    canvas.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const idx = getSelectedNode(); // Always read current selection, not frozen closure
      const node = state.meshNodes[idx];
      if (!node) return;
      const q = canvasPoint(ev);
      node.x = Math.max(0, Math.min(100, (q.x / canvas.width) * 100));
      node.y = Math.max(0, Math.min(100, (q.y / canvas.height) * 100));
      editor.scheduleDraw();
    };
    const up = () => {
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      pushHistory();
    };
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
  }
});

// --- Export handlers ---
function getExportFilename(): string {
  const raw = ($("exportFilename") as HTMLInputElement).value.trim();
  return (raw || "lumina-lite").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "lumina-lite";
}

$("exportPng").addEventListener("click", () => editor.exportImage(0, getExportFilename()));
$("exportTop").addEventListener("click", () => editor.exportImage(0, getExportFilename()));

function runExportMp4(): void {
  const btn = $("exportMp4") as HTMLButtonElement;
  const status = $("exportStatus");
  const fpsRaw = parseInt(($("mp4Fps") as HTMLInputElement).value, 10);
  const fps = Number.isFinite(fpsRaw) && fpsRaw > 0 ? Math.min(60, Math.max(1, fpsRaw)) : 25;
  const bitrateRaw = parseInt(($("mp4Bitrate") as HTMLInputElement).value, 10);
  const bitrateMbps = Number.isFinite(bitrateRaw) && bitrateRaw > 0 ? Math.min(40, Math.max(1, bitrateRaw)) : 8;
  const outFileName = `${getExportFilename()}.mp4`;
  btn.disabled = true;
  status.textContent = "Exporting…";
  const onProgress = (done: number, total: number, phase: string) => {
    status.textContent = `${phase} ${done}/${total}`;
  };
  editor
    .exportAnimation(fps, bitrateMbps, outFileName, onProgress)
    .then(() => (status.textContent = "Done — file downloaded."))
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      status.textContent = msg;
      alert(msg);
    })
    .finally(() => {
      btn.disabled = false;
    });
}

$("exportMp4").addEventListener("click", () => runExportMp4());

function runExportWebM(): void {
  const btn = $("exportWebm") as HTMLButtonElement;
  const status = $("exportStatus");
  const fpsRaw = parseInt(($("mp4Fps") as HTMLInputElement).value, 10);
  const fps = Number.isFinite(fpsRaw) && fpsRaw > 0 ? Math.min(60, Math.max(1, fpsRaw)) : 25;
  const bitrateRaw = parseInt(($("mp4Bitrate") as HTMLInputElement).value, 10);
  const bitrateMbps = Number.isFinite(bitrateRaw) && bitrateRaw > 0 ? Math.min(40, Math.max(1, bitrateRaw)) : 8;
  const outFileName = `${getExportFilename()}.webm`;
  btn.disabled = true;
  status.textContent = "Exporting (VP9 10-bit)…";
  const onProgress = (done: number, total: number, phase: string) => {
    status.textContent = `${phase} ${done}/${total}`;
  };
  editor
    .exportAnimationWebM(fps, bitrateMbps, outFileName, onProgress)
    .then(() => (status.textContent = "Done — file downloaded."))
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      status.textContent = msg;
    })
    .finally(() => {
      btn.disabled = false;
    });
}

$("exportWebm").addEventListener("click", () => runExportWebM());

// Collapsible groups (collapsed by default). Heading is keyboard-operable.
document.querySelectorAll<HTMLElement>(".group-head").forEach((head) => {
  const body = head.nextElementSibling as HTMLElement | null;
  head.tabIndex = 0;
  head.setAttribute("role", "button");
  if (body) {
    body.classList.add("collapsed");
    head.setAttribute("aria-expanded", "false");
    head.querySelector(".chev")!.textContent = "▸";
  }
  const toggle = () => {
    if (!body) return;
    const collapsed = body.classList.toggle("collapsed");
    head.setAttribute("aria-expanded", String(!collapsed));
    head.querySelector(".chev")!.textContent = collapsed ? "▸" : "▾";
  };
  head.addEventListener("click", toggle);
  head.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
  });
});

// Mobile bottom sheet: drag handle to expand/collapse.
const panel = $("panel") as HTMLElement;
const handle = $("sheetHandle") as HTMLElement | null;

if (handle) {
  const mql = window.matchMedia("(max-width: 860px)");
  let dragging = false;
  let startY = 0;
  let startExpanded = false;

  const isExpanded = () => panel.classList.contains("expanded");
  const setExpanded = (v: boolean) => panel.classList.toggle("expanded", v);

  handle.addEventListener("pointerdown", (e: PointerEvent) => {
    if (!mql.matches) return;
    dragging = true;
    startY = e.clientY;
    startExpanded = isExpanded();
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener("pointermove", (e: PointerEvent) => {
    if (!dragging) return;
    const delta = e.clientY - startY;
    if (delta < -30 && !startExpanded) setExpanded(true);
    if (delta > 30 && startExpanded) setExpanded(false);
  });
  handle.addEventListener("pointerup", (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(e.clientY - startY) < 8) setExpanded(!startExpanded);
  });
  handle.addEventListener("pointercancel", () => { dragging = false; });

  mql.addEventListener("change", (e) => { if (!e.matches) setExpanded(false); });
}

// Keyboard shortcuts: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z (or Y) redo
window.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;
  const k = e.key.toLowerCase();
  if (k === "z" && !e.shiftKey) { e.preventDefault(); $("undo").click(); }
  else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); $("redo").click(); }
});

// Initial render
syncInputsFromState();
syncAspectHighlight();
updateHistoryButtons();
editor.scheduleDraw();
