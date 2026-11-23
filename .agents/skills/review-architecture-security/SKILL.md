---
name: review-architecture-security
description: Perform a focused, read-only review of Home Logistics changes for architecture, authorization, and secret-handling risks.
---

Read `AGENTS.md`, `.ai-assistant/rules/implementation.md`, and the relevant architecture or security docs. Review only the supplied diff. Report actionable findings with severity, file/line, and evidence; otherwise state that no findings were identified. Check authorization on server-side actions and routes, data ownership boundaries, validation of untrusted inputs, and accidental exposure of secrets or personal data. Do not edit files or run multiple reviewers. This is a focused review aid, not a substitute for CI or a security audit.
