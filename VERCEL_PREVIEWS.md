# Pull request previews

The Vercel project is `home-logistics` in `larts85s-projects`, connected to
`larts85/shopping-list`. Commits on non-production branches create Preview
deployments; `main` is the production branch. Vercel posts deployment links and
statuses on pull requests.

The project uses the Next.js preset, the repository root, and the package's build
command. Check the deployment's environment in Vercel before redeploying.

Configure these server-only variables as **Secret**, scoped to **Preview**:

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `SUPABASE_PASSWORD_DB` for the Supabase migration branch

Never commit their values. Redeploy after changing environment variables.

Google OAuth must allow the preview's callback URL:
`https://<preview-host>/api/auth/callback/google`. Opening a deployment does not
by itself verify Google login or database access. Keep Vercel's deployment
protection enabled when testing previews with the application's real data.
