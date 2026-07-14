const loaded = new Set<string>();

// Lazy Google Fonts loader. Each family's css2 stylesheet is fetched and
// injected on first use (not eagerly at page load) — this avoids the reflow
// storm a 25-font <link> block causes. The sheet carries all four weights
// as woff2 @font-face rules; document.fonts.load() then warms the one we
// actually render so the first paint isn't in a fallback.
export async function ensureFont(family: string, weight = 700): Promise<void> {
  if (loaded.has(family)) return;

  const url =
    "https://fonts.googleapis.com/css2?family=" +
    encodeURIComponent(family).replace(/%20/g, "+") +
    ":wght@100;400;700;900&display=swap";

  try {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
    await document.fonts.load(`${weight} 1em "${family}"`).catch(() => {});
    loaded.add(family);
  } catch {
    // Fall back to system font if fetch fails; do NOT block rendering.
  }
}
