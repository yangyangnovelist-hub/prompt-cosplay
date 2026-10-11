export type RoleKind = "skill" | "agent";
export type Verdict = "SHIP" | "PROVE" | "MERGE" | "BURY";
export type ProofStatus = "observed" | "tested" | "unproven";
export type OutputFormat = "human" | "json" | "markdown" | "html";
export interface RoleDocument {
    path: string;
    relativePath: string;
    name: string;
    description: string;
    kind: RoleKind;
    raw: string;
    body: string;
    frontmatter: Record<string, unknown>;
    parseError?: string;
    proofFiles: string[];
}
export interface ScoreDimensions {
    execution: number;
    deliverables: number;
    verification: number;
    failureHandling: number;
    toolGrounding: number;
    boundaries: number;
    portability: number;
    specification: number;
}
export interface UsageEvidence {
    sessions: number;
    uses: number;
    errors: number;
    upstreamVerdict?: string;
}
export interface RoleResult {
    name: string;
    path: string;
    kind: RoleKind;
    verdict: Verdict;
    evidence: number;
    staticEvidence: number;
    hype: number;
    gap: number;
    estimatedTokens: number;
    proof: ProofStatus;
    proofFiles: string[];
    dimensions: ScoreDimensions;
    strengths: string[];
    risks: string[];
    duplicateOf?: string;
    similarity?: number;
    usage?: UsageEvidence;
    skilldoctor: {
        errors: number;
        warnings: number;
        info: number;
    };
}
export interface AuditSummary {
    roles: number;
    skills: number;
    agents: number;
    verdicts: Record<Verdict, number>;
    averageEvidence: number;
    averageHype: number;
    hypeGap: number;
    estimatedTokens: number;
    duplicates: number;
    proven: number;
}
export interface AuditReport {
    schemaVersion: 1;
    generatedAt: string;
    source: string;
    summary: AuditSummary;
    roles: RoleResult[];
    notes: string[];
}
export interface AuditOptions {
    usageFile?: string;
    sourceLabel?: string;
}
export interface RenderOptions {
    top?: number;
    repositoryUrl?: string;
}
//# sourceMappingURL=types.d.ts.map