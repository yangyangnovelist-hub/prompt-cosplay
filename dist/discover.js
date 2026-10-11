import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { parseSkillMd } from "skilldoctor";
const IGNORE_DIRS = new Set([
    ".git",
    ".github",
    ".next",
    ".turbo",
    "coverage",
    "dist",
    "docs",
    "examples",
    "fixtures",
    "node_modules",
    "test",
    "tests",
    "vendor",
]);
const IGNORE_FILES = new Set([
    "README.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "CODE_OF_CONDUCT.md",
    "SECURITY.md",
    "LICENSE.md",
]);
const ROLE_DIRS = new Set([
    "agent",
    "agents",
    "personas",
    "roles",
    "skill",
    "skills",
    "subagents",
]);
const MAX_FILE_BYTES = 1024 * 1024;
const PROOF_EXTENSIONS = new Set([
    ".bash", ".cjs", ".go", ".js", ".json", ".jsonl", ".md", ".mjs", ".ps1", ".py",
    ".rb", ".rs", ".sh", ".ts", ".tsx", ".txt", ".yaml", ".yml", ".zsh",
]);
export function discoverRoles(inputPath, maxDepth = 10) {
    const target = resolve(inputPath);
    const root = statSync(target).isDirectory() ? target : dirname(target);
    const files = statSync(target).isFile() ? [target] : walk(target, maxDepth);
    const roles = [];
    for (const file of files) {
        if (extname(file).toLowerCase() !== ".md")
            continue;
        if (IGNORE_FILES.has(basename(file)) && basename(file) !== "SKILL.md")
            continue;
        const stat = statSync(file);
        if (stat.size > MAX_FILE_BYTES)
            continue;
        const raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
        const parsed = parseSkillMd(raw, file);
        const kind = basename(file) === "SKILL.md" ? "skill" : "agent";
        if (!isRoleCandidate(file, parsed.frontmatter, parsed.body, kind))
            continue;
        const frontmatterName = stringValue(parsed.frontmatter.name);
        const description = stringValue(parsed.frontmatter.description) ?? firstUsefulParagraph(parsed.body);
        roles.push({
            path: file,
            relativePath: relative(root, file).split(sep).join("/"),
            name: frontmatterName ?? roleNameFromPath(file),
            description,
            kind,
            raw,
            body: parsed.body,
            frontmatter: parsed.frontmatter,
            parseError: parsed.parseError,
            proofFiles: [],
        });
    }
    const proofCandidates = statSync(root).isDirectory() ? walkProofFiles(root, maxDepth) : [];
    for (const role of roles)
        role.proofFiles = findProofFiles(role, root, proofCandidates);
    return roles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
function walk(root, maxDepth) {
    const files = [];
    const visit = (dir, depth) => {
        if (depth > maxDepth)
            return;
        for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            if (entry.isSymbolicLink())
                continue;
            const path = resolve(dir, entry.name);
            if (entry.isDirectory()) {
                if (!IGNORE_DIRS.has(entry.name))
                    visit(path, depth + 1);
            }
            else if (entry.isFile()) {
                files.push(path);
            }
        }
    };
    visit(root, 0);
    return files;
}
function walkProofFiles(root, maxDepth) {
    const files = [];
    const hardIgnore = new Set([".git", "dist", "node_modules", "vendor"]);
    const visit = (dir, depth) => {
        if (depth > maxDepth)
            return;
        for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            if (entry.isSymbolicLink())
                continue;
            const path = resolve(dir, entry.name);
            if (entry.isDirectory()) {
                if (!hardIgnore.has(entry.name))
                    visit(path, depth + 1);
            }
            else if (entry.isFile())
                files.push(path);
        }
    };
    visit(root, 0);
    return files;
}
function findProofFiles(role, root, candidates) {
    const matches = new Set();
    for (const ref of explicitProofRefs(role.frontmatter)) {
        const path = resolve(dirname(role.path), ref);
        if (isContainedRegularProofFile(path, root))
            matches.add(relative(root, path).split(sep).join("/"));
    }
    const pathName = role.kind === "skill" ? basename(dirname(role.path)) : basename(role.path, extname(role.path));
    const roleKeys = [role.name, pathName].map(normalizeName).filter(Boolean);
    for (const candidate of candidates) {
        if (candidate === role.path || !isProofPath(candidate))
            continue;
        if (roleKeys.some((key) => key.length >= 5 && proofPathMatchesRole(candidate, root, key))) {
            matches.add(relative(root, candidate).split(sep).join("/"));
        }
    }
    return [...matches].sort();
}
function isContainedRegularProofFile(path, root) {
    if (!existsSync(path) || !PROOF_EXTENSIONS.has(extname(path).toLowerCase()))
        return false;
    try {
        const stat = lstatSync(path);
        if (!stat.isFile() || stat.isSymbolicLink())
            return false;
        const rootReal = realpathSync(root);
        const fileReal = realpathSync(path);
        const rel = relative(rootReal, fileReal);
        return rel.length > 0 && !rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel);
    }
    catch {
        return false;
    }
}
function proofPathMatchesRole(path, root, roleKey) {
    const components = relative(root, path).split(sep).map(normalizeName).filter(Boolean);
    return components.some((component) => component === roleKey || component.startsWith(`${roleKey}-`) || component.endsWith(`-${roleKey}`));
}
function explicitProofRefs(frontmatter) {
    const refs = [];
    for (const key of ["eval", "evals", "evidence", "test", "tests"]) {
        const value = frontmatter[key];
        if (typeof value === "string")
            refs.push(value);
        if (Array.isArray(value))
            refs.push(...value.filter((item) => typeof item === "string"));
    }
    return refs;
}
function isProofPath(path) {
    const lower = path.toLowerCase().split(sep);
    const inProofDir = lower.some((part) => ["benchmark", "benchmarks", "eval", "evals", "test", "tests"].includes(part));
    const proofName = /(?:^|[._-])(?:benchmark|eval|spec|test)(?:[._-]|$)/i.test(basename(path));
    return inProofDir || proofName;
}
function normalizeName(value) {
    return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\p{L}]+/gu, "-").replace(/^-|-$/g, "");
}
function isRoleCandidate(file, frontmatter, body, kind) {
    if (kind === "skill")
        return true;
    const segments = file.split(sep).map((part) => part.toLowerCase());
    const roleDirectory = segments.some((part) => ROLE_DIRS.has(part));
    const hasIdentity = /\b(you are|your role|role:|mission|responsibilities)\b/i.test(body);
    const namedFrontmatter = stringValue(frontmatter.name) !== undefined;
    const describedFrontmatter = stringValue(frontmatter.description) !== undefined;
    return (namedFrontmatter && describedFrontmatter) || (roleDirectory && hasIdentity);
}
function stringValue(value) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function roleNameFromPath(file) {
    const name = basename(file, extname(file));
    return name === "SKILL" ? basename(dirname(file)) : name;
}
function firstUsefulParagraph(body) {
    return (body
        .split(/\n\s*\n/)
        .map((part) => part.replace(/^#+\s+.*$/gm, "").trim())
        .find((part) => part.length > 24) ?? "").slice(0, 500);
}
//# sourceMappingURL=discover.js.map