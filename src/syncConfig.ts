// Cross-device sync endpoint. The token is a SECRET: it is never committed to
// the repo. It is injected at build time from a Vite env var — for CI, the
// GitHub repo secret LUMINA_SYNC_TOKEN; for local dev, a gitignored .env.
// There is deliberately NO token fallback here, so the source stays secret.
// The URL is not sensitive, so it keeps a default.
export const SYNC_ENDPOINT: string =
  import.meta.env.VITE_SYNC_URL || "https://lumina-lite-presets.freepg0099.workers.dev/presets";
export const SYNC_AUTH_TOKEN: string | undefined = import.meta.env.VITE_SYNC_TOKEN;
