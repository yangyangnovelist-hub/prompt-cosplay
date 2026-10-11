import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { discoverRoles } from "../src/discover.js";

const fixtures = join(process.cwd(), "test/fixtures/roles");

describe("role discovery", () => {
  it("finds skills and generic agent markdown without treating README as a role", () => {
    const roles = discoverRoles(fixtures);
    expect(roles.map((role) => role.name)).toEqual([
      "release-builder",
      "visionary-growth-ninja",
      "visionary-growth-guru",
      "release-gate",
    ]);
    expect(roles.find((role) => role.name === "release-gate")?.kind).toBe("skill");
    expect(roles.some((role) => role.name === "fixture-readme")).toBe(false);
  });

  it("accepts only contained regular proof files and matches them to a specific role", () => {
    const outer = mkdtempSync(join(tmpdir(), "prompt-cosplay-proof-"));
    const root = join(outer, "repo");
    mkdirSync(join(root, "agents"), { recursive: true });
    mkdirSync(join(root, "evidence"), { recursive: true });
    mkdirSync(join(root, "tests"), { recursive: true });
    mkdirSync(join(root, "skills", "release-gate"), { recursive: true });
    writeFileSync(join(outer, "outside.json"), "{}\n");
    writeFileSync(join(root, "evidence", "proof.json"), "{}\n");
    writeFileSync(join(root, "tests", "skills-overview.test.ts"), "export {};\n");
    writeFileSync(
      join(root, "agents", "boundary-role.md"),
      "---\nname: boundary-role\ndescription: Validate proof boundaries.\nevals:\n  - .\n  - ../../outside.json\n  - ../evidence/proof.json\n---\n\nYou are a test role.\n",
    );
    writeFileSync(
      join(root, "skills", "release-gate", "SKILL.md"),
      "---\nname: release-gate\ndescription: Gate releases.\n---\n\n# Release gate\n\n1. Test the build.\n",
    );

    const roles = discoverRoles(root);
    expect(roles.find((role) => role.name === "boundary-role")?.proofFiles).toEqual(["evidence/proof.json"]);
    expect(roles.find((role) => role.name === "release-gate")?.proofFiles).toEqual([]);
    rmSync(outer, { recursive: true, force: true });
  });
});
