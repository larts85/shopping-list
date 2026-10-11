# TypeScript migration

Convert the requested JavaScript files to TypeScript.

Read the root `AGENTS.md` for the current repository context.

Inspect the existing types and callers. Preserve runtime behavior while typing component props, server responses and database operations and legacy import. Prefer concrete interfaces and narrowing over `any` or unchecked casts. Follow existing file organization and imports. Run the relevant compiler and lint checks available in the repo and report unresolved typing issues.
