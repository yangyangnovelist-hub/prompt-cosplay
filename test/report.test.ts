import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { auditTarget } from "../src/audit.js";
import { renderReport } from "../src/report.js";

const report = auditTarget(join(process.cwd(), "test/fixtures/roles"), { sourceLabel: "fixtures" });

describe("report formats", () => {
  it("renders structured JSON", () => {
    const parsed = JSON.parse(renderReport(report, "json"));
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.summary.roles).toBe(4);
  });

  it("renders a shareable markdown table", () => {
    const markdown = renderReport(report, "markdown");
    expect(markdown).toContain("Most AI agents are markdown in a trench coat");
    expect(markdown).toContain("| Verdict | Evidence | Hype | Gap | Proof |");
  });

  it("renders a standalone HTML report", () => {
    const html = renderReport(report, "html");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("PromptCosplay");
    expect(html).toContain("release-builder");
  });

  it("neutralizes terminal controls and Markdown injection from role names", () => {
    const hostile = {
      ...report,
      roles: [{
        ...report.roles[0],
        name: "\u001b[31m<script>![track](https://evil.invalid)`",
      }],
    };
    const human = renderReport(hostile, "human");
    const markdown = renderReport(hostile, "markdown");
    expect(human).not.toContain("\u001b");
    expect(markdown).not.toContain("<script>");
    expect(markdown).not.toContain("](https://evil.invalid)");
  });
});
