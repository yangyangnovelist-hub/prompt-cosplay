import type { RoleDocument, UsageEvidence } from "./types.js";
export declare function loadUsageEvidence(file: string): Map<string, UsageEvidence>;
export declare function usageForRole(role: RoleDocument, evidence: Map<string, UsageEvidence>): UsageEvidence | undefined;
//# sourceMappingURL=usage.d.ts.map