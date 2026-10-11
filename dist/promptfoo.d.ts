import type { RoleDocument } from "./types.js";
export interface PromptfooOptions {
    provider: string;
    task: string;
    rubric?: string;
}
export declare function buildPromptfooConfig(role: RoleDocument, options: PromptfooOptions): Record<string, unknown>;
//# sourceMappingURL=promptfoo.d.ts.map