export function listShareUrl(
  slug: string,
  environment: Record<string, string | undefined> = process.env,
): string {
  // Preview invitations must stay in the same database environment as their list.
  const previewHost = environment.VERCEL_BRANCH_URL || environment.VERCEL_URL;
  const base =
    environment.VERCEL_ENV === "preview"
      ? previewHost
        ? `https://${previewHost}`
        : "https://home-logistics-git-develop-larts85s-projects.vercel.app"
      : environment.APP_URL || "https://elcarritodelacompra.vercel.app";
  return new URL(`/logistic/lists/${slug}`, base).href;
}
