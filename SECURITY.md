# Security

PromptCosplay audits untrusted repositories locally. It reads files but does not execute repository code.

- Local-path audits make no network requests.
- GitHub targets invoke `git clone --depth 1` without a shell and remove the temporary checkout after the report is built.
- Repository symlinks are never traversed by the role scanner. SkillDoctor is isolated to each discovered skill and skipped with an error finding when that skill contains a symlink.
- Explicit proof references count only when they resolve to regular files contained inside the audited root.
- Report rendering escapes repository-controlled text before emitting HTML.
- PromptCosplay never deletes, edits, or quarantines audited role files.

Do not include secrets in role Markdown, generated reports, or bug reports. To report a vulnerability privately, use GitHub's private vulnerability reporting for this repository.
