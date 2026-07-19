// Runtime capability gate for 10-bit VP9 (Profile 2) export.
//
// isConfigSupported() alone is not trustworthy — Chromium has shipped builds
// where it reports `supported: true` for 10-bit VP9 while the actual encoder
// silently produces 8-bit output regardless of the requested profile
// (see https://github.com/w3c/webcodecs/issues/441). We therefore run a tiny
// differential encode: the same synthetic gradient frame is encoded once as
// 8-bit Profile 0 and once as 10-bit Profile 2, and we compare output byte
// length. If they're identical, the browser is lying and we don't enable the
// 10-bit path. If they differ, the encoder is at minimum treating the two
// configs differently, which rules out the known silent-fallback bug.
//
// Result is cached for the lifetime of the page — this is deliberately a few
// hundred milliseconds of one-time work, not something to re-run per export.

export const VP9_CODEC_8BIT = "vp09.00.10.08";
export const VP9_CODEC_10BIT = "vp09.02.30.10.01.09.01.09.01";

export interface Vp9CapabilityResult {
  supported: boolean;
  reason: string;
}

let cached: Promise<Vp9CapabilityResult> | null = null;

function makeGradientCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#050505");
  g.addColorStop(0.5, "#7a0d0d");
  g.addColorStop(1, "#1b1b3a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return c;
}

async function encodeProbeClip(codec: string, w: number, h: number): Promise<number | null> {
  const support = await VideoEncoder.isConfigSupported({
    codec,
    width: w,
    height: h,
    bitrate: 2_000_000,
    framerate: 25,
  });
  if (!support.supported) return null;

  let totalBytes = 0;
  let failed = false;

  const encoder = new VideoEncoder({
    output: (chunk) => { totalBytes += chunk.byteLength; },
    error: () => { failed = true; },
  });

  try {
    encoder.configure({ codec, width: w, height: h, bitrate: 2_000_000, framerate: 25 });
  } catch {
    return null;
  }

  const canvas = makeGradientCanvas(w, h);
  for (let i = 0; i < 4; i++) {
    const frame = new VideoFrame(canvas, {
      timestamp: (i * 1_000_000) / 25,
      duration: 1_000_000 / 25,
    });
    try {
      encoder.encode(frame, { keyFrame: i === 0 });
    } finally {
      frame.close();
    }
  }

  await encoder.flush();
  encoder.close();

  return failed ? null : totalBytes;
}

async function probe(): Promise<Vp9CapabilityResult> {
  if (typeof VideoEncoder === "undefined") {
    return { supported: false, reason: "WebCodecs unavailable in this browser" };
  }

  const W = 320, H = 200;

  const support10 = await VideoEncoder.isConfigSupported({
    codec: VP9_CODEC_10BIT, width: W, height: H, bitrate: 2_000_000, framerate: 25,
  }).catch(() => null);

  if (!support10 || !support10.supported) {
    return { supported: false, reason: "isConfigSupported() rejects 10-bit VP9 on this browser" };
  }

  const [bytes8, bytes10] = await Promise.all([
    encodeProbeClip(VP9_CODEC_8BIT, W, H),
    encodeProbeClip(VP9_CODEC_10BIT, W, H),
  ]);

  if (bytes8 === null || bytes10 === null) {
    return { supported: false, reason: "Real encode of test clip failed" };
  }

  if (bytes8 === bytes10) {
    return {
      supported: false,
      reason: "Encoder produced identical output for 8-bit and 10-bit configs — silent fallback to 8-bit (known Chromium bug, see w3c/webcodecs#441)",
    };
  }

  return { supported: true, reason: "Differential encode confirms distinct 8-bit vs 10-bit output" };
}

// Cached, memoized check. Safe to call from multiple places (e.g. on app
// init to decide whether to show the UI button at all, and again right
// before export as a final guard).
export function checkVp9TenBitSupport(): Promise<Vp9CapabilityResult> {
  if (!cached) cached = probe();
  return cached;
}
