import { z } from "zod";
import type { Snapshot } from "./domain";
import { exportBackup, parseBackup } from "./persistence";

export const healthKey = "personal-operations.backup-health.v1";
export const healthEvent = "personal-operations-backup-health";
const HealthSchema = z.object({
  reminders: z.boolean().default(false),
  dismissedUntil: z.number().finite().nonnegative().default(0),
  exportRequestedAt: z.string().datetime().optional(),
  verified: z.object({
    at: z.string().datetime(), revision: z.number().int().nonnegative(),
    version: z.literal(1), sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }).optional(),
});
export type BackupHealth = z.infer<typeof HealthSchema>;
export function readHealth(): BackupHealth {
  try { return HealthSchema.parse(JSON.parse(localStorage.getItem(healthKey) ?? "{}")); }
  catch { return HealthSchema.parse({}); }
}
export function saveHealth(health: BackupHealth) {
  // Operational metadata is separate from application revisions and backups.
  localStorage.setItem(healthKey, JSON.stringify(HealthSchema.parse(health)));
  window.dispatchEvent(new Event(healthEvent));
}
export async function snapshotHash(state: Snapshot): Promise<string> {
  const normalized = parseBackup(exportBackup(state));
  for (const name of ["tasks", "plans", "workdays", "budgets", "templates", "rewards", "shop", "archives"] as const)
    normalized[name].sort((a, b) => a.id.localeCompare(b.id));
  const bytes = new TextEncoder().encode(exportBackup(normalized));
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), v => v.toString(16).padStart(2, "0")).join("");
}
export async function verifySavedBackup(text: string, current: Snapshot) {
  const backup = parseBackup(text);
  const sha256 = await snapshotHash(backup);
  if (sha256 !== await snapshotHash(current))
    throw new Error("This file does not represent the current revision and data. Export current data, then select the saved file.");
  return {at: new Date().toISOString(), revision: backup.revision, version: backup.version, sha256};
}
export function healthLabel(health: BackupHealth, revision: number, hash: string, now = Date.now()) {
  if (!health.verified) return "No known backup";
  if (health.verified.revision !== revision || health.verified.sha256 !== hash) return "Changed since backup";
  if (now - Date.parse(health.verified.at) > 7 * 86400000) return "Backup recommended";
  return "Backed up — saved file verified";
}
