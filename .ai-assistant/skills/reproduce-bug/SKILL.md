---
name: reproduce-bug
description: Reproduce and diagnose a reported Home Logistics defect before or alongside a fix, using the narrowest safe check.
---

# Reproduce a bug

Before following this workflow, read `.ai-assistant/skills/monday-dashboard/SKILL.md` and create or reuse the task item as required by the repository.

1. Read `AGENTS.md` and the relevant implementation and validation rules.
2. Turn the report into observable steps, expected behavior, and actual behavior. Identify the affected entity and entry point.
3. Trace the smallest relevant code path and existing tests or `scripts/verify-*.mjs` checks. Prefer a local deterministic reproduction; use `$browser-testing` for visible UI defects when browser access and authorized data are available.
4. Capture the evidence and exact command or steps. Do not mutate production data or use real credentials.
5. If the defect reproduces, record the failing assertion or observed mismatch and hand off a concise diagnosis to `$fix`. If it does not, state what was exercised and what remains unknown.
6. After a fix, use `$verify-change` to choose regression checks and report actual results.
