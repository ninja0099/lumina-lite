const loaded = new Set<string>();
const loading = new Map<string, Promise<void>>();

// Lazy Google Fonts loader. Each family's css2 stylesheet is fetched and
// injected on first use (not eagerly at page load) — this avoids the reflow
// storm a 25-font <link> block causes. The sheet carries all four weights
// as woff2 @font-face rules; document.fonts.load() then warms the one we
// actually render so the first paint isn't in a fallback.
export async function ensureFont(family: string, weight = 700): Promise<void> {
  const key = `${family}:${weight}`;
  if (loaded.has(key)) return;

  // If a load is already in progress for this family+weight, wait for it
  const existing = loading.get(key);
  if (existing) {
    await existing;
    if (loaded.has(key)) return;
    // If it failed, fall through to retry
  }

  const url =
    "https://fonts.googleapis.com/css2?family=" +
    encodeURIComponent(family).replace(/%20/g, "+") +
    ":wght@100;400;500;600;700;800;900&display=swap";

  const loadPromise = (async () => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
    try {
      await new Promise<void>((resolve, reject) => {
        link.onload = () => resolve();
        link.onerror = () => reject(new Error("Font stylesheet failed to load"));
      });
      // Timeout for document.fonts.load to prevent indefinite hang
      await Promise.race([
        document.fonts.load(`${weight} 1em "${family}"`),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("Font load timeout")), 3000),
        ),
      ]);
      // Verify the font is actually usable
      if (!document.fonts.check(`${weight} 1em "${family}"`)) {
        throw new Error("Font not usable after load");
      }
      loaded.add(key);
    } finally {
      // Clean up loading promise
      loading.delete(key);
      // On failure, remove the link to prevent DOM pollution
      if (!loaded.has(key)) {
        link.remove();
      }
    }
  })();

  loading.set(key, loadPromise);
  await loadPromise;
}
