import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SkillReport } from "skilldoctor";
import { analyzeRoles } from "../src/analyze.js";
import { discoverRoles } from "../src/discover.js";

const fixtures = join(process.cwd(), "test/fixtures/roles");

describe("evidence analysis", () => {
  it("separates an execution contract from persona-only hype", () => {
    const results = analyzeRoles(discoverRoles(fixtures));
    const builder = results.find((role) => role.name === "release-builder");
    const guru = results.find((role) => role.name === "visionary-growth-guru");
    expect(builder?.verdict).toBe("SHIP");
    expect(builder?.proof).toBe("tested");
    expect(builder?.evidence).toBeGreaterThanOrEqual(72);
    expect(guru?.evidence).toBeLessThan(48);
    expect(guru?.hype).toBeGreaterThan(guru?.evidence ?? 100);
  });

  it("marks a near-copy for merging", () => {
    const results = analyzeRoles(discoverRoles(fixtures));
    const merged = results.filter((role) => role.verdict === "MERGE");
    expect(merged).toHaveLength(1);
    expect(merged[0].similarity).toBeGreaterThanOrEqual(90);
    expect(merged[0].duplicateOf).toBeTruthy();
  });

  it("never ships a skill with SkillDoctor errors", () => {
    const roles = discoverRoles(fixtures);
    const gate = roles.find((role) => role.name === "release-gate");
    expect(gate).toBeTruthy();
    const reports = new Map<string, SkillReport>([[
      join(fixtures, "skills", "release-gate"),
      {
        name: "release-gate",
        path: join(fixtures, "skills", "release-gate"),
        findings: [{ rule: "audit/example", severity: "error", message: "unsafe" }],
      },
    ]]);
    const usage = new Map([["release-gate", { sessions: 3, uses: 3, errors: 0 }]]);
    const result = analyzeRoles(roles, reports, usage).find((role) => role.name === "release-gate");
    expect(result?.proof).toBe("observed");
    expect(result?.verdict).not.toBe("SHIP");
  });

  it("does not treat failed invocations as proof", () => {
    const usage = new Map([["release-gate", { sessions: 4, uses: 4, errors: 4 }]]);
    const result = analyzeRoles(discoverRoles(fixtures), new Map(), usage).find((role) => role.name === "release-gate");
    expect(result?.proof).toBe("unproven");
    expect(result?.verdict).not.toBe("SHIP");
    expect(result?.risks).toContain("all 4 observed uses failed");
  });
});
