// <cc-color> custom element. Replaces <input type="color"> with an in-app
// OKLCH picker: a 30x24 swatch tile that opens a popover containing a
// 2D area (Chroma x Lightness, hue fixed), a Hue strip, and Hex/OKLCH/RGB
// inputs plus a native EyeDropper (when available).
//
// Contract preserved for the binder system in main.ts:
//   - element retains its original `id`
//   - `value` getter/setter returns/accepts "#rrggbb"
//   - dispatches `input` events on every change

import {
  oklchToHex,
  parseHex,
  type Oklch,
  type Rgb,
} from "./color";

interface EyeDropperResult { sRGBHex: string; }
interface EyeDropperCtor {
  new (): { open: () => Promise<EyeDropperResult> };
}
function getEyeDropper(): EyeDropperCtor | null {
  return (globalThis as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper ?? null;
}

const SQ = 180; // square pixel size (square area)
const STRIP_H = 14; // hue strip height within wrap
const POP_W = 220; // popup width
const C_MAX = 0.32; // OKLCH chroma upper bound we paint in the square

class CcColor extends HTMLElement {
  private _value = "#000000";
  private oklch: Oklch = { L: 0.5, C: 0.1, h: 0 };
  private pop: HTMLElement | null = null;
  private sqCanvas: HTMLCanvasElement | null = null;
  private stripCanvas: HTMLCanvasElement | null = null;
  private hexInput: HTMLInputElement | null = null;
  private oklchL: HTMLInputElement | null = null;
  private oklchC: HTMLInputElement | null = null;
  private oklchH: HTMLInputElement | null = null;
  private rgbR: HTMLInputElement | null = null;
  private rgbG: HTMLInputElement | null = null;
  private rgbB: HTMLInputElement | null = null;
  private markerHue: HTMLElement | null = null;
  private markerSq: HTMLElement | null = null;
  private editing = false; // suppresses redraw while user is typing in inputs

  static get observedAttributes(): string[] {
    return ["value"];
  }

  connectedCallback(): void {
    if (!this.hasAttribute("tabindex")) this.tabIndex = 0;
    this.style.cssText = `
      width: 30px; height: 24px; padding: 0; box-sizing: border-box;
      border: 1px solid var(--border); border-radius: 5px; cursor: pointer;
      position: relative; overflow: hidden;
      transition: border-color 0.12s;
      background: ${this._value};
    `;
    this.addEventListener("click", this.toggle);
    this.addEventListener("keydown", this.onKey);
    // Initial value from attribute, default hex, or first attach slot.
    const initial = this.getAttribute("value") ?? this.dataset.initial ?? this._value;
    this.value = initial;
    this.syncFromHex(this._value, /*paint*/ false);
    this.style.background = this._value;
  }

  attributeChangedCallback(name: string): void {
    if (name === "value" && !this.editing) {
      const v = this.getAttribute("value") ?? this._value;
      if (v && v !== this._value) this.value = v;
    }
  }

  get value(): string {
    return this._value;
  }
  set value(v: string) {
    const n = (parseHex(v)?.hex ?? "#000000").toLowerCase();
    this._value = n;
    this.style.background = n;
    if (this.isConnected) this.syncFromHex(n, /*paint*/ false);
  }

  private onKey = (e: KeyboardEvent): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this.toggle(e);
    } else if (e.key === "Escape" && this.pop) {
      this.close();
    }
  };

  private toggle = (e: Event): void => {
    e.stopPropagation();
    if (this.pop) this.close();
    else this.open();
  };

  private open(): void {
    if (this.pop) return;
    document.addEventListener("mousedown", this.onDocDown, true);
    document.addEventListener("keydown", this.onDocKey, true);
    const pop = document.createElement("div");
    pop.className = "cc-pop";
    pop.style.width = `${POP_W}px`;
    pop.innerHTML = `
      <div class="cc-square-wrap">
        <canvas class="cc-square" width="${SQ}" height="${SQ}"></canvas>
        <div class="cc-sq-marker"></div>
      </div>
      <div class="cc-strip-wrap">
        <canvas class="cc-strip" width="${POP_W - 16}" height="${STRIP_H}"></canvas>
        <div class="cc-strip-marker"></div>
      </div>
      <div class="cc-rows">
        <label class="cc-row">HEX <input class="cc-hex" maxlength="7" spellcheck="false" /></label>
        <label class="cc-row">L <input class="cc-l" type="number" min="0" max="100" step="1" />%</label>
        <label class="cc-row">C <input class="cc-c" type="number" min="0" max="40" step="1" />%</label>
        <label class="cc-row">H <input class="cc-h" type="number" min="0" max="360" step="1" />°</label>
        <label class="cc-row">R <input class="cc-rgb-r" type="number" min="0" max="255" step="1" /></label>
        <label class="cc-row">G <input class="cc-rgb-g" type="number" min="0" max="255" step="1" /></label>
        <label class="cc-row">B <input class="cc-rgb-b" type="number" min="0" max="255" step="1" /></label>
        <button class="cc-eye icon-btn" title="Pick a color from the screen" type="button" aria-label="Pick a color from the screen">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4zM11 9h2v6h-2V9z" fill="currentColor"/></svg>
        </button>
      </div>
    `;
    document.body.appendChild(pop);
    positionPop(this, pop);
    this.pop = pop;
    this.sqCanvas = pop.querySelector<HTMLCanvasElement>(".cc-square");
    this.stripCanvas = pop.querySelector<HTMLCanvasElement>(".cc-strip");
    this.hexInput = pop.querySelector<HTMLInputElement>(".cc-hex");
    this.oklchL = pop.querySelector<HTMLInputElement>(".cc-l");
    this.oklchC = pop.querySelector<HTMLInputElement>(".cc-c");
    this.oklchH = pop.querySelector<HTMLInputElement>(".cc-h");
    this.rgbR = pop.querySelector<HTMLInputElement>(".cc-rgb-r");
    this.rgbG = pop.querySelector<HTMLInputElement>(".cc-rgb-g");
    this.rgbB = pop.querySelector<HTMLInputElement>(".cc-rgb-b");
    this.markerSq = pop.querySelector<HTMLElement>(".cc-sq-marker");
    this.markerHue = pop.querySelector<HTMLElement>(".cc-strip-marker");
    this.syncFromHex(this._value, /*paint*/ true);
    this.bindSquare();
    this.bindStrip();
    this.bindTextInputs();
    this.bindEyeDropper(pop);
  }

  private close(): void {
    if (!this.pop) return;
    document.removeEventListener("mousedown", this.onDocDown, true);
    document.removeEventListener("keydown", this.onDocKey, true);
    this.pop.remove();
    this.pop = null;
    this.sqCanvas = null;
    this.stripCanvas = null;
    this.hexInput = null;
    this.oklchL = this.oklchC = this.oklchH = null;
    this.rgbR = this.rgbG = this.rgbB = null;
    this.markerSq = this.markerHue = null;
  }

  private onDocDown = (e: MouseEvent): void => {
    if (!this.pop) return;
    if (e.target === this || this.contains(e.target as Node)) return;
    if (this.pop.contains(e.target as Node)) return;
    this.close();
  };
  private onDocKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") this.close();
  };

  // Repaint square + strip + sync inputs to the current `oklch`.
  private paint(): void {
    paintSquare(this.sqCanvas, this.oklch.h);
    paintStrip(this.stripCanvas);
    if (this.markerSq) {
      this.markerSq.style.left = `${(this.oklch.C / C_MAX) * 100}%`;
      this.markerSq.style.top = `${(1 - this.oklch.L) * 100}%`;
    }
    if (this.markerHue) {
      this.markerHue.style.left = `${(this.oklch.h / 360) * 100}%`;
    }
    if (this.hexInput && document.activeElement !== this.hexInput) this.hexInput.value = this._value;
    if (this.oklchL && document.activeElement !== this.oklchL) this.oklchL.value = String(Math.round(this.oklch.L * 100));
    if (this.oklchC && document.activeElement !== this.oklchC) this.oklchC.value = String(Math.round(this.oklch.C * 1000) / 10);
    if (this.oklchH && document.activeElement !== this.oklchH) this.oklchH.value = String(Math.round(this.oklch.h));
    if (this.rgbR && document.activeElement !== this.rgbR) this.rgbR.value = String(Math.round(this._oklchToRgb().r * 255));
    if (this.rgbG && document.activeElement !== this.rgbG) this.rgbG.value = String(Math.round(this._oklchToRgb().g * 255));
    if (this.rgbB && document.activeElement !== this.rgbB) this.rgbB.value = String(Math.round(this._oklchToRgb().b * 255));
  }

  // Refresh from an incoming hex string (called by setter and by syncInputs).
  private syncFromHex(hex: string, paint: boolean): void {
    const parsed = parseHex(hex);
    if (!parsed) return;
    this.oklch = parsed.oklch;
    if (paint) this.paint();
  }

  // Commit new hex: update swatch, paint, dispatch input.
  private commit(hex: string): void {
    const parsed = parseHex(hex);
    if (!parsed) return;
    this._value = parsed.hex;
    this.style.background = parsed.hex;
    this.oklch = parsed.oklch;
    this.paint();
    this.dispatchEvent(new Event("input", { bubbles: true }));
  }

  private _oklchToRgb(): Rgb {
    const parsed = parseHex(this._value);
    return parsed?.rgb ?? { r: 0, g: 0, b: 0 };
  }

  private setOklch(L: number, C: number, h: number): void {
    const lClamped = Math.max(0, Math.min(1, L));
    const cClamped = Math.max(0, Math.min(C_MAX, C));
    const hNorm = ((h % 360) + 360) % 360;
    this.oklch = { L: lClamped, C: cClamped, h: hNorm };
    this.commit(oklchToHex(lClamped, cClamped, hNorm));
  }

  private bindSquare(): void {
    const c = this.sqCanvas;
    if (!c) return;
    const move = (clientX: number, clientY: number) => {
      const r = c.getBoundingClientRect();
      const x = (clientX - r.left) / r.width;
      const y = (clientY - r.top) / r.height;
      this.setOklch(1 - Math.max(0, Math.min(1, y)), Math.max(0, Math.min(1, x)) * C_MAX, this.oklch.h);
    };
    c.addEventListener("pointerdown", (e) => {
      c.setPointerCapture(e.pointerId);
      move(e.clientX, e.clientY);
    });
    c.addEventListener("pointermove", (e) => {
      if (e.buttons === 0) return;
      move(e.clientX, e.clientY);
    });
  }

  private bindStrip(): void {
    const c = this.stripCanvas;
    if (!c) return;
    const move = (clientX: number) => {
      const r = c.getBoundingClientRect();
      const x = (clientX - r.left) / r.width;
      const hue = Math.max(0, Math.min(1, x)) * 360;
      this.setOklch(this.oklch.L, this.oklch.C, hue);
    };
    c.addEventListener("pointerdown", (e) => {
      c.setPointerCapture(e.pointerId);
      move(e.clientX);
    });
    c.addEventListener("pointermove", (e) => {
      if (e.buttons === 0) return;
      move(e.clientX);
    });
  }

  private bindTextInputs(): void {
    const commitHex = () => {
      if (!this.hexInput) return;
      const v = this.hexInput.value;
      const parsed = parseHex(v);
      if (parsed) this.commit(parsed.hex);
    };
    if (this.hexInput) {
      this.hexInput.addEventListener("input", () => {
        this.editing = true;
        const parsed = parseHex(this.hexInput!.value);
        if (parsed) {
          this.oklch = parsed.oklch;
          this.paint();
        }
      });
      this.hexInput.addEventListener("change", () => { this.editing = false; commitHex(); });
      this.hexInput.addEventListener("blur", () => { this.editing = false; commitHex(); });
      this.hexInput.addEventListener("keydown", (e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); });
    }
    const fromOklchInput = () => {
      if (!this.oklchL || !this.oklchC || !this.oklchH) return;
      this.setOklch(Number(this.oklchL.value) / 100, Number(this.oklchC.value) / 1000, Number(this.oklchH.value));
    };
    for (const inp of [this.oklchL, this.oklchC, this.oklchH]) {
      if (!inp) continue;
      inp.addEventListener("input", () => {
        this.editing = true;
        fromOklchInput();
      });
      inp.addEventListener("change", () => { this.editing = false; fromOklchInput(); });
      inp.addEventListener("blur", () => { this.editing = false; this.commit(this._value); });
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); });
    }
    const fromRgbInput = () => {
      if (!this.rgbR || !this.rgbG || !this.rgbB) return;
      const r = Math.max(0, Math.min(255, Number(this.rgbR.value)));
      const g = Math.max(0, Math.min(255, Number(this.rgbG.value)));
      const b = Math.max(0, Math.min(255, Number(this.rgbB.value)));
      const hex = `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
      this.commit(hex);
    };
    for (const inp of [this.rgbR, this.rgbG, this.rgbB]) {
      if (!inp) continue;
      inp.addEventListener("input", () => {
        this.editing = true;
        fromRgbInput();
      });
      inp.addEventListener("change", () => { this.editing = false; fromRgbInput(); });
      inp.addEventListener("blur", () => { this.editing = false; });
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); });
    }
  }

  private bindEyeDropper(root: HTMLElement): void {
    const btn = root.querySelector<HTMLButtonElement>(".cc-eye");
    if (!btn) return;
    const ED = getEyeDropper();
    if (!ED) {
      btn.style.display = "none";
      return;
    }
    btn.addEventListener("click", async () => {
      try {
        const r = await new ED().open();
        this.commit(r.sRGBHex);
      } catch { /* user cancelled */ }
    });
  }
}

function paintSquare(c: HTMLCanvasElement | null, hue: number): void {
  if (!c) return;
  const ctx = c.getContext("2d");
  if (!ctx) return;
  const img = ctx.createImageData(SQ, SQ);
  for (let y = 0; y < SQ; y++) {
    const L = 1 - y / (SQ - 1);
    for (let x = 0; x < SQ; x++) {
      const C = (x / (SQ - 1)) * C_MAX;
      const hex = oklchToHex(L, C, hue);
      const v = parseInt(hex.slice(1), 16);
      const r = (v >> 16) & 0xff;
      const g = (v >> 8) & 0xff;
      const b = v & 0xff;
      const i = (y * SQ + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function paintStrip(c: HTMLCanvasElement | null): void {
  if (!c) return;
  const ctx = c.getContext("2d");
  if (!ctx) return;
  const img = ctx.createImageData(c.width, STRIP_H);
  for (let x = 0; x < c.width; x++) {
    const h = (x / (c.width - 1)) * 360;
    const hex = oklchToHex(0.65, 0.15, h);
    const v = parseInt(hex.slice(1), 16);
    const r = (v >> 16) & 0xff;
    const g = (v >> 8) & 0xff;
    const b = v & 0xff;
    for (let y = 0; y < STRIP_H; y++) {
      const i = (y * c.width + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function positionPop(host: HTMLElement, pop: HTMLElement): void {
  const r = host.getBoundingClientRect();
  const top = window.scrollY + r.bottom + 6;
  const left = Math.max(8, window.scrollX + r.left - (POP_W - r.width) / 2);
  pop.style.position = "absolute";
  pop.style.top = `${top}px`;
  pop.style.left = `${left}px`;
  pop.style.zIndex = "9999";
}

let registered = false;
export function registerColorPicker(): void {
  if (registered) return;
  if (!customElements.get("cc-color")) customElements.define("cc-color", CcColor);
  registered = true;
}

// Swap a native <input type="color"> in-place with <cc-color>, retaining
// its id and a `data-initial` attr as a safety fallback for any caller
// that reads the original element's value during the same tick.
export function replaceInputWithPicker(id: string): void {
  const el = document.getElementById(id);
  if (!el || el.tagName !== "INPUT" || (el as HTMLInputElement).type !== "color") return;
  const cc = document.createElement("cc-color");
  cc.id = el.id;
  cc.setAttribute("value", (el as HTMLInputElement).value);
  cc.dataset.initial = (el as HTMLInputElement).value;
  el.replaceWith(cc);
}
