import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
const GITHUB_SHORTHAND = /^github:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/;
const GITHUB_URL = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/;
export function resolveTarget(input) {
    const shorthand = input.match(GITHUB_SHORTHAND);
    const urlMatch = input.match(GITHUB_URL);
    if (shorthand || urlMatch) {
        const match = shorthand ?? urlMatch;
        if (!match)
            throw new Error("Invalid GitHub target.");
        const owner = match[1];
        const repo = match[2];
        const source = `https://github.com/${owner}/${repo}`;
        const root = mkdtempSync(join(tmpdir(), "prompt-cosplay-"));
        const destination = join(root, repo);
        const clone = spawnSync("git", ["clone", "--depth", "1", "--quiet", `${source}.git`, destination], {
            encoding: "utf8",
            timeout: 120_000,
        });
        if (clone.status !== 0) {
            rmSync(root, { recursive: true, force: true });
            const detail = clone.stderr.trim() || clone.error?.message || "git clone failed";
            throw new Error(`Could not clone ${source}: ${detail}`);
        }
        return {
            path: destination,
            source,
            cleanup: () => rmSync(root, { recursive: true, force: true }),
        };
    }
    const local = resolve(input);
    if (!existsSync(local))
        throw new Error(`Target does not exist: ${local}`);
    return {
        path: local,
        source: basename(local) || local,
        cleanup: () => undefined,
    };
}
//# sourceMappingURL=target.js.map