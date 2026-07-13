import { PRESETS } from "./presets";
import type { DesignState } from "./state";
import { loadPresets, savePresets } from "./sync";

// Thin CRUD wrapper over the sync store. The store module owns localStorage +
// Worker sync; this layer just models presets and persists through it.

export interface StoredPreset {
  id: string;
  name: string;
  apply: Partial<DesignState>;
  createdAt: number;
  updatedAt: number;
}

export { loadPresets };

// Snapshot of every field needed to reproduce the current look.
export function snapshotState(s: DesignState): Partial<DesignState> {
  const c = structuredClone(s);
  const { activePreset: _omit, ...rest } = c;
  return rest;
}

export function createPreset(name: string, apply: Partial<DesignState>): StoredPreset {
  const list = loadPresets();
  const now = Date.now();
  const p: StoredPreset = {
    id: crypto.randomUUID(),
    name: name.trim() || `Preset ${list.length + 1}`,
    apply: structuredClone(apply),
    createdAt: now,
    updatedAt: now,
  };
  list.push(p);
  savePresets(list);
  return p;
}

export function updatePreset(
  id: string,
  patch: Partial<Pick<StoredPreset, "name" | "apply">>,
): void {
  const list = loadPresets();
  const p = list.find((x) => x.id === id);
  if (!p) return;
  if (patch.name !== undefined) p.name = patch.name.trim() || p.name;
  if (patch.apply !== undefined) p.apply = structuredClone(patch.apply);
  p.updatedAt = Date.now();
  savePresets(list);
}

export function deletePreset(id: string): void {
  savePresets(loadPresets().filter((x) => x.id !== id));
}

export function restoreDefaults(): StoredPreset[] {
  const list = PRESETS.map((p) => ({
    id: p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    name: p.name,
    apply: p.apply,
    createdAt: 0,
    updatedAt: 0,
  }));
  savePresets(list);
  return list;
}
