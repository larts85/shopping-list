# Application conventions

- Use the installed Next.js docs before changing framework APIs. `package.json` and current code take precedence over older framework versions mentioned in documentation.
- Reuse `app/ui/` and `shared/` components. Follow the touched files' formatting and Tailwind patterns rather than importing another design system.
- Keep Google credentials, OAuth token handling and data access on the server. Validate authentication, input and access to the selected spreadsheet in server actions and API routes.
- Preserve sheet names, headers and identifiers unless the task includes a data migration. Check string/number conversions, Argentine currency formatting, quantities and weight units when changing shopping calculations.
- Inspect callers and `app/lib/types` when changing shared data shapes. Handle loading, empty and error states in affected UI.
