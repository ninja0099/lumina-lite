import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let loading: Promise<void> | null = null;

async function buildWorkerURL(): Promise<string> {
  const tag = "0.12.15";
  const base = `https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@${tag}/dist/esm`;
  const [workerSrc, constSrc, errorsSrc] = await Promise.all(
    ["worker.js", "const.js", "errors.js"].map((f) =>
      fetch(`${base}/${f}`).then((r) => r.text()),
    ),
  );
  const bundled = `${constSrc}\n${errorsSrc}\n${workerSrc
    .replace(/import\s*\{[^}]*\}\s*from\s*"\.\/const\.js";?\s*/g, "")
    .replace(/import\s*\{[^}]*\}\s*from\s*"\.\/errors\.js";?\s*/g, "")}`;
  return URL.createObjectURL(
    new Blob([bundled], { type: "text/javascript" }),
  );
}

export async function loadFFmpeg(
  onProgress?: (pct: number) => void,
): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  if (loading) { await loading; return ffmpeg!; }

  loading = (async () => {
    ffmpeg = new FFmpeg();
    ffmpeg.on("log", ({ message }) => {
      const m = /frame=\s*(\d+)/.exec(message);
      if (m && onProgress) onProgress(Number(m[1]));
    });

    const baseURL =
      "https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm";

    const [workerURL, coreURL, wasmURL] = await Promise.all([
      buildWorkerURL(),
      toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    ]);

    await ffmpeg.load({ classWorkerURL: workerURL, coreURL, wasmURL });
  })();

  await loading;
  return ffmpeg!;
}

export async function encodeMP4(
  frames: Blob[],
  fps: number,
  value = 18,
  useCrf = true,
  onFrame?: (done: number, total: number) => void,
): Promise<Blob> {
  const ff = await loadFFmpeg();

  for (let i = 0; i < frames.length; i++) {
    const name = `frame${String(i + 1).padStart(4, "0")}.png`;
    const buf = await frames[i].arrayBuffer();
    await ff.writeFile(name, new Uint8Array(buf));
    if (onFrame) onFrame(i + 1, frames.length);
  }

  const onLog = ({ message }: { message: string }) => {
    const m = /frame=\s*(\d+)/.exec(message);
    if (m && onFrame) onFrame(Number(m[1]), frames.length);
  };
  ff.on("log", onLog);

  const qualityFlags = useCrf
    ? ["-crf", String(value)]
    : ["-b:v", `${value * 1000}k`];

  await ff.exec([
    "-framerate", String(fps),
    "-i", "frame%04d.png",
    "-c:v", "libx264",
    "-preset", "veryfast",
    ...qualityFlags,
    "-pix_fmt", "yuv420p",
    "output.mp4",
  ]);

  ff.off("log", onLog);

  const data = await ff.readFile("output.mp4");

  for (let i = 0; i < frames.length; i++) {
    await ff.deleteFile(`frame${String(i + 1).padStart(4, "0")}.png`);
  }
  await ff.deleteFile("output.mp4");

  return new Blob([new Uint8Array(data as Uint8Array)], { type: "video/mp4" });
}
