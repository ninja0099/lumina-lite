import { PRESETS } from "./presets";
import type { StoredPreset } from "./presetStore";
import { SYNC_ENDPOINT, SYNC_AUTH_TOKEN } from "./syncConfig";

// Frontend sync layer. localStorage is the fast-path (works offline, instant
// load). The Cloudflare Worker + KV is the cross-device source of truth, joined
// via optimistic concurrency (rev). Failures are silent at the user level —
// the app always works locally; sync is best-effort.

const LS_KEY = "lumina-presets";
const REV_KEY = "lumina-sync-rev";

export type SyncStatus = "local" | "synced" | "offline" | "conflict";

let onChange: (() => void) | null = null;
let statusListener: ((s: SyncStatus, msg: string) => void) | null = null;

export function setSyncListeners(change: () => void, status: (s: SyncStatus, msg: string) => void): void {
  onChange = change;
  statusListener = status;
}

function notify(s: SyncStatus, msg = ""): void {
  statusListener?.(s, msg);
}

// --- localStorage (unchanged shape from presetStore; sync owns it now) ---

function seed(): StoredPreset[] {
  return PRESETS.map((p) => ({
    id: p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    name: p.name,
    apply: p.apply,
    createdAt: 0,
    updatedAt: 0,
  }));
}

function writeLocal(list: StoredPreset[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* private mode / quota — in-memory this session only */
  }
}

export function loadPresets(): StoredPreset[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      const s = seed();
      writeLocal(s);
      return s;
    }
    const parsed = JSON.parse(raw) as StoredPreset[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const s = seed();
      writeLocal(s);
      return s;
    }
    return parsed;
  } catch {
    const s = seed();
    writeLocal(s);
    return s;
  }
}

export function savePresets(list: StoredPreset[]): void {
  writeLocal(list);
  pushToServer();
}

// --- sync settings (endpoint + token are baked via syncConfig) ---

function getRev(): number {
  return Number(localStorage.getItem(REV_KEY) ?? "0") || 0;
}
function setRev(n: number): void {
  localStorage.setItem(REV_KEY, String(n));
}

// On load: fetch from Worker. If it has presets, reconcile local -> server
// (unless local is empty, in which case server's data wins). Never wipe the
// 20 built-ins by adopting an empty server store.
export async function initSync(): Promise<void> {
  if (!SYNC_ENDPOINT || !SYNC_AUTH_TOKEN) {
    notify("local");
    return;
  }
  try {
    const res = await fetch(SYNC_ENDPOINT, {
      headers: { Authorization: `Bearer ${SYNC_AUTH_TOKEN}` },
    });
    if (!res.ok) {
      notify("offline");
      return;
    }
    const data = (await res.json()) as { rev: number; presets: StoredPreset[] };
    setRev(data.rev);
    if (data.presets && data.presets.length > 0) {
      writeLocal(data.presets);
      onChange?.();
      notify("synced");
    } else {
      // Server empty but we have local presets: upload them.
      const local = loadPresets();
      if (local.length > 0) pushToServer();
      else notify("synced");
    }
  } catch {
    notify("offline");
  }
}

async function pushToServer(): Promise<void> {
  if (!SYNC_ENDPOINT || !SYNC_AUTH_TOKEN) {
    notify("local");
    return;
  }
  const rev = getRev();
  const body = { rev, presets: loadPresets() };
  try {
    const res = await fetch(SYNC_ENDPOINT, {
      method: "PUT",
      headers: { Authorization: `Bearer ${SYNC_AUTH_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = (await res.json()) as { rev: number };
      setRev(data.rev);
      notify("synced");
    } else if (res.status === 409) {
      // Out of date: adopt server copy, tell the user their edits were replaced.
      const data = (await res.json()) as { rev: number; presets: StoredPreset[] };
      setRev(data.rev);
      writeLocal(data.presets ?? loadPresets());
      onChange?.();
      notify("conflict", "Presets changed on another device — refreshed to match.");
    }
  } catch {
    notify("offline");
  }
}
