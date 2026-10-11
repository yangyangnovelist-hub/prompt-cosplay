#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command, InvalidArgumentError } from "commander";
import { formatReport as formatSkilldoctorReport, runCi } from "skilldoctor";
import { auditTarget, containsSymlink } from "./audit.js";
import { discoverRoles } from "./discover.js";
import { VERSION } from "./package.js";
import { buildPromptfooConfig } from "./promptfoo.js";
import { renderReport } from "./report.js";
import { resolveTarget } from "./target.js";
const program = new Command();
program
    .name("cosplay")
    .description("Find AI agent roles that are mostly costume and make them prove they earn their tokens.")
    .version(VERSION);
program
    .command("audit")
    .description("Score an agent-role or Agent Skills repository by execution evidence, hype, overlap, and observed use")
    .argument("[target]", "local path, GitHub URL, or github:owner/repo", ".")
    .option("--format <format>", "human, json, markdown, or html", parseFormat, "human")
    .option("--output <file>", "write the rendered report to a file")
    .option("--quiet", "suppress stdout when --output is used", false)
    .option("--usage <file>", "merge a `reap --json` SkillReaper report")
    .option("--source-label <label>", "override the source label embedded in the report")
    .option("--top <count>", "maximum roles rendered in human/markdown/html output", parsePositiveInt, 30)
    .option("--fail-under <score>", "exit 1 when average evidence is below this score", parseScore)
    .action((target, opts) => {
    const resolved = resolveTarget(target);
    try {
        const report = auditTarget(resolved.path, {
            sourceLabel: typeof opts.sourceLabel === "string" ? opts.sourceLabel : resolved.source,
            usageFile: typeof opts.usage === "string" ? resolve(opts.usage) : undefined,
        });
        const format = opts.format;
        const rendered = renderReport(report, format, {
            top: Number(opts.top),
            repositoryUrl: "https://github.com/yangyangnovelist-hub/prompt-cosplay",
        });
        if (!opts.quiet)
            process.stdout.write(rendered);
        if (typeof opts.output === "string" && opts.output.trim()) {
            writeFileSync(resolve(opts.output), rendered, "utf8");
        }
        if (report.summary.roles === 0)
            process.exitCode = 2;
        if (typeof opts.failUnder === "number" && report.summary.averageEvidence < opts.failUnder)
            process.exitCode = 1;
    }
    finally {
        resolved.cleanup();
    }
});
program
    .command("skills")
    .description("Run the upstream SkillDoctor lint, security, and compatibility gate")
    .argument("[path]", "skill directory or repository root", ".")
    .option("--format <format>", "human, json, sarif, or markdown", "human")
    .action((path, opts) => {
    if (containsSymlink(path, 8)) {
        throw new Error("Refusing to pass a symlinked tree to SkillDoctor. Audit a self-contained copy instead.");
    }
    const format = opts.format === "json" || opts.format === "sarif" || opts.format === "markdown" ? opts.format : "human";
    const report = runCi(path);
    process.stdout.write(formatSkilldoctorReport(report, {
        format,
        failOn: "error",
        quiet: false,
        ignore: [],
        suppress: [],
    }));
    if (!report.ok)
        process.exitCode = 1;
});
program
    .command("promptfoo")
    .description("Generate a baseline-vs-role promptfoo config for behavioral A/B testing")
    .argument("<role>", "path to one agent or SKILL.md file")
    .requiredOption("--task <task>", "task both baseline and role must complete")
    .requiredOption("--provider <provider>", "promptfoo provider ID")
    .option("--rubric <rubric>", "custom LLM rubric")
    .option("--output <file>", "write JSON config to a file")
    .action((rolePath, opts) => {
    const roles = discoverRoles(rolePath);
    if (roles.length !== 1)
        throw new Error(`Expected exactly one role at ${rolePath}; found ${roles.length}.`);
    const config = buildPromptfooConfig(roles[0], {
        provider: String(opts.provider),
        task: String(opts.task),
        rubric: typeof opts.rubric === "string" ? opts.rubric : undefined,
    });
    const rendered = `${JSON.stringify(config, null, 2)}\n`;
    process.stdout.write(rendered);
    if (typeof opts.output === "string" && opts.output.trim())
        writeFileSync(resolve(opts.output), rendered, "utf8");
});
program.showHelpAfterError();
program.parseAsync().catch((error) => {
    process.stderr.write(`error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
});
function parseFormat(value) {
    if (value === "human" || value === "json" || value === "markdown" || value === "html")
        return value;
    throw new InvalidArgumentError("expected human, json, markdown, or html");
}
function parsePositiveInt(value) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1)
        throw new InvalidArgumentError("expected a positive integer");
    return parsed;
}
function parseScore(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100)
        throw new InvalidArgumentError("expected a score from 0 to 100");
    return parsed;
}
//# sourceMappingURL=cli.js.map