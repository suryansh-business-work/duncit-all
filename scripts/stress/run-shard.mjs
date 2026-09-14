#!/usr/bin/env node
/**
 * One shard of a stress run, start to finish.
 *
 *   claim → start the bots on the shared schedule → report every 5 s → stop
 *   (plan done, or the server said so) → drain → final report
 *
 * The server owns every decision that needs to see the whole picture — the
 * guardrails read the host's CPU, which a runner cannot — so a report's answer
 * is what stops a shard early. A shard that cannot reach the server keeps to
 * its plan rather than guessing; the server ends a silent run on its own.
 *
 * Environment (set by .github/workflows/stress-test.yml):
 *   DUNCIT_GRAPHQL_URL   where the run is recorded — also the server under test
 *   DUNCIT_RELEASE_TOKEN or DUNCIT_RELEASE_EMAIL + _PASSWORD
 *   DISPATCH_ID, SHARD, RUN_ID, RUN_URL, CHROME_PATH
 */
import { setTimeout as sleep } from 'node:timers/promises';
import { createCiClient, describeError, MISSING_CREDENTIALS } from '../lib/ci-report.mjs';
import { resolveJourneys } from './journeys.mjs';
import { createMetrics } from './metrics.mjs';
import { startHttpBots } from './http-bots.mjs';
import { startBrowserBots } from './browser-bots.mjs';

const REPORT_EVERY_MS = 5_000;
/** Distinct error messages a report carries, so one broken query is not 10,000 log lines. */
const MAX_ERRORS_PER_REPORT = 5;
/** How long the final report keeps trying through a server that is not answering. */
const FINISH_RETRY_MS = 5 * 60_000;

const CLAIM = `mutation ($input: ClaimStressRunInput!) {
  claimStressRun(input: $input) {
    accepted reason run_no traffic_key target_mweb_url target_graphql_url started_at
    profile { virtual_users browser_bots runners ramp_up_seconds hold_seconds ramp_down_seconds think_time_ms journeys }
  }
}`;
const REPORT = `mutation ($input: ReportStressRunInput!) { reportStressRun(input: $input) { stop reason } }`;
const FINISH = `mutation ($input: FinishStressRunInput!) { finishStressRun(input: $input) }`;

const url = process.env.DUNCIT_GRAPHQL_URL;
const dispatchId = process.env.DISPATCH_ID;
const shard = Number.parseInt(process.env.SHARD ?? '0', 10);

/** This shard's slice of a total — the remainder goes to the first shards. */
const sliceOf = (total, runners) => Math.floor(total / runners) + (shard < total % runners ? 1 : 0);

/** How far through the plan a moment is, and how many users that moment wants. */
function planAt(profile, startedAtMs, users) {
  const t = (Date.now() - startedAtMs) / 1000;
  const { ramp_up_seconds: up, hold_seconds: hold, ramp_down_seconds: down } = profile;
  if (t < 0) return { phase: 'waiting', target: 0, done: false, elapsed: 0 };
  if (t < up) return { phase: 'ramp-up', target: Math.max(1, Math.ceil((users * t) / up)), done: false, elapsed: t };
  if (t < up + hold) return { phase: 'hold', target: users, done: false, elapsed: t };
  if (t < up + hold + down) {
    const left = 1 - (t - up - hold) / down;
    return { phase: 'ramp-down', target: Math.ceil(users * left), done: false, elapsed: t };
  }
  return { phase: 'done', target: 0, done: true, elapsed: t };
}

function createErrorLog() {
  const pending = new Map();
  return {
    note(key, message) {
      const line = `${key}: ${message}`;
      if (pending.size < MAX_ERRORS_PER_REPORT || pending.has(line)) {
        pending.set(line, (pending.get(line) ?? 0) + 1);
      }
    },
    drain() {
      const events = [...pending.entries()].map(([line, count]) => ({ level: 'WARN', message: `${line} (×${count})` }));
      pending.clear();
      return events;
    },
  };
}

const NO_BROWSERS = { activeCount: () => 0, visibleStates: () => [], close: async () => undefined };

/** Generate the load and report on it until the plan ends or the server says stop. */
async function drive(claim, client, token, metrics) {
  const profile = claim.profile;
  const users = sliceOf(profile.virtual_users, profile.runners);
  const bots = sliceOf(profile.browser_bots, profile.runners);
  const startedAtMs = Date.parse(claim.started_at);
  console.log(`${claim.run_no} · shard ${shard + 1}/${profile.runners} · ${users} users · ${bots} browser bots`);

  const errors = createErrorLog();
  const events = [];
  let stopReason = '';
  const ctx = {
    shard,
    trafficKey: claim.traffic_key,
    mwebUrl: claim.target_mweb_url,
    graphqlUrl: claim.target_graphql_url,
    serverUrl: claim.target_graphql_url.replace(/\/graphql$/, ''),
    thinkTimeMs: profile.think_time_ms,
    journeys: resolveJourneys(profile.journeys),
    metrics,
    stopped: () => Boolean(stopReason) || planAt(profile, startedAtMs, users).done,
    noteError: errors.note,
  };

  const http = startHttpBots(ctx, () => planAt(profile, startedAtMs, users).target);
  let browsers = NO_BROWSERS;
  try {
    browsers = await startBrowserBots(ctx, bots);
  } catch (err) {
    events.push({ level: 'ERROR', message: `Browser bots could not start: ${describeError(err)}` });
  }

  let silentSince = null;
  while (!ctx.stopped()) {
    await sleep(REPORT_EVERY_MS);
    const plan = planAt(profile, startedAtMs, users);
    const input = {
      dispatch_id: dispatchId,
      shard,
      phase: plan.phase,
      elapsed_seconds: Math.round(plan.elapsed),
      active_vus: http.activeCount(),
      active_bots: browsers.activeCount(),
      ...metrics.takeWindow(),
      bots: [...browsers.visibleStates(), ...http.visibleStates()],
      events: [...events.splice(0), ...errors.drain()],
    };
    try {
      const { reportStressRun: answer } = await client.gqlOnce(REPORT, { input }, token);
      silentSince = null;
      if (answer.stop) {
        stopReason = answer.reason || 'The server asked this run to stop.';
        console.log(`Stopping: ${stopReason}`);
      }
    } catch (err) {
      // Keep to the plan. A server too busy to take a report is exactly what a
      // stress run is for; the server ends a run it has stopped hearing from.
      silentSince ??= Date.now();
      console.warn(`⚠ report failed (${Math.round((Date.now() - silentSince) / 1000)}s): ${describeError(err)}`);
    }
  }
  await Promise.all([http.drain(), browsers.close()]);
  return stopReason ? 'ABORTED' : 'COMPLETED';
}

async function finish(client, token, metrics, outcome, error) {
  const summary = metrics.summary();
  console.log(`Finished ${outcome}: ${summary.requests} requests, ${summary.errors} errors, p95 ${summary.p95_ms} ms`);
  // Its own retry window: the client's was fixed when the run started, and a
  // half-hour run would otherwise send the one report that matters with none.
  await client.gql(
    FINISH,
    { input: { dispatch_id: dispatchId, shard, outcome, error, summary, endpoints: metrics.endpoints() } },
    token,
    Date.now() + FINISH_RETRY_MS
  );
}

async function main() {
  if (!url || !dispatchId) throw new Error('DUNCIT_GRAPHQL_URL and DISPATCH_ID are required.');
  const client = createCiClient({ url, retryWindowMs: 5 * 60_000 });
  const token = await client.resolveToken();
  if (!token) throw new Error(MISSING_CREDENTIALS);

  const { claimStressRun: claim } = await client.gql(
    CLAIM,
    { input: { dispatch_id: dispatchId, shard, workflow_run_id: process.env.RUN_ID, workflow_run_url: process.env.RUN_URL } },
    token
  );
  if (!claim.accepted) {
    console.log(`Nothing to do: ${claim.reason}`);
    return;
  }
  // The key lets this runner's traffic past the rate limiter; keep it out of the log.
  console.log(`::add-mask::${claim.traffic_key}`);

  const metrics = createMetrics();
  try {
    const outcome = await drive(claim, client, token, metrics);
    await finish(client, token, metrics, outcome, '');
  } catch (err) {
    // Said out loud rather than left to the server's silence timeout, so the run
    // closes now and its log names the reason.
    await finish(client, token, metrics, 'FAILED', describeError(err));
    throw err;
  }
}

try {
  await main();
} catch (err) {
  console.error(`✖ stress shard ${shard + 1} failed: ${describeError(err)}`);
  process.exitCode = 1;
}
