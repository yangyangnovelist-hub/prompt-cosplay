import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadUsageEvidence, usageForRole } from "../src/usage.js";
import { discoverRoles } from "../src/discover.js";

describe("SkillReaper integration", () => {
  it("matches namespaced usage rows to a local skill", () => {
    const dir = mkdtempSync(join(tmpdir(), "prompt-cosplay-usage-"));
    const file = join(dir, "usage.json");
    writeFileSync(
      file,
      JSON.stringify({
        Sessions: 24,
        Rows: [{ Category: "skill", Name: "demo:release-gate", Uses: 7, ErrorCount: 1, Verdict: "KEEP" }],
      }),
    );
    const evidence = loadUsageEvidence(file);
    const role = discoverRoles(join(process.cwd(), "test/fixtures/roles/skills/release-gate"))[0];
    expect(usageForRole(role, evidence)).toMatchObject({ sessions: 24, uses: 7, errors: 1 });
    rmSync(dir, { recursive: true, force: true });
  });

  it("clamps hostile negative counters to zero", () => {
    const dir = mkdtempSync(join(tmpdir(), "prompt-cosplay-usage-"));
    const file = join(dir, "usage.json");
    writeFileSync(
      file,
      JSON.stringify({
        Sessions: -10,
        Rows: [{ Category: "skill", Name: "release-gate", Uses: -1, ErrorCount: -50 }],
      }),
    );
    expect(loadUsageEvidence(file).get("release-gate")).toMatchObject({ sessions: 0, uses: 0, errors: 0 });
    rmSync(dir, { recursive: true, force: true });
  });
});
