import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { discoverRoles } from "../src/discover.js";
import { buildPromptfooConfig } from "../src/promptfoo.js";

describe("promptfoo bridge", () => {
  it("builds baseline and role prompts for the same task", () => {
    const role = discoverRoles(join(process.cwd(), "test/fixtures/roles/builder.md"))[0];
    const config = buildPromptfooConfig(role, {
      provider: "openai:example-model",
      task: "Prepare a release candidate.",
    }) as { prompts: Array<{ label: string }>; tests: unknown[] };
    expect(config.prompts.map((prompt) => prompt.label)).toEqual(["baseline", "release-builder"]);
    expect(config.tests).toHaveLength(1);
  });
});
