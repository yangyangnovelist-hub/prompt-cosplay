# Third-party software

PromptCosplay is designed as a thin quality and evidence layer over established open-source tools.

| Project | Use | Version / reference | License |
| --- | --- | --- | --- |
| [SkillDoctor](https://github.com/xyiqq/skilldoctor) | Agent Skills lint, security audit, compatibility | commit `629d5cda9021c07a07aeae67ae8e00ef4222a0d4` | MIT |
| [SkillReaper](https://github.com/thousandflowers/skillreaper) | Optional usage-evidence JSON | JSON interface | MIT |
| [promptfoo](https://github.com/promptfoo/promptfoo) | Optional behavioral A/B runner | generated config interface | MIT |
| [Commander.js](https://github.com/tj/commander.js) | CLI argument parsing | `^14.0.0` | MIT |

SkillDoctor and Commander are runtime dependencies. SkillReaper and promptfoo are optional integrations and are not bundled.
