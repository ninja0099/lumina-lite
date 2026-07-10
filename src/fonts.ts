const loaded = new Set<string>();

// Lazy Google Fonts loader via FontFace API. Each font is fetched on first use,
// not eagerly at page load — this avoids the 25-font reflow storm the original has.
export async function ensureFont(family: string): Promise<void> {
  if (loaded.has(family)) return;
  loaded.add(family);

  const url =
    "https://fonts.googleapis.com/css2?family=" +
    encodeURIComponent(family).replace(/%20/g, "+") +
    ":wght@100;400;700;900&display=swap";

  try {
    const css = await (await fetch(url)).text();
    const src = css.match(/src:\s*url\(([^)]+)\)\s*format\('(opentype|truetype)'\)/);
    if (!src) return;
    const face = new FontFace(family, `url(${src[1]})`);
    await face.load();
    document.fonts.add(face);
  } catch {
    // Fall back to system font if fetch fails; do NOT block rendering.
  }
}
