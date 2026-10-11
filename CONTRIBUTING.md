# Contributing

PromptCosplay welcomes detectors, evidence adapters, portability checks, and real benchmark fixtures.

## Before opening a pull request

```bash
npm install
npm run ci
node dist/cli.js audit test/fixtures/roles
```

Contributions should keep scoring deterministic and explainable. A new detector needs one positive fixture, one negative fixture, and a short description of what observable evidence it measures.

Avoid adding model calls to the core scanner. Behavioral execution belongs in promptfoo or another explicit runner; transcript-derived use belongs in SkillReaper. PromptCosplay should remain fast, local-first, and inspectable.

## Useful contribution shapes

- host-specific portability failures with a reproducer;
- role-specific benchmark conventions used by real repositories;
- parsers for evidence exported by other open-source tools;
- false-positive reductions backed by a fixture;
- report accessibility and small-screen improvements.

Please do not submit new scoring adjectives without a measurable signal behind them.
