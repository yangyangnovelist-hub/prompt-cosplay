import { lstatSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { runCi } from "skilldoctor";
import { analyzeRoles } from "./analyze.js";
import { discoverRoles } from "./discover.js";
import { loadUsageEvidence } from "./usage.js";
export function auditTarget(path, options = {}) {
    const roles = discoverRoles(path);
    const skillReports = collectSkilldoctorReports(roles);
    const usage = options.usageFile ? loadUsageEvidence(options.usageFile) : new Map();
    const results = analyzeRoles(roles, skillReports, usage);
    const summary = summarize(results);
    const notes = [
        "Evidence scores are deterministic document-quality heuristics, not a claim that an LLM performed the role successfully.",
        "MERGE means high lexical overlap with a stronger role; PromptCosplay never deletes source files.",
    ];
    if (!options.usageFile)
        notes.push("No SkillReaper usage file was supplied, so observed firing frequency is not included.");
    return {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        source: options.sourceLabel ?? path,
        summary,
        roles: results,
        notes,
    };
}
function collectSkilldoctorReports(roles) {
    const reports = new Map();
    for (const role of roles) {
        if (role.kind !== "skill")
            continue;
        const root = resolve(dirname(role.path));
        if (reports.has(root))
            continue;
        if (containsSymlink(root)) {
            reports.set(root, {
                name: role.name,
                path: root,
                findings: [{
                        rule: "prompt-cosplay/unsafe-symlink",
                        severity: "error",
                        message: "SkillDoctor scan skipped because the skill contains a symlink.",
                        file: "SKILL.md",
                        hint: "Replace symlinks with files contained inside the skill before auditing.",
                    }],
            });
            continue;
        }
        try {
            const report = runCi(root);
            const skill = report.skills.find((candidate) => resolve(candidate.path) === root);
            if (skill)
                reports.set(root, skill);
        }
        catch {
            reports.set(root, {
                name: role.name,
                path: root,
                findings: [{
                        rule: "prompt-cosplay/skilldoctor-failed",
                        severity: "error",
                        message: "SkillDoctor could not safely complete this skill scan.",
                        file: "SKILL.md",
                    }],
            });
        }
    }
    return reports;
}
export function containsSymlink(path, maxDepth = 6) {
    const root = resolve(path);
    try {
        if (lstatSync(root).isSymbolicLink())
            return true;
    }
    catch {
        return false;
    }
    const visit = (dir, depth) => {
        if (depth > maxDepth)
            return false;
        let entries;
        try {
            entries = readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return false;
        }
        for (const entry of entries) {
            if (entry.isSymbolicLink())
                return true;
            if (entry.isDirectory() && visit(resolve(dir, entry.name), depth + 1))
                return true;
        }
        return false;
    };
    return visit(root, 0);
}
function summarize(roles) {
    const verdicts = { SHIP: 0, PROVE: 0, MERGE: 0, BURY: 0 };
    for (const role of roles)
        verdicts[role.verdict] += 1;
    const averageEvidence = average(roles.map((role) => role.evidence));
    const averageHype = average(roles.map((role) => role.hype));
    return {
        roles: roles.length,
        skills: roles.filter((role) => role.kind === "skill").length,
        agents: roles.filter((role) => role.kind === "agent").length,
        verdicts,
        averageEvidence,
        averageHype,
        hypeGap: averageHype - averageEvidence,
        estimatedTokens: roles.reduce((sum, role) => sum + role.estimatedTokens, 0),
        duplicates: verdicts.MERGE,
        proven: roles.filter((role) => role.proof !== "unproven").length,
    };
}
function average(values) {
    if (values.length === 0)
        return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
//# sourceMappingURL=audit.js.map