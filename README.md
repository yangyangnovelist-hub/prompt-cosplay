<p align="center"><strong>PROMPT / COSPLAY</strong></p>

<h1 align="center">Most AI agents are markdown in a trench coat.</h1>

<p align="center">
  The open-source reality check for agent roles and Agent Skills.<br>
  Separate a polished persona from an execution contract—and an execution contract from proof.
</p>

<p align="center">
  <a href="https://github.com/yangyangnovelist-hub/prompt-cosplay/actions/workflows/ci.yml"><img src="https://github.com/yangyangnovelist-hub/prompt-cosplay/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/yangyangnovelist-hub/prompt-cosplay/releases"><img src="https://img.shields.io/github/v/release/yangyangnovelist-hub/prompt-cosplay?display_name=tag" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-17140f" alt="MIT license"></a>
</p>

```bash
npx --yes github:yangyangnovelist-hub/prompt-cosplay audit github:msitarzewski/agency-agents
```

PromptCosplay scans `SKILL.md` files and agent-role Markdown, scores the operational contract, looks for role-specific evals, merges real-use evidence from [SkillReaper](https://github.com/thousandflowers/skillreaper), and emits a verdict:

| Verdict | Meaning |
| --- | --- |
| **SHIP** | Strong execution contract **and** a role-specific eval or successful observed use, with no SkillDoctor errors |
| **PROVE** | Potentially useful, but the capability is still a claim |
| **MERGE** | High overlap with a stronger role |
| **BURY** | Too little operational substance to justify the prompt surface |

It never deletes anything.

## The first public autopsy

On `msitarzewski/agency-agents@f99f6aa`, PromptCosplay detected **283 role-shaped files**:

```text
283 roles · 0 SHIP · 253 PROVE · 0 MERGE · 30 BURY
HYPE 18/100 · EVIDENCE 62/100 · ~1,010,348 catalog tokens
PROOF 0/283 roles have observed use or role-specific evals
```

That result is more interesting than “the prompts are bad.” They are not: the average operational-contract score is 62/100. The missing layer is proof. A detailed persona can still be an untested hypothesis.

[Open the visual report](https://yangyangnovelist-hub.github.io/prompt-cosplay/agency-agents-audit.html) · [Read the Markdown report](docs/agency-agents-audit.md) · [Inspect every score](docs/agency-agents-audit.json)

The sample is pinned to the commit shown above. Scores are deterministic document heuristics; they are not claims about model intelligence or the maintainers’ intent.

## Three kinds of evidence

PromptCosplay refuses to collapse all quality into one magical number.

1. **Contract** — Does the role name concrete steps, outputs, tools, boundaries, failure handling, and acceptance gates?
2. **Proof** — Is there a role-specific eval, benchmark, or successful observed invocation?
3. **Use** — Did the role actually fire in real sessions, and did it error?

This distinction is the whole product. A role may be beautifully specified and still receive `PROVE`, because “well written” and “works” are different claims.

## Use it

Audit a local repository:

```bash
npx --yes github:yangyangnovelist-hub/prompt-cosplay audit .
```

Audit any public GitHub repository without cloning it yourself:

```bash
npx --yes github:yangyangnovelist-hub/prompt-cosplay audit github:owner/repo
```

Generate a standalone report:

```bash
cosplay audit . --format html --output cosplay-report.html --quiet
cosplay audit . --format markdown --output cosplay-report.md --quiet
cosplay audit . --format json --output cosplay-report.json --quiet
```

Turn it into a CI gate:

```bash
cosplay audit . --fail-under 55
```

### Add real-use evidence

[SkillReaper](https://github.com/thousandflowers/skillreaper) already does the hard work of deriving usage from local agent transcripts. PromptCosplay consumes its JSON instead of inventing another transcript parser:

```bash
reap --json > usage.json
cosplay audit ~/.codex/skills --usage usage.json
```

A successful observed invocation can promote an otherwise unproven role; failed invocations and repeated zero-use sessions become negative evidence.

### Run the underlying SkillDoctor gate

PromptCosplay uses [SkillDoctor](https://github.com/xyiqq/skilldoctor) for Agent Skills conformance, security checks, and cross-agent compatibility:

```bash
cosplay skills ./my-skill
```

### Make a role fight the baseline

PromptCosplay does not build another model runner. It emits an A/B config for [promptfoo](https://github.com/promptfoo/promptfoo):

```bash
cosplay promptfoo ./agents/release-manager.md \
  --task "Prepare this repository for release" \
  --provider your-provider-id \
  --output promptfooconfig.json

npx promptfoo eval -c promptfooconfig.json
```

The generated test gives the same task to a direct baseline and to the role. If the costume does not improve the outcome, it did not earn its tokens.

## What gets measured

The 100-point contract score is intentionally legible:

| Dimension | Points |
| --- | ---: |
| Executable workflow | 25 |
| Explicit deliverables | 15 |
| Verification and acceptance | 15 |
| Failure handling | 10 |
| Tool grounding | 10 |
| Boundaries | 10 |
| Specification health | 10 |
| Portability | 5 |

Separately, PromptCosplay detects persona-heavy claims, host-specific hazards, SkillDoctor findings, real-use evidence, and high lexical overlap. JSON output contains the complete breakdown for every role.

## What counts as proof

PromptCosplay detects:

- adjacent `*.eval.*`, `*.test.*`, `*.spec.*`, or `*.benchmark.*` files;
- matching files under `evals/`, `benchmarks/`, or `tests/`;
- contained regular files referenced by `eval`, `evals`, `test`, `tests`, or `evidence` frontmatter;
- successful observed calls imported from a SkillReaper JSON report.

A generic repository CI test does not prove every persona. Proof must resolve to the role.

## Supported role shapes

- Agent Skills (`SKILL.md`)
- Markdown agents with YAML `name` + `description`
- role files under `agents/`, `roles/`, `personas/`, `skills/`, or `subagents/`
- public GitHub repositories via `github:owner/repo` or an HTTPS GitHub URL

The scanner skips generated output, dependencies, docs, fixtures, and symlinks by default. SkillDoctor scans are isolated per skill and blocked when a skill tree contains a symlink.

## Limitations

- Static contract scores tell you whether instructions are operational, not whether a model follows them.
- Lexical overlap catches near-duplicates, not conceptual substitutes.
- A missing eval means “no role-specific proof detected,” not “the role can never work.”
- Aggregate catalog-token estimates are based on source characters and are not per-session billing estimates.
- Private repositories should be cloned locally and audited by path.

These caveats are part of the output because a quality gate that overstates its own evidence would be prompt cosplay too.

## Development

```bash
npm install
npm run ci
node dist/cli.js audit test/fixtures/roles
```

Node.js 20 or newer. See [CONTRIBUTING.md](CONTRIBUTING.md) for detector and evidence-adapter contributions.

## Built on the ecosystem

PromptCosplay deliberately reuses existing work:

- [SkillDoctor](https://github.com/xyiqq/skilldoctor) for Agent Skills lint, security, and compatibility
- [SkillReaper](https://github.com/thousandflowers/skillreaper) for transcript-derived usage evidence
- [promptfoo](https://github.com/promptfoo/promptfoo) for behavioral A/B execution

See [THIRD_PARTY.md](THIRD_PARTY.md) for versions and licenses.

---

If your agent survives the audit, add the report to its README. If it does not, the costume department is down the hall.

**[Run the audit](https://yangyangnovelist-hub.github.io/prompt-cosplay/)** · **[Star PromptCosplay](https://github.com/yangyangnovelist-hub/prompt-cosplay)**
