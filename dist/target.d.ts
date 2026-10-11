export interface ResolvedTarget {
    path: string;
    source: string;
    cleanup: () => void;
}
export declare function resolveTarget(input: string): ResolvedTarget;
//# sourceMappingURL=target.d.ts.map