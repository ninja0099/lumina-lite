// Image mask shapes: build a clip path centered on the canvas. Editor calls
// ctx.save() -> applyMask() -> draw content -> ctx.restore() to clip to the
// shape. All paths are plain 2D-canvas vector ops (cheap).

export const MASKS = [
  "None",
  "Circle",
  "Oval",
  "Rounded",
  "Diamond",
  "Triangle",
  "Pentagon",
  "Hexagon",
  "Octagon",
  "Star",
  "Heart",
  "Flower",
  "Blob",
  "Cross",
  "Arrow",
  "Cloud",
] as const;

export type MaskName = (typeof MASKS)[number];

export function applyMask(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  name: MaskName,
): void {
  if (name === "None") return;
  const cx = w / 2;
  const cy = h / 2;
  const m = Math.min(w, h);
  ctx.beginPath();
  switch (name) {
    case "Circle":
      ctx.arc(cx, cy, m * 0.42, 0, Math.PI * 2);
      break;
    case "Oval":
      ctx.ellipse(cx, cy, w * 0.42, h * 0.42, 0, 0, Math.PI * 2);
      break;
    case "Rounded":
      roundRect(ctx, cx - w * 0.4, cy - h * 0.42, w * 0.8, h * 0.84, m * 0.08);
      break;
    case "Diamond":
      poly(ctx, cx, cy, m * 0.46, 4, -Math.PI / 2);
      break;
    case "Triangle":
      poly(ctx, cx, cy + m * 0.04, m * 0.5, 3, -Math.PI / 2);
      break;
    case "Pentagon":
      poly(ctx, cx, cy, m * 0.46, 5, -Math.PI / 2);
      break;
    case "Hexagon":
      poly(ctx, cx, cy, m * 0.46, 6, -Math.PI / 2);
      break;
    case "Octagon":
      poly(ctx, cx, cy, m * 0.46, 8, Math.PI / 8);
      break;
    case "Star":
      star(ctx, cx, cy, m * 0.48, m * 0.21, 5);
      break;
    case "Heart":
      heart(ctx, cx, cy, m * 0.4);
      break;
    case "Flower":
      flower(ctx, cx, cy, m * 0.46, m * 0.2, 6);
      break;
    case "Blob":
      blob(ctx, cx, cy, m * 0.44);
      break;
    case "Cross":
      cross(ctx, cx, cy, m * 0.42, m * 0.16);
      break;
    case "Arrow":
      arrow(ctx, cx, cy, w * 0.42, h * 0.3);
      break;
    case "Cloud":
      cloud(ctx, cx, cy, m * 0.42);
      break;
  }
  ctx.clip();
}

function roundRect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function poly(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  sides: number,
  rot: number,
) {
  for (let i = 0; i < sides; i++) {
    const a = rot + (Math.PI * 2 * i) / sides;
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a);
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
}

function star(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points: number,
) {
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (Math.PI * i) / points;
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a);
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
}

function heart(c: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  c.moveTo(cx, cy + s * 0.7);
  c.bezierCurveTo(cx + s, cy, cx + s * 1.3, cy - s * 0.8, cx, cy - s * 0.3);
  c.bezierCurveTo(cx - s * 1.3, cy - s * 0.8, cx - s, cy, cx, cy + s * 0.7);
  c.closePath();
}

function flower(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  petals: number,
) {
  const total = petals * 2;
  for (let i = 0; i < total; i++) {
    const a = (Math.PI * 2 * i) / total;
    const r = i % 2 ? inner : outer;
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a);
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
}

function blob(c: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const pts = 10;
  for (let i = 0; i <= pts; i++) {
    const a = (Math.PI * 2 * i) / pts;
    const rr = r * (0.82 + 0.18 * Math.sin(a * 3 + 0.6));
    const px = cx + rr * Math.cos(a);
    const py = cy + rr * Math.sin(a);
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
}

function cross(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  arm: number,
  thick: number,
) {
  c.rect(cx - thick, cy - arm, thick * 2, arm * 2);
  c.rect(cx - arm, cy - thick, arm * 2, thick * 2);
}

function arrow(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
) {
  c.moveTo(cx - halfW, cy - halfH);
  c.lineTo(cx + halfW * 0.35, cy - halfH);
  c.lineTo(cx + halfW * 0.35, cy - halfH * 0.6);
  c.lineTo(cx + halfW, cy);
  c.lineTo(cx + halfW * 0.35, cy + halfH * 0.6);
  c.lineTo(cx + halfW * 0.35, cy + halfH);
  c.lineTo(cx - halfW, cy + halfH);
  c.closePath();
}

function cloud(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
) {
  const bumps: [number, number, number][] = [
    [-r * 0.55, r * 0.1, r * 0.5],
    [-r * 0.1, -r * 0.3, r * 0.62],
    [r * 0.45, -r * 0.15, r * 0.55],
    [r * 0.7, r * 0.2, r * 0.42],
    [r * 0.1, r * 0.35, r * 0.6],
    [-r * 0.5, r * 0.4, r * 0.5],
  ];
  for (const [bx, by, br] of bumps) {
    c.moveTo(cx + bx + br, cy + by);
    c.arc(cx + bx, cy + by, br, 0, Math.PI * 2);
  }
}
