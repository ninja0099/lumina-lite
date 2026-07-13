export interface Env {
  PRESETS_KV: KVNamespace;
  SYNC_TOKEN: string;
}

const KEY = "presets";

// GitHub Pages project-page origin for this repo.
const ALLOWED_ORIGIN = "https://ninja0099.github.io";

function cors(res: Response, origin: string | null): Response {
  // Permit the production origin and any localhost (dev/testing). Block others.
  if (origin === ALLOWED_ORIGIN || (origin && /^https?:\/\/localhost(:\d+)?$/.test(origin)))
    res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.headers.set("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  return res;
}

interface Store {
  rev: number;
  presets: unknown[];
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS")
      return cors(new Response(null, { status: 204 }), req.headers.get("Origin"));

    const auth = req.headers.get("Authorization");
    if (auth !== `Bearer ${env.SYNC_TOKEN}`)
      return cors(new Response("Unauthorized", { status: 401 }), req.headers.get("Origin"));

    if (req.method === "GET") {
      const stored = await env.PRESETS_KV.get(KEY, "json");
      const body: Store =
        stored ?? { rev: 0, presets: [] };
      return cors(Response.json(body), req.headers.get("Origin"));
    }

    if (req.method === "PUT") {
      let incoming: Store;
      try {
        incoming = (await req.json()) as Store;
      } catch {
        return cors(new Response("Bad request", { status: 400 }), req.headers.get("Origin"));
      }
      if (typeof incoming?.rev !== "number" || !Array.isArray(incoming.presets))
        return cors(new Response("Bad request", { status: 400 }), req.headers.get("Origin"));

      const current = (await env.PRESETS_KV.get(KEY, "json")) as Store | null;
      const currentRev = current?.rev ?? 0;

      // Optimistic concurrency: reject stale writes so an out-of-date client
      // can't silently overwrite newer data (409 -> client re-syncs).
      if (incoming.rev !== currentRev) {
        return cors(
          Response.json(current ?? { rev: 0, presets: [] }, { status: 409 }),
          req.headers.get("Origin"),
        );
      }

      const next: Store = { rev: currentRev + 1, presets: incoming.presets };
      await env.PRESETS_KV.put(KEY, JSON.stringify(next));
      return cors(Response.json(next), req.headers.get("Origin"));
    }

    return cors(new Response("Not found", { status: 404 }), req.headers.get("Origin"));
  },
};
