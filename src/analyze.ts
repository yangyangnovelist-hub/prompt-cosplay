import { dirname, resolve } from "node:path";
import type { SkillReport } from "skilldoctor";
import type {
  RoleDocument,
  RoleResult,
  ProofStatus,
  ScoreDimensions,
  UsageEvidence,
  Verdict,
} from "./types.js";
import { usageForRole } from "./usage.js";

const HYPE_PATTERNS = [
  /\bworld[- ]class\b/i,
  /\belite\b/i,
  /\bultimate\b/i,
  /\bcomplete\b/i,
  /\bcomprehensive\b/i,
  /\bproduction[- ]grade\b/i,
  /\bbattle[- ]tested\b/i,
  /\bproven\b/i,
  /\bfully autonomous\b/i,
  /\btransform(?:s|ative|ation)?\b/i,
  /\brevolution(?:ary|ize)?\b/i,
  /\b10x\b/i,
  /\bbest[- ]in[- ]class\b/i,
  /\bexpert\b/i,
  /\bmaster\b/i,
  /世界级|顶级|全能|颠覆|生产级|完整方案|经过验证|专家/i,
];

const DELIVERABLE_PATTERNS = [
  /\bdeliverable(?:s)?\b/i,
  /\boutput(?:s)?\b/i,
  /\breturn(?:s|ed)?\b/i,
  /\bproduce(?:s|d)?\b/i,
  /\bwrite(?:s|ten)?\b/i,
  /\bcreate(?:s|d)?\b/i,
  /\bgenerate(?:s|d)?\b/i,
  /\bartifact(?:s)?\b/i,
  /\breport(?:s)?\b/i,
  /交付物|输出|生成|写入|报告|成品/i,
];

const VERIFY_PATTERNS = [
  /\bacceptance criteria\b/i,
  /\bdone when\b/i,
  /\bverify\b/i,
  /\bvalidate\b/i,
  /\bassert\b/i,
  /\btest(?:s|ed|ing)?\b/i,
  /\bcheck(?:s|ed|ing)?\b/i,
  /\bexpected\b/i,
  /验收|验证|测试|检查|通过标准|预期结果/i,
];

const FAILURE_PATTERNS = [
  /\bif (?:it |that )?fails?\b/i,
  /\bon error\b/i,
  /\bfallback\b/i,
  /\bretr(?:y|ies)\b/i,
  /\babort\b/i,
  /\brollback\b/i,
  /\bunavailable\b/i,
  /\btimeout\b/i,
  /失败|报错|重试|回退|回滚|不可用|超时|中止/i,
];

const TOOL_PATTERNS = [
  /\b(?:bash|shell|python|node|npm|pnpm|yarn|git|gh|curl|docker|pytest|vitest|playwright|mcp)\b/i,
  /\b(?:read|write|edit|search|open|fetch|execute|run) (?:the )?(?:file|command|tool|script|test)/i,
  /工具|命令|脚本|终端|浏览器|文件系统/i,
];

const BOUNDARY_PATTERNS = [
  /\bdo not\b/i,
  /\bnever\b/i,
  /\bonly when\b/i,
  /\bmust not\b/i,
  /\bout of scope\b/i,
  /\bnot for\b/i,
  /禁止|不得|仅当|不要|不适用|范围外/i,
];

const STOP_WORDS = new Set([
  "about", "after", "agent", "agents", "also", "before", "being", "from", "have", "into",
  "must", "only", "role", "should", "that", "their", "then", "these", "this", "through", "using",
  "when", "where", "which", "with", "will", "your", "you", "work", "task", "tasks", "process",
]);

export function analyzeRoles(
  roles: RoleDocument[],
  skillReports: Map<string, SkillReport> = new Map(),
  usageEvidence: Map<string, UsageEvidence> = new Map(),
): RoleResult[] {
  const results = roles.map((role) => analyzeRole(role, skillReports, usageEvidence));
  applySimilarityVerdicts(roles, results);
  return results;
}

function analyzeRole(
  role: RoleDocument,
  skillReports: Map<string, SkillReport>,
  usageEvidence: Map<string, UsageEvidence>,
): RoleResult {
  const text = `${role.description}\n${role.body}`;
  const skillReport = role.kind === "skill" ? skillReports.get(resolve(dirname(role.path))) : undefined;
  const doctor = findingCounts(skillReport);
  const codeBlocks = text.match(/```[\s\S]*?```/g) ?? [];
  const numberedSteps = countMatches(text, /^\s*\d+[.)]\s+/gm);
  const imperativeBullets = countMatches(
    text,
    /^\s*[-*]\s+(?:run|read|write|create|inspect|verify|validate|use|call|open|search|build|test|return|check)\b/gim,
  );
  const workflowHeadings = countMatches(
    text,
    /^#{1,4}\s+.*(?:workflow|process|steps|instructions|method|procedure|implementation|工作流|流程|步骤|方法)/gim,
  );
  const commandLines = codeBlocks.reduce(
    (total, block) => total + countMatches(block, /^\s*(?:\$\s*)?(?:git|gh|npm|pnpm|yarn|node|python|pytest|curl|docker|go|cargo|make)\b/gim),
    0,
  );
  const deliverableHits = countPatternHits(text, DELIVERABLE_PATTERNS);
  const verificationHits = countPatternHits(text, VERIFY_PATTERNS);
  const failureHits = countPatternHits(text, FAILURE_PATTERNS);
  const toolHits = countPatternHits(text, TOOL_PATTERNS);
  const boundaryHits = countPatternHits(text, BOUNDARY_PATTERNS);
  const portabilityRisks = portabilityIssues(text, codeBlocks);

  const dimensions: ScoreDimensions = {
    execution: clamp(numberedSteps * 2 + imperativeBullets * 2 + workflowHeadings * 4 + codeBlocks.length * 2, 0, 25),
    deliverables: clamp(deliverableHits * 3, 0, 15),
    verification: clamp(verificationHits * 4, 0, 15),
    failureHandling: clamp(failureHits * 3, 0, 10),
    toolGrounding: clamp(toolHits * 2 + commandLines, 0, 10),
    boundaries: clamp(boundaryHits * 2, 0, 10),
    portability: clamp(5 - portabilityRisks.length * 2, 0, 5),
    specification: specificationScore(role, doctor.errors, doctor.warnings),
  };

  const staticEvidence = sumDimensions(dimensions);
  const usage = usageForRole(role, usageEvidence);
  const evidence = usageAdjustedEvidence(staticEvidence, usage);
  const proof: ProofStatus = successfulUses(usage) > 0 ? "observed" : role.proofFiles.length > 0 ? "tested" : "unproven";
  const hype = hypeScore(role.description, role.body);
  const gap = hype - evidence;
  const risks = riskLabels(dimensions, gap, portabilityRisks, doctor.errors, doctor.warnings, usage, proof);
  const strengths = strengthLabels(dimensions, usage, proof);

  return {
    name: role.name,
    path: role.relativePath,
    kind: role.kind,
    verdict: verdictFor(evidence, proof, doctor.errors),
    evidence,
    staticEvidence,
    hype,
    gap,
    estimatedTokens: Math.ceil(role.raw.length / 4),
    proof,
    proofFiles: role.proofFiles,
    dimensions,
    strengths,
    risks,
    usage,
    skilldoctor: doctor,
  };
}

function applySimilarityVerdicts(roles: RoleDocument[], results: RoleResult[]): void {
  const tokenSets = roles.map((role) => tokenSet(`${role.description}\n${role.body}`));
  for (let i = 0; i < results.length; i += 1) {
    for (let j = i + 1; j < results.length; j += 1) {
      const similarity = jaccard(tokenSets[i], tokenSets[j]);
      if (similarity < 0.72) continue;
      const loser = results[i].evidence < results[j].evidence ? i : j;
      const winner = loser === i ? j : i;
      if ((results[loser].similarity ?? 0) >= similarity) continue;
      results[loser].verdict = "MERGE";
      results[loser].duplicateOf = results[winner].name;
      results[loser].similarity = round(similarity * 100);
      results[loser].risks = unique([
        `overlaps ${round(similarity * 100)}% with ${results[winner].name}`,
        ...results[loser].risks,
      ]);
    }
  }
}

function findingCounts(report?: SkillReport): { errors: number; warnings: number; info: number } {
  const findings = report?.findings ?? [];
  return {
    errors: findings.filter((finding) => finding.severity === "error").length,
    warnings: findings.filter((finding) => finding.severity === "warning").length,
    info: findings.filter((finding) => finding.severity === "info").length,
  };
}

function specificationScore(role: RoleDocument, errors: number, warnings: number): number {
  if (role.parseError) return 0;
  const hasName = typeof role.frontmatter.name === "string" && role.frontmatter.name.trim().length > 0;
  const hasDescription = typeof role.frontmatter.description === "string" && role.frontmatter.description.trim().length > 0;
  const base = hasName && hasDescription ? 10 : hasName || hasDescription ? 6 : 2;
  return clamp(base - errors * 5 - warnings * 2, 0, 10);
}

function usageAdjustedEvidence(staticEvidence: number, usage?: UsageEvidence): number {
  if (!usage) return staticEvidence;
  const successes = successfulUses(usage);
  if (usage.uses > 0) {
    const boost = successes > 0 ? Math.round(Math.log2(successes + 1) * 3) : 0;
    const errorPenalty = successes === 0 ? 20 : Math.round(Math.min(15, (usage.errors / usage.uses) * 15));
    return clamp(staticEvidence + boost - errorPenalty, 0, 100);
  }
  if (usage.sessions >= 10) return clamp(staticEvidence - 10, 0, 100);
  return staticEvidence;
}

function successfulUses(usage?: UsageEvidence): number {
  return usage ? Math.max(0, usage.uses - usage.errors) : 0;
}

function hypeScore(description: string, body: string): number {
  const claimSurface = `${description}\n${body.slice(0, 1800)}`;
  const claims = countPatternHits(claimSurface, HYPE_PATTERNS);
  const personaMarkers = countPatternHits(claimSurface, [/\byou are\b/i, /\bpersona\b/i, /\bidentity\b/i, /你是|身份|人格/i]);
  const longPitch = description.length > 300 ? 8 : description.length > 160 ? 4 : 0;
  return clamp(claims * 7 + personaMarkers * 4 + longPitch, 0, 100);
}

function portabilityIssues(text: string, codeBlocks: string[]): string[] {
  const issues: string[] = [];
  if (codeBlocks.some((block) => /\$\{[A-Za-z_]\w*\}/.test(block))) {
    issues.push("host-interpolated ${identifier} appears inside a code fence");
  }
  if (/\/(?:Users|home)\/[A-Za-z0-9._-]+\//.test(text) || /[A-Z]:\\Users\\/i.test(text)) {
    issues.push("hard-coded home path");
  }
  if (/~\/\.claude\//.test(text) && !/(?:codex|cursor|opencode|gemini|copilot)/i.test(text)) {
    issues.push("single-host path without an alternate target");
  }
  return issues;
}

function riskLabels(
  dimensions: ScoreDimensions,
  gap: number,
  portability: string[],
  errors: number,
  warnings: number,
  usage?: UsageEvidence,
  proof: ProofStatus = "unproven",
): string[] {
  const risks: string[] = [];
  if (gap >= 25) risks.push(`hype leads evidence by ${gap} points`);
  if (dimensions.execution < 10) risks.push("thin execution contract");
  if (dimensions.verification < 5) risks.push("no credible acceptance gate");
  if (dimensions.failureHandling < 3) risks.push("happy-path only");
  if (dimensions.toolGrounding < 4) risks.push("few concrete tools or commands");
  if (errors > 0) risks.push(`${errors} skill specification error${errors === 1 ? "" : "s"}`);
  if (warnings > 0) risks.push(`${warnings} skilldoctor warning${warnings === 1 ? "" : "s"}`);
  if (usage && usage.uses > 0 && successfulUses(usage) === 0) risks.push(`all ${usage.uses} observed use${usage.uses === 1 ? "" : "s"} failed`);
  if (usage && usage.sessions >= 10 && usage.uses === 0) risks.push(`never fired across ${usage.sessions} observed sessions`);
  if (proof === "unproven" && dimensions.execution >= 15) risks.push("no role-specific eval or observed use");
  risks.push(...portability);
  return unique(risks).slice(0, 5);
}

function strengthLabels(dimensions: ScoreDimensions, usage: UsageEvidence | undefined, proof: ProofStatus): string[] {
  const strengths: string[] = [];
  if (dimensions.execution >= 18) strengths.push("operational workflow");
  if (dimensions.deliverables >= 10) strengths.push("explicit deliverables");
  if (dimensions.verification >= 10) strengths.push("verifiable completion");
  if (dimensions.failureHandling >= 7) strengths.push("failure-aware");
  if (dimensions.toolGrounding >= 7) strengths.push("tool-grounded");
  if (dimensions.boundaries >= 7) strengths.push("clear boundaries");
  const successes = successfulUses(usage);
  if (successes > 0) strengths.push(`${successes} successful observed use${successes === 1 ? "" : "s"}`);
  else if (proof === "tested") strengths.push("role-specific eval present");
  return strengths.slice(0, 5);
}

function verdictFor(evidence: number, proof: ProofStatus, skilldoctorErrors: number): Verdict {
  if (evidence >= 72 && proof !== "unproven" && skilldoctorErrors === 0) return "SHIP";
  if (evidence >= 48) return "PROVE";
  return "BURY";
}

function tokenSet(text: string): Set<string> {
  const tokens = new Set<string>();
  const latin = text.toLowerCase().normalize("NFKD").match(/[a-z0-9][a-z0-9-]{2,}/g) ?? [];
  for (const token of latin) {
    if (!STOP_WORDS.has(token)) tokens.add(token);
    if (tokens.size >= 500) break;
  }
  const cjkRuns = text.match(/[\p{Script=Han}]{2,}/gu) ?? [];
  for (const run of cjkRuns) {
    for (let i = 0; i < run.length - 1 && tokens.size < 500; i += 1) tokens.add(run.slice(i, i + 2));
  }
  return tokens;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  const smaller = a.size < b.size ? a : b;
  const larger = smaller === a ? b : a;
  for (const token of smaller) if (larger.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function countPatternHits(text: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function countMatches(text: string, pattern: RegExp): number {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return [...text.matchAll(new RegExp(pattern.source, flags))].length;
}

function sumDimensions(dimensions: ScoreDimensions): number {
  return Object.values(dimensions).reduce((sum, value) => sum + value, 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
