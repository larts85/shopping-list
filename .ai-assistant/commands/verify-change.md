# Verify a change

Use this workflow after implementing a change or when asked to validate one.

1. Inspect `git diff --name-only` and classify the change: UI, business logic, database/schema, authentication/authorization, integrations, or documentation/configuration.
2. Read `package.json` and `AGENTS.md`; use only the commands that cover the changed area. Do not run secret-backed or production checks without the required authorized environment.
3. Run the smallest useful checks first. For behavior changes, include the relevant local regression script or test. For UI behavior, use `$browser-testing` when a browser and authorized test data are available.
4. For functional changes, run `yarn verify:feature-docs` and confirm `docs/application-features.md` reflects the behavior.
5. Report each command as passed, failed, or not run, with a short reason. Never infer a pass from a prior run or a successful build.
6. If a check fails, inspect the failure, fix task-related regressions when in scope, and rerun that check. Do not weaken a check to obtain a pass.

Keep the report compact: changed area, checks and results, and remaining unverified behavior.
