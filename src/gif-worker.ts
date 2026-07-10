/* eslint-disable no-restricted-globals */
// Self-contained GIF encoder — NeuQuant quantization + LZW compression.
// No external dependencies. Receives RGBA frames, posts back a GIF Blob.

interface Frame {
  data: Uint8ClampedArray;
  delay: number;
}

const MAX_COLORS = 256;

self.onmessage = function (e) {
  const { frames, width, height, loop } = e.data as {
    frames: Frame[];
    width: number;
    height: number;
    loop: boolean;
  };

  // quality controls NeuQuant sampling — lower = more colors = bigger file
  const encoder = new GIFEncoder(width, height, loop);
  for (const f of frames) {
    encoder.addFrame(f.data, f.delay);
  }
  const buf = encoder.finish();
  const blob = new Blob([buf as unknown as BlobPart], { type: "image/gif" });
  self.postMessage({ blob });
};

// --- Minimal GIF Encoder ---

class GIFEncoder {
  private w: number;
  private h: number;
  private out: number[] = [];

  constructor(w: number, h: number, loop: boolean) {
    this.w = w;
    this.h = h;
    // Header
    this.writeStr("GIF89a");
    // Logical Screen Descriptor
    this.write16(w);
    this.write16(h);
    this.out.push(0xf7, 0, 0); // GCT flag=1, colorRes=7, sort=0, gctSize=0
    // Global Color Table (filled per frame via palette)
    // NETSCAPE extension for looping
    if (loop) {
      this.out.push(0x21, 0xff, 0x0b);
      this.writeStr("NETSCAPE2.0");
      this.out.push(0x03, 0x01);
      this.write16(0); // loop forever
      this.out.push(0x00);
    }
  }

  addFrame(rgba: Uint8ClampedArray, delayMs: number): void {
    const { palette, indexed } = quantize(rgba, this.w * this.h);
    // Graphic Control Extension
    this.out.push(0x21, 0xf9, 0x04);
    this.out.push(0x00); // disposal=0, no transparency
    this.write16(Math.round(delayMs / 10)); // delay in centiseconds
    this.out.push(0x00); // transparent color index
    this.out.push(0x00);
    // Image Descriptor
    this.out.push(0x2c);
    this.write16(0); this.write16(0);
    this.write16(this.w); this.write16(this.h);
    this.out.push(0x87); // local color table, 256 colors
    // Local Color Table
    for (let i = 0; i < MAX_COLORS * 3; i++) this.out.push(palette[i]);
    // LZW Minimum Code Size
    const minCodeSize = 8;
    this.out.push(minCodeSize);
    // LZW compressed data
    const lzw = lzwEncode(indexed, minCodeSize);
    // Write sub-blocks
    let pos = 0;
    while (pos < lzw.length) {
      const chunk = lzw.slice(pos, pos + 255);
      this.out.push(chunk.length);
      for (const b of chunk) this.out.push(b);
      pos += 255;
    }
    this.out.push(0x00); // block terminator
  }

  finish(): Uint8Array {
    this.out.push(0x3b); // GIF Trailer
    return new Uint8Array(this.out);
  }

  private write16(v: number): void {
    this.out.push(v & 0xff, (v >> 8) & 0xff);
  }
  private writeStr(s: string): void {
    for (let i = 0; i < s.length; i++) this.out.push(s.charCodeAt(i));
  }
}

// --- NeuQuant Quantization (simplified) ---

function quantize(rgba: Uint8ClampedArray, pixelCount: number) {
  const samplePixels = Math.min(pixelCount, 10000);
  const net = new NeuQuant(rgba, pixelCount, samplePixels);
  const palette = new Uint8Array(MAX_COLORS * 3);
  for (let i = 0; i < MAX_COLORS; i++) {
    palette[i * 3] = net.r(i);
    palette[i * 3 + 1] = net.g(i);
    palette[i * 3 + 2] = net.b(i);
  }
  const indexed = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const p = i * 4;
    indexed[i] = net.lookupRGB(rgba[p], rgba[p + 1], rgba[p + 2]);
  }
  return { palette, indexed };
}

class NeuQuant {
  private net = new Int32Array(MAX_COLORS * 3);
  private fac: Float64Array;
  private readonly netsize = MAX_COLORS;
  private readonly initrad = MAX_COLORS >> 3;
  private readonly radiusbiasshift = 6;
  private readonly gamma = 1024;

  constructor(pixels: Uint8ClampedArray, pixelCount: number, samplePixels: number) {
    for (let i = 0; i < this.netsize; i++) {
      const v = (i << 8) / this.netsize;
      this.net[i * 3] = v;
      this.net[i * 3 + 1] = v;
      this.net[i * 3 + 2] = v;
    }
    this.fac = new Float64Array(256);
    for (let i = 0; i < 256; i++)
      this.fac[i] = (Math.pow(i / 255, 2) * this.gamma) >> this.radiusbiasshift;
    const step = Math.max(1, Math.floor((pixelCount * 3) / samplePixels / 4));
    let pos = 0;
    const sampleCount = Math.min(pixelCount, samplePixels);
    for (let i = 0; i < sampleCount; i++) {
      const r = pixels[pos], g = pixels[pos + 1], b = pixels[pos + 2];
      this.learn(r, g, b);
      pos += step * 4;
      if (pos >= pixelCount * 4) pos -= pixelCount * 4;
    }
    this.buildIndex();
  }

  private learn(r: number, g: number, b: number): void {
    let bestd = 1 << 30, best = -1;
    for (let n = 0; n < this.netsize; n++) {
      const d = this.dist(r, g, b, n);
      if (d < bestd) { bestd = d; best = n; }
    }
    const rad = this.initrad >> 1;
    for (let i = -rad; i <= rad; i++) {
      const n = best + i;
      if (n < 0 || n >= this.netsize) continue;
      const f = this.fac[Math.abs(i)];
      this.net[n * 3] += ((r - this.net[n * 3]) * f) >> this.gamma;
      this.net[n * 3 + 1] += ((g - this.net[n * 3 + 1]) * f) >> this.gamma;
      this.net[n * 3 + 2] += ((b - this.net[n * 3 + 2]) * f) >> this.gamma;
    }
  }

  private dist(r: number, g: number, b: number, n: number): number {
    const dr = r - this.net[n * 3];
    const dg = g - this.net[n * 3 + 1];
    const db = b - this.net[n * 3 + 2];
    return dr * dr + dg * dg + db * db;
  }

  private buildIndex(): void {
    for (let i = 0; i < this.netsize; i++) {
      this.net[i * 3] = Math.max(0, Math.min(255, this.net[i * 3]));
      this.net[i * 3 + 1] = Math.max(0, Math.min(255, this.net[i * 3 + 1]));
      this.net[i * 3 + 2] = Math.max(0, Math.min(255, this.net[i * 3 + 2]));
    }
  }

  r(i: number) { return this.net[i * 3]; }
  g(i: number) { return this.net[i * 3 + 1]; }
  b(i: number) { return this.net[i * 3 + 2]; }

  lookupRGB(r: number, g: number, b: number): number {
    let bestd = 1 << 30, best = 0;
    for (let i = 0; i < this.netsize; i++) {
      const d = this.dist(r, g, b, i);
      if (d < bestd) { bestd = d; best = i; }
    }
    return best;
  }
}

// --- LZW Encoder ---

function lzwEncode(indexed: Uint8Array, minCodeSize: number): number[] {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  const out: number[] = [];
  let curByte = 0;
  let curBits = 0;

  const emit = (code: number) => {
    curByte |= code << curBits;
    curBits += codeSize;
    while (curBits >= 8) {
      out.push(curByte & 0xff);
      curByte >>= 8;
      curBits -= 8;
    }
  };

  // Init hash table
  const table = new Map<string, number>();
  for (let i = 0; i < clearCode; i++) table.set(String(i), i);

  emit(clearCode);
  let current = String(indexed[0]);

  for (let i = 1; i < indexed.length; i++) {
    const next = current + "," + indexed[i];
    if (table.has(next)) {
      current = next;
    } else {
      emit(table.get(current)!);
      if (nextCode < 4096) {
        table.set(next, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
      } else {
        emit(clearCode);
        table.clear();
        for (let j = 0; j < clearCode; j++) table.set(String(j), j);
        nextCode = eoiCode + 1;
        codeSize = minCodeSize + 1;
      }
      current = String(indexed[i]);
    }
  }
  emit(table.get(current)!);
  emit(eoiCode);
  if (curBits > 0) out.push(curByte & 0xff);
  return out;
}
