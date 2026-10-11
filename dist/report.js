const VERDICT_ORDER = { BURY: 0, MERGE: 1, PROVE: 2, SHIP: 3 };
export function renderReport(report, format, options = {}) {
    if (format === "json")
        return `${JSON.stringify(report, null, 2)}\n`;
    if (format === "markdown")
        return renderMarkdown(report, options);
    if (format === "html")
        return renderHtml(report, options);
    return renderHuman(report, options);
}
function renderHuman(report, options) {
    const { summary } = report;
    const roles = rankedRoles(report.roles).slice(0, options.top ?? 30);
    const lines = [
        "PROMPT / COSPLAY",
        "Most AI agents are markdown in a trench coat.",
        "",
        `${summary.roles} roles · ${summary.verdicts.SHIP} SHIP · ${summary.verdicts.PROVE} PROVE · ${summary.verdicts.MERGE} MERGE · ${summary.verdicts.BURY} BURY`,
        `HYPE ${summary.averageHype}/100 · EVIDENCE ${summary.averageEvidence}/100 · GAP ${signed(summary.hypeGap)} · ~${summary.estimatedTokens.toLocaleString()} catalog tokens`,
        `PROOF ${summary.proven}/${summary.roles} roles have observed use or role-specific evals`,
        "",
        `${"VERDICT".padEnd(8)} ${"EVD".padStart(3)} ${"HYP".padStart(3)} ${"GAP".padStart(4)} ${"PROOF".padEnd(8)} ROLE`,
        `${"─".repeat(8)} ${"─".repeat(3)} ${"─".repeat(3)} ${"─".repeat(4)} ${"─".repeat(8)} ${"─".repeat(34)}`,
    ];
    for (const role of roles) {
        lines.push(`${role.verdict.padEnd(8)} ${String(role.evidence).padStart(3)} ${String(role.hype).padStart(3)} ${signed(role.gap).padStart(4)} ${role.proof.padEnd(8)} ${truncate(stripTerminalControls(role.name), 34)}`);
        const reason = role.risks[0] ?? role.strengths[0];
        if (reason)
            lines.push(`${"".padEnd(24)}  ↳ ${truncate(stripTerminalControls(reason), 70)}`);
    }
    if (report.roles.length > roles.length)
        lines.push("", `${report.roles.length - roles.length} more roles omitted; use --format json for all.`);
    lines.push("", ...report.notes.map((note) => `note: ${note}`), "");
    return lines.join("\n");
}
function renderMarkdown(report, options) {
    const { summary } = report;
    const roles = rankedRoles(report.roles).slice(0, options.top ?? report.roles.length);
    const lines = [
        "# PromptCosplay audit",
        "",
        "> Most AI agents are markdown in a trench coat.",
        "",
        `**${summary.roles} roles** · ${summary.verdicts.SHIP} SHIP · ${summary.verdicts.PROVE} PROVE · ${summary.verdicts.MERGE} MERGE · ${summary.verdicts.BURY} BURY`,
        "",
        `Hype **${summary.averageHype}/100** · Evidence **${summary.averageEvidence}/100** · Gap **${signed(summary.hypeGap)}** · Proof **${summary.proven}/${summary.roles}** · Aggregate role text **~${summary.estimatedTokens.toLocaleString()} tokens**`,
        "",
        "| Verdict | Evidence | Hype | Gap | Proof | Role | Main signal |",
        "| --- | ---: | ---: | ---: | --- | --- | --- |",
    ];
    for (const role of roles) {
        const signal = role.risks[0] ?? role.strengths[0] ?? "-";
        lines.push(`| ${role.verdict} | ${role.evidence} | ${role.hype} | ${signed(role.gap)} | ${role.proof} | ${escapeMd(role.name)} | ${escapeMd(signal)} |`);
    }
    lines.push("", "## Method", "", ...report.notes.map((note) => `- ${note}`), "");
    return lines.join("\n");
}
function renderHtml(report, options) {
    const { summary } = report;
    const roles = rankedRoles(report.roles).slice(0, options.top ?? report.roles.length);
    const repo = options.repositoryUrl ?? "https://github.com/yangyangnovelist-hub/prompt-cosplay";
    const rows = roles
        .map((role) => {
        const signal = role.risks[0] ?? role.strengths[0] ?? "No dominant signal";
        return `<tr><td><span class="tag ${role.verdict.toLowerCase()}">${role.verdict}</span></td><td class="num">${role.evidence}</td><td class="num">${role.hype}</td><td class="num ${role.gap > 20 ? "hot" : ""}">${signed(role.gap)}</td><td>${role.proof}</td><td><strong>${escapeHtml(role.name)}</strong><small>${escapeHtml(role.path)}</small></td><td>${escapeHtml(signal)}</td></tr>`;
    })
        .join("\n");
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PromptCosplay audit — ${escapeHtml(report.source)}</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%2317140f'/%3E%3Cpath d='M9 10h28c12 0 19 7 19 18S49 46 37 46H25v9H9V10zm16 13v11h10c4 0 6-2 6-6s-2-5-6-5H25z' fill='%23d7ff3f'/%3E%3C/svg%3E">
<style>
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Mono:wght@400;600&display=swap');
:root{--paper:#f3ead7;--ink:#17140f;--red:#ee3e26;--acid:#d7ff3f;--muted:#6f6758}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:'IBM Plex Mono',monospace;background-image:linear-gradient(rgba(23,20,15,.045) 1px,transparent 1px);background-size:100% 28px}.wrap{max-width:1180px;margin:auto;padding:54px 24px 80px}.kicker{display:inline-block;background:var(--ink);color:var(--paper);padding:7px 11px;letter-spacing:.18em;text-transform:uppercase;font-size:12px}.hero{display:grid;grid-template-columns:1.4fr .6fr;gap:48px;align-items:end;border-bottom:8px solid var(--ink);padding:44px 0 34px}h1{font-family:'Archivo Black',sans-serif;font-size:clamp(54px,10vw,132px);line-height:.78;letter-spacing:-.07em;text-transform:uppercase;margin:0}h1 span{color:var(--red)}.thesis{font-size:17px;line-height:1.55;margin:0 0 8px}.stats{display:grid;grid-template-columns:repeat(4,1fr);border:3px solid var(--ink);margin:28px 0;background:var(--ink);gap:3px}.stat{background:var(--paper);padding:20px}.stat b{display:block;font-family:'Archivo Black';font-size:38px;line-height:1}.stat span{font-size:11px;text-transform:uppercase;letter-spacing:.11em;color:var(--muted)}.gap{background:var(--acid)!important}.section-title{display:flex;justify-content:space-between;align-items:end;margin:42px 0 14px}.section-title h2{font-family:'Archivo Black';font-size:32px;text-transform:uppercase;margin:0}.section-title p{margin:0;color:var(--muted);font-size:12px}table{width:100%;border-collapse:collapse;background:rgba(243,234,215,.94)}th{text-align:left;text-transform:uppercase;letter-spacing:.1em;font-size:11px;border-bottom:3px solid var(--ink);padding:12px 10px}td{border-bottom:1px solid rgba(23,20,15,.25);padding:14px 10px;font-size:13px;vertical-align:top}td small{display:block;color:var(--muted);margin-top:4px}.num{text-align:right;font-weight:600}.hot{color:var(--red)}.tag{display:inline-block;padding:4px 7px;border:2px solid var(--ink);font-weight:600;font-size:11px}.ship{background:var(--acid)}.bury{background:var(--red);color:white}.merge{background:#ffc84b}.prove{background:white}.foot{display:flex;justify-content:space-between;gap:28px;margin-top:44px;padding-top:18px;border-top:3px solid var(--ink);font-size:12px;line-height:1.6}.foot a{color:inherit;font-weight:600}.hazard{height:12px;margin-top:44px;background:repeating-linear-gradient(135deg,var(--ink) 0 12px,var(--acid) 12px 24px)}@media(max-width:760px){.hero{grid-template-columns:1fr}.stats{grid-template-columns:1fr 1fr}.table-wrap{overflow:auto}.foot{display:block}h1{font-size:58px}}
</style></head><body><main class="wrap"><span class="kicker">Repository reality check</span><section class="hero"><h1>Prompt<br><span>Cosplay</span></h1><p class="thesis">Most AI agents are markdown in a trench coat.<br><br>This report separates a well-written role from a role that has actually been tested or observed doing work.</p></section><section class="stats"><div class="stat"><b>${summary.roles}</b><span>roles scanned</span></div><div class="stat"><b>${summary.proven}</b><span>roles with proof</span></div><div class="stat"><b>${summary.averageEvidence}</b><span>contract / 100</span></div><div class="stat gap"><b>~${Math.round(summary.estimatedTokens / 1000)}k</b><span>catalog text tokens</span></div></section><div class="section-title"><h2>The casting call</h2><p>${summary.verdicts.SHIP} ship · ${summary.verdicts.PROVE} prove · ${summary.verdicts.MERGE} merge · ${summary.verdicts.BURY} bury</p></div><div class="table-wrap"><table><thead><tr><th>Verdict</th><th>Evidence</th><th>Hype</th><th>Gap</th><th>Proof</th><th>Role</th><th>Signal</th></tr></thead><tbody>${rows}</tbody></table></div><div class="hazard"></div><footer class="foot"><div>${report.notes.map(escapeHtml).join("<br>")}</div><div>Generated by <a href="${escapeHtml(repo)}">PromptCosplay</a><br>${escapeHtml(report.generatedAt)}</div></footer></main></body></html>\n`;
}
function rankedRoles(roles) {
    return [...roles].sort((a, b) => {
        const verdict = VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict];
        if (verdict !== 0)
            return verdict;
        if (a.gap !== b.gap)
            return b.gap - a.gap;
        return a.name.localeCompare(b.name);
    });
}
function signed(value) {
    return value > 0 ? `+${value}` : String(value);
}
function truncate(value, length) {
    return value.length <= length ? value : `${value.slice(0, length - 1)}…`;
}
function escapeMd(value) {
    return stripTerminalControls(value)
        .replace(/[\r\n]+/g, " ")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/([\\`*_[\]{}()#+.!|-])/g, "\\$1");
}
function stripTerminalControls(value) {
    return value
        .replace(/\u001B(?:[@-_]|\[[0-?]*[ -/]*[@-~])/g, "")
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
}
function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
}
//# sourceMappingURL=report.js.map