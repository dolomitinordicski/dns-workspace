#!/usr/bin/env node
/**
 * Read-only GitHub telemetry collector for DNS AI Impact Monitor.
 * Node >=22, no third-party dependencies. Firestore write is optional and
 * requires a short-lived OAuth access token issued via GitHub OIDC / Google WIF.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { estimateDevelopmentSessions } from './ai-impact-session-estimator.mjs';
import { modelEnvironmentalScenarios } from './ai-impact-environment-model.mjs';

export const OWNER = 'dolomitinordicski';
export const START = process.env.DNS_AI_IMPACT_START || '2026-10-01';
const GH_BASE = 'https://api.github.com';
const FIRESTORE_PROJECT = 'dns-core';
const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};
const excluded = new Set((process.env.DNS_AI_IMPACT_EXCLUDE || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean));

export async function github(path) {
  const response = await fetch(GH_BASE + path, { headers });
  if (!response.ok) throw new Error(`GITHUB_HTTP_${response.status}: ${path}`);
  return response.json();
}
export async function pages(path, maxPages = 100) {
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const chunk = await github(`${path}${sep}per_page=100&page=${page}`);
    if (!Array.isArray(chunk)) throw new Error('GITHUB_RESPONSE_NOT_ARRAY: ' + path);
    all.push(...chunk);
    if (chunk.length < 100) return all;
  }
  throw new Error('GITHUB_PAGINATION_LIMIT: ' + path);
}
function isoDay(d) { return new Date(d).toISOString().slice(0, 10); }
function byDate(value, start, end) {
  if (!value) return false;
  const day = isoDay(value);
  return day >= start && day <= end;
}
const emptyDay = date => ({
  date,
  observed: { commits: 0, pullRequests: 0, actionsRuns: 0 },
});
export function summarize(repositories, commits, pulls, runs, start, end, generatedAt) {
  const daily = new Map();
  const ensure = date => {
    if (!daily.has(date)) daily.set(date, emptyDay(date));
    return daily.get(date);
  };
  const uniqueCommits = new Set();
  const uniquePRs = new Set();
  const uniqueRuns = new Set();
  let actionsElapsedMs = 0;
  let measuredRunDurations = 0;
  for (const item of commits) {
    if (!byDate(item.date, start, end)) continue;
    const id = `${item.repo}:${item.sha}`;
    if (uniqueCommits.has(id)) continue;
    uniqueCommits.add(id);
    ensure(isoDay(item.date)).observed.commits++;
  }
  for (const item of pulls) {
    if (!byDate(item.date, start, end)) continue;
    const id = `${item.repo}:${item.number}`;
    if (uniquePRs.has(id)) continue;
    uniquePRs.add(id);
    ensure(isoDay(item.date)).observed.pullRequests++;
  }
  for (const item of runs) {
    if (!byDate(item.date, start, end)) continue;
    const id = `${item.repo}:${item.id}`;
    if (uniqueRuns.has(id)) continue;
    uniqueRuns.add(id);
    ensure(isoDay(item.date)).observed.actionsRuns++;
    if (item.status === 'completed' && item.startedAt && item.completedAt) {
      const ms = Date.parse(item.completedAt) - Date.parse(item.startedAt);
      if (Number.isFinite(ms) && ms >= 0 && ms < 7 * 86_400_000) {
        actionsElapsedMs += ms;
        measuredRunDurations++;
      }
    }
  }
  const estimated = {
    aiHours: null, humanEquivalentHours: null,
    electricityKwh: null, waterLitres: null,
  };
  const latest = {
    schemaVersion: 1, generatedAt, periodStart: start, periodEnd: end,
    observed: {
      repositories: repositories.length,
      commits: uniqueCommits.size,
      pullRequests: uniquePRs.size,
      actionsRuns: uniqueRuns.size,
      actionsMinutes: null,
      actionsElapsedHours: measuredRunDurations ? Math.round(actionsElapsedMs/3_600_000*10)/10 : null,
      actionsElapsedCoverage: uniqueRuns.size ? Math.round(measuredRunDurations/uniqueRuns.size*100) : null,
    },
    estimated,
    provenance: 'github-rest-api',
    estimationStatus: 'unavailable-no-ai-usage-telemetry',
  };
  return { latest, daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)) };
}
async function listRepos() {
  // Owner is currently a GitHub user account; if changed to org, support both.
  let repos;
  try { repos = await pages(`/users/${OWNER}/repos?type=owner&sort=full_name`); }
  catch { repos = await pages(`/orgs/${OWNER}/repos?type=all&sort=full_name`); }
  return repos.filter(r => !r.archived && !r.fork && r.name &&
    !excluded.has(r.name.toLowerCase())).map(r => r.name);
}
async function collectRepo(repo, start, end) {
  const path = `/repos/${OWNER}/${encodeURIComponent(repo)}`;
  // Fetch only commits on the default branch and only within the selected period.
  const commitItems = await pages(`${path}/commits?since=${start}T00:00:00Z&until=${end}T23:59:59Z`);
  const commits = commitItems.map(x => ({repo,sha:x.sha,date:x.commit?.committer?.date}));
  // PR creation is a documented activity signal; not equivalent to developer hours.
  const pulls = [];
  for (const x of await pages(`${path}/pulls?state=all&sort=created&direction=desc`)) {
    if (byDate(x.created_at, start, end)) pulls.push({repo, number:x.number, date:x.created_at});
  }
  // Workflow run metadata. No inference of billed minutes from elapsed run time.
  const runs = [];
  try {
    const workflowRuns = [];
    for (let page = 1; page <= 100; page++) {
      const batch = await github(`${path}/actions/runs?created=${start}..${end}&per_page=100&page=${page}`);
      if (!Array.isArray(batch.workflow_runs)) throw new Error('RUNS_RESPONSE_INVALID');
      workflowRuns.push(...batch.workflow_runs);
      if (batch.workflow_runs.length < 100) break;
      if (page === 100) throw new Error('RUNS_PAGINATION_LIMIT');
    }
    for (const x of workflowRuns) {
      if (byDate(x.created_at,start,end)) runs.push({repo,id:x.id,date:x.created_at,startedAt:x.run_started_at,completedAt:x.updated_at, status:x.status});
    }
  } catch (error) {
    // Do not silently replace unavailable GitHub Actions data with zero.
    throw new Error(`ACTIONS_COLLECTION_FAILED ${repo}: ${error.message}`);
  }
  return { commits, pulls, runs };
}
export function publicSummary(latest) {
  // Explicit, minimal field allowlist. NEVER copy arbitrary admin metadata.
  return {
    schemaVersion: 1,
    generatedAt: latest.generatedAt,
    periodStart: latest.periodStart,
    periodEnd: latest.periodEnd,
    observed: {
      repositories: latest.observed.repositories,
      commits: latest.observed.commits,
      pullRequests: latest.observed.pullRequests,
      actionsMinutes: null,
      actionsElapsedHours: latest.observed.actionsElapsedHours,
      actionsElapsedCoverage: latest.observed.actionsElapsedCoverage,
    },
    estimated: {
      aiHours: null,
      humanEquivalentHours: null,
      electricityKwh: latest.estimated.electricityKwh,
      waterLitres: latest.estimated.waterLitres,
    },
    environmentModel: latest.environmentModel ?? null,
    provenance: 'github-rest-api',
    developmentActivity: latest.developmentActivity ?? null,
  };
}
async function firestorePatch(collectionId, documentId, payload, accessToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${collectionId}/${documentId}`;
  const value = obj => {
    if (obj === null) return { nullValue: null };
    if (typeof obj === 'string') return { stringValue: obj };
    if (typeof obj === 'number') return { doubleValue: obj };
    if (typeof obj === 'boolean') return { booleanValue: obj };
    if (Array.isArray(obj)) return { arrayValue: { values: obj.map(value) } };
    return { mapValue: { fields: Object.fromEntries(Object.entries(obj).map(([k,v]) => [k,value(v)])) } };
  };
  const body = { fields: Object.fromEntries(Object.entries(payload).map(([k,v]) => [k,value(v)])) };
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`FIRESTORE_WRITE_FAILED_${response.status}`);
}
export async function main() {
  const today = isoDay(new Date());
  const start = START, end = process.env.DNS_AI_IMPACT_END || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end || end > today) throw new Error('INVALID_PERIOD');
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN_REQUIRED');
  const repoNames = await listRepos();
  const commits = [], pulls = [], runs = [];
  for (const repo of repoNames) {
    const events = await collectRepo(repo, start, end);
    commits.push(...events.commits);
    pulls.push(...events.pulls);
    runs.push(...events.runs);
  }
  const result = summarize(repoNames, commits, pulls, runs, start, end, new Date().toISOString());
  result.latest.developmentActivity = estimateDevelopmentSessions(commits.filter(x => x.date && x.date.slice(0,10) >= start && x.date.slice(0,10) <= end));
  const model = modelEnvironmentalScenarios(result.latest.developmentActivity.sessions);
  result.latest.estimated.electricityKwh = model.electricityKwh;
  result.latest.estimated.waterLitres = model.waterLitres;
  result.latest.environmentModel = model;
  await mkdir('ai-impact-output', {recursive:true});
  await writeFile('ai-impact-output/snapshot.json', JSON.stringify(result,null,2) + '\n');
  await writeFile('ai-impact-output/public-summary.json', JSON.stringify(publicSummary(result.latest),null,2) + '\n');
  console.log(JSON.stringify({repositories:repoNames.length,commits:result.latest.observed.commits,
    pullRequests:result.latest.observed.pullRequests,actionsRuns:result.latest.observed.actionsRuns}));
  if (process.env.DNS_AI_IMPACT_PUBLISH === 'true') {
    const token = process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
    if (!token) throw new Error('GOOGLE_OAUTH_ACCESS_TOKEN_REQUIRED');
    // Daily immutable day documents and latest; atomicity is not guaranteed.
    for (const day of result.daily) {
      await firestorePatch('adminAiImpactSnapshots', `day-${day.date}`, {schemaVersion:1,generatedAt:result.latest.generatedAt,...day}, token);
    }
    await firestorePatch('adminAiImpactSnapshots', 'latest', result.latest, token);
    await firestorePatch('memberAiImpactSnapshots', 'latest', publicSummary(result.latest), token);
    console.log('Published AI Impact snapshot to Firestore');
  } else console.log('DRY RUN: no Firestore write');
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  main().catch(error => {console.error(error.message);process.exitCode=1});
}
