import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { auditTarget, containsSymlink } from "../src/audit.js";

describe("untrusted repository boundaries", () => {
  it("does not let SkillDoctor follow a symlink out of a skill", () => {
    const outer = mkdtempSync(join(tmpdir(), "prompt-cosplay-link-"));
    const skill = join(outer, "repo", "skills", "linked-skill");
    mkdirSync(join(skill, "references"), { recursive: true });
    writeFileSync(join(outer, "secret.txt"), "not for the audit\n");
    writeFileSync(
      join(skill, "SKILL.md"),
      "---\nname: linked-skill\ndescription: Test a linked skill.\n---\n\n# Linked skill\n\n1. Run the test.\n",
    );
    symlinkSync(join(outer, "secret.txt"), join(skill, "references", "outside.txt"));

    expect(containsSymlink(skill)).toBe(true);
    const result = auditTarget(join(outer, "repo")).roles[0];
    expect(result.skilldoctor.errors).toBe(1);
    expect(result.verdict).not.toBe("SHIP");
    rmSync(outer, { recursive: true, force: true });
  });
});
