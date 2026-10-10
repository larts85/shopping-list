import test from 'node:test';
import assert from 'node:assert/strict';
import { selectDeployment, canAdvance, PROJECT, REPOSITORY } from './update-develop-preview.mjs';
const pr = {state:'open', base:{ref:'develop'},head:{sha:'abc', repo:{full_name:REPOSITORY}}};
const deployment = {id:'new', projectId:PROJECT,readyState:'READY',target:null,createdAt:20,
  meta:{githubCommitOrg:'larts85',githubCommitRepo:'shopping-list',githubCommitSha:'abc'}};
test('only ready previews of current same-repository develop PR heads are eligible', () => {
  assert.equal(selectDeployment([deployment],[pr]),deployment);
  for (const change of [{target:'production'},{readyState:'ERROR'},{projectId:'other'},
    {customEnvironment:{id:'staging'}},{meta:{...deployment.meta,githubCommitSha:'old'}}]) {
    assert.equal(selectDeployment([{...deployment,...change}],[pr]),undefined);
  }
  for (const change of [{state:'closed'},{draft:true},{base:{ref:'main'}},
    {head:{...pr.head,repo:{full_name:'fork/repo'}}}]) {
    assert.equal(selectDeployment([deployment],[{...pr,...change}]),undefined);
  }
});
test('newest successful build wins regardless of event order; never roll back alias', () => {
  const old = {...deployment,id:'old',createdAt:10};
  assert.equal(selectDeployment([old,deployment],[pr]),deployment);
  assert.ok(canAdvance(deployment,old));
  assert.equal(canAdvance(old,deployment),false);
  assert.equal(canAdvance(deployment,deployment),false);
  assert.ok(canAdvance(deployment,null));
});

import { updatePreview, ALIAS } from './update-develop-preview.mjs';
test('rechecks PR head before alias mutation and verifies saved deployment', async () => {
  for (const changed of [false, true]) {
    const writes = [];
    const fetcher = async (url, options) => {
      const path = new URL(url).pathname;
      let data;
      let status = 200;
      if (path.endsWith('/pulls')) data = [{...pr,number:7}];
      else if (path.endsWith('/pulls/7')) data = {...pr,number:7,head:{...pr.head,sha:changed?'new-sha':'abc'}};
      else if (path === '/v7/deployments') data = {deployments:[{uid:deployment.id}]};
      else if (path === `/v13/deployments/${deployment.id}`) data = deployment;
      else if (path === `/v2/deployments/${deployment.id}/aliases`) {
        writes.push(JSON.parse(options.body)); data = {alias:ALIAS};
      } else if (path === `/v4/aliases/${ALIAS}`) {
        if (writes.length) data = {projectId:PROJECT,deploymentId:deployment.id};
        else {status=404;data={};}
      } else throw new Error(`Unexpected endpoint ${path}`);
      return {ok:status===200,status,json:async()=>data};
    };
    await updatePreview({githubToken:'test-github',vercelToken:'test-vercel',fetcher,log:()=>{}});
    assert.equal(writes.length,changed?0:1);
    if (!changed) assert.deepEqual(writes[0],{alias:ALIAS});
  }
});
