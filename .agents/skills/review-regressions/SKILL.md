---
name: review-regressions
description: Perform a focused, read-only review of a Home Logistics change for behavior regressions and missing verification.
---

Read `AGENTS.md`, `.ai-assistant/rules/validation.md`, and relevant feature documentation. Review the supplied diff and trace affected user-visible behavior. Check whether `docs/application-features.md` needs an update, whether existing regression checks cover the change, and which important flows remain unverified. Report actionable findings with file/line and evidence, or state that no findings were identified. Do not edit files or run multiple reviewers.
