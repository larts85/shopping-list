# Validation

- Inspect `package.json` before choosing commands. Use Yarn with the committed `yarn.lock`.
- `yarn lint` runs ESLint; `yarn build` builds the app. For a direct compiler check use `yarn tsc --noEmit` when the installed compiler is available.
- Run the build and compiler check sequentially: the build regenerates `.next` types consumed by TypeScript. Do not run them concurrently.
- This baseline has no configured automated test script. Do not assume Jest, Testing Library, Playwright fixtures or coverage reports exist. Select tests from the actual repo configuration.
- For agent documentation/configuration changes, check skill metadata, configuration syntax, all local references and the final diff. Application checks are required when application behavior or build configuration changes.
- Fix task regressions and report unrelated baseline failures. Do not alter correct behavior or weaken tests to get a passing check.
- Verify affected browser flows with available tools when appropriate, using authorized test data. Report untested flows and authentication/tool limitations accurately.
