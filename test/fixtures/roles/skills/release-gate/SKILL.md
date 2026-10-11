---
name: release-gate
description: Validate a release before publication. Use when a user asks whether a package is ready to ship.
license: MIT
---

# Release Gate

## Steps

1. Run the documented test command.
2. Check the package manifest and generated files.
3. Verify that the install command succeeds in a temporary directory.
4. Return a pass/fail report with the exact failing command.

```bash
npm test
npm pack --dry-run
```

If a command fails, stop and report the failure. Do not publish or push. The gate passes only when all checks succeed.
