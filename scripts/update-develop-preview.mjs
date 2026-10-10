import { pathToFileURL } from 'node:url';

export const PROJECT = 'prj_4jD0lnCp0Kt0uVaEVpjJcQc1xRIN';
export const TEAM = 'team_UcABwL8fkmWH4jk2VQ19tZhg';
export const ALIAS = 'home-logistics-develop-preview.vercel.app';
export const REPOSITORY = 'larts85/shopping-list';

export function eligiblePulls(pulls) {
  return pulls.filter(pr => pr.state === 'open' && pr.base.ref === 'develop'
    && pr.head.repo?.full_name === REPOSITORY && !pr.draft);
}
export function selectDeployment(deployments, pulls) {
  const heads = new Set(eligiblePulls(pulls).map(pr => pr.head.sha));
  return deployments.filter(d => d.projectId === PROJECT && d.readyState === 'READY'
    && (d.target == null || d.target === 'preview') && !d.customEnvironment
    && d.meta?.githubCommitOrg === 'larts85' && d.meta?.githubCommitRepo === 'shopping-list'
    && heads.has(d.meta?.githubCommitSha))
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))[0];
}
export function canAdvance(candidate, current) {
  return candidate && (!current || (current.id !== candidate.id
    && Number(candidate.createdAt) > Number(current.createdAt)));
}

export async function updatePreview({ githubToken, vercelToken, fetcher = fetch, log = console.log }) {
  if (!githubToken || !vercelToken) throw new Error('Configure GITHUB_TOKEN and VERCEL_TOKEN in CI.');
  async function request(base, path, token, options = {}) {
    const response = await fetcher(`${base}${path}`, {
      ...options, signal: AbortSignal.timeout(30000), headers: {
        Authorization: `Bearer ${token}`, Accept: 'application/json',
        'Content-Type': 'application/json', ...options.headers,
      },
    });
    if (response.status === 404 && options.allowMissing) return null;
    if (!response.ok) throw new Error(`API request failed (${response.status}) for ${path.split('?')[0]}`);
    return response.json();
  }
  const github = path => request('https://api.github.com', path, githubToken);
  const vercel = (path, options) => request('https://api.vercel.com',
    `${path}${path.includes('?') ? '&' : '?'}teamId=${TEAM}`, vercelToken, options);
  let pulls = [];
  for (let page = 1; ; page++) {
    const result = await github(`/repos/${REPOSITORY}/pulls?state=open&base=develop&per_page=100&page=${page}`);
    pulls.push(...result);
    if (result.length < 100) break;
  }
  pulls = eligiblePulls(pulls);
  if (!pulls.length) { log('No eligible open PRs to develop; keeping current preview.'); return; }
  const deployments = [];
  for (const pr of pulls) {
    const result = await vercel(`/v7/deployments?projectId=${PROJECT}&sha=${encodeURIComponent(pr.head.sha)}&state=READY&target=preview&limit=10`);
    // Get full details to validate project, environment, repository and SHA independently.
    for (const d of result.deployments) {
      deployments.push(await vercel(`/v13/deployments/${encodeURIComponent(d.uid)}`));
    }
  }
  const candidate = selectDeployment(deployments, pulls);
  if (!candidate) { log('No successful deployment for current PR heads; keeping current preview.'); return; }
  const alias = await vercel(`/v4/aliases/${ALIAS}`, { allowMissing: true });
  if (alias && alias.projectId !== PROJECT) throw new Error('Alias belongs to another project.');
  const currentId = alias?.deploymentId ?? alias?.deployment?.id;
  const current = currentId ? await vercel(`/v13/deployments/${encodeURIComponent(currentId)}`) : null;
  if (!canAdvance(candidate, current)) { log('Alias already current or newer; no rollback.'); return; }
  // Recheck the PR after API calls: do not publish a closed PR or obsolete head.
  const pr = pulls.find(pr => pr.head.sha === candidate.meta.githubCommitSha);
  const latest = await github(`/repos/${REPOSITORY}/pulls/${pr.number}`);
  if (!eligiblePulls([latest]).length || latest.head.sha !== candidate.meta.githubCommitSha) {
    log('PR changed while checking; waiting for the next run.'); return;
  }
  await vercel(`/v2/deployments/${encodeURIComponent(candidate.id)}/aliases`, {
    method: 'POST', body: JSON.stringify({ alias: ALIAS }),
  });
  const saved = await vercel(`/v4/aliases/${ALIAS}`);
  if ((saved.deploymentId ?? saved.deployment?.id) !== candidate.id) throw new Error('Alias assignment was not confirmed.');
  log(`Preview updated: https://${ALIAS} (PR #${pr.number}, ${latest.head.sha})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  updatePreview({ githubToken: process.env.GITHUB_TOKEN, vercelToken: process.env.VERCEL_TOKEN })
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
