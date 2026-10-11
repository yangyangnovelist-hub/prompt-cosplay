import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import type { RoleDocument, UsageEvidence } from "./types.js";

interface SkillreaperRow {
  Category?: string;
  Name?: string;
  Path?: string;
  Uses?: number;
  ErrorCount?: number;
  Verdict?: string;
}

interface SkillreaperPayload {
  Sessions?: number;
  Rows?: SkillreaperRow[];
}

export function loadUsageEvidence(file: string): Map<string, UsageEvidence> {
  const payload = JSON.parse(readFileSync(file, "utf8")) as SkillreaperPayload;
  const sessions = finiteNumber(payload.Sessions);
  const evidence = new Map<string, UsageEvidence>();
  for (const row of payload.Rows ?? []) {
    if (row.Category !== "skill" && row.Category !== "agent") continue;
    const value: UsageEvidence = {
      sessions,
      uses: finiteNumber(row.Uses),
      errors: finiteNumber(row.ErrorCount),
      upstreamVerdict: typeof row.Verdict === "string" ? row.Verdict : undefined,
    };
    for (const key of rowKeys(row)) mergeUsage(evidence, key, value);
  }
  return evidence;
}

export function usageForRole(role: RoleDocument, evidence: Map<string, UsageEvidence>): UsageEvidence | undefined {
  const fileStem = basename(role.path, extname(role.path));
  const keys = [role.name, fileStem];
  for (const key of keys.map(normalizeKey)) {
    const found = evidence.get(key);
    if (found) return found;
  }
  return undefined;
}

function rowKeys(row: SkillreaperRow): string[] {
  const keys: string[] = [];
  if (typeof row.Name === "string") {
    keys.push(row.Name);
    const colon = row.Name.lastIndexOf(":");
    if (colon >= 0) keys.push(row.Name.slice(colon + 1));
  }
  if (typeof row.Path === "string") {
    const file = basename(row.Path);
    keys.push(file === "SKILL.md" ? basename(row.Path.slice(0, -file.length - 1)) : basename(row.Path, extname(row.Path)));
  }
  return keys.map(normalizeKey).filter(Boolean);
}

function mergeUsage(map: Map<string, UsageEvidence>, key: string, next: UsageEvidence): void {
  const current = map.get(key);
  if (!current || next.uses > current.uses || next.errors > current.errors) map.set(key, next);
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\p{L}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}
