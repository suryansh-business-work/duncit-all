/**
 * The HTTP bots — the volume of a stress run.
 *
 * Each virtual user is one async loop walking a journey step by step with a
 * jittered think time between steps, the way a person reads a page before
 * tapping the next one. The pool follows the plan's target every second: it
 * starts users as the ramp climbs, and a user whose number is above the target
 * finishes the step it is on and leaves. Nobody is killed mid-request, so the
 * latency of the last window is never polluted by aborted fetches.
 */
import { setTimeout as sleep } from 'node:timers/promises';

const REQUEST_TIMEOUT_MS = 30_000;
/** How many bot states each report carries — enough to see what they are doing. */
const VISIBLE_BOTS = 40;
const USER_AGENT = 'Mozilla/5.0 (compatible; DuncitStressBot/1.0; +https://tech.duncit.com/stress-testing)';

/** Status label for a failed round trip, so the chart can tell a timeout from a refusal. */
function failureLabel(err) {
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') return 'TIMEOUT';
  return 'NETWORK';
}

async function send(step, ctx) {
  const headers = { 'user-agent': USER_AGENT, 'x-duncit-stress': ctx.trafficKey };
  if (step.kind === 'page') {
    const res = await fetch(`${ctx.mwebUrl}${step.path}`, {
      headers: { ...headers, accept: 'text/html' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    await res.arrayBuffer();
    return { status: String(res.status), ok: res.ok };
  }
  if (step.kind === 'health') {
    const res = await fetch(`${ctx.serverUrl}/health`, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    await res.arrayBuffer();
    return { status: String(res.status), ok: res.ok };
  }
  const res = await fetch(ctx.graphqlUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'content-type': 'application/json',
      // What mWeb itself declares, so the server takes the same code path a
      // real visit does (surface-aware caching, the same rate-limit systems).
      'x-duncit-surface': 'MWEB',
      'x-duncit-app': 'mweb',
    },
    body: JSON.stringify({ operationName: step.operationName, query: step.query, variables: step.variables() }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = await res.json().catch(() => null);
  // A 200 carrying errors is a failed request as far as a visitor is concerned.
  if (res.ok && json?.errors?.length) return { status: 'GQL_ERROR', ok: false, error: json.errors[0]?.message };
  return { status: String(res.status), ok: res.ok };
}

async function runStep(step, ctx) {
  const started = performance.now();
  try {
    const result = await send(step, ctx);
    ctx.metrics.request(step.key, performance.now() - started, result.status, result.ok);
    if (!result.ok) ctx.noteError(step.key, result.error ?? result.status);
    return result.status;
  } catch (err) {
    const label = failureLabel(err);
    ctx.metrics.request(step.key, performance.now() - started, label, false);
    ctx.noteError(step.key, label);
    return label;
  }
}

const jitter = (ms) => (ms <= 0 ? 0 : Math.round(ms * (0.5 + Math.random())));

async function virtualUser(id, ctx, pool) {
  const state = { bot: `vu-${ctx.shard + 1}-${id + 1}`, kind: 'HTTP', journey: '', page: '', status: 'starting', load_ms: 0, at: '' };
  pool.states.set(id, state);
  let iteration = 0;
  try {
    while (!ctx.stopped() && id < pool.target) {
      const journey = ctx.journeys[(id + iteration) % ctx.journeys.length];
      iteration += 1;
      for (const step of journey.steps) {
        if (ctx.stopped() || id >= pool.target) return;
        const started = performance.now();
        state.journey = journey.name;
        state.page = step.key;
        state.status = await runStep(step, ctx);
        state.load_ms = Math.round(performance.now() - started);
        state.at = new Date().toISOString();
        await sleep(jitter(ctx.thinkTimeMs));
      }
    }
  } finally {
    pool.states.delete(id);
    pool.active.delete(id);
  }
}

/**
 * Start the pool. `targetAt()` answers how many users this shard should have
 * right now; the returned handle reports the active count and a sample of what
 * the users are doing, and `drain()` resolves once every user has left.
 */
export function startHttpBots(ctx, targetAt) {
  const pool = { target: 0, active: new Map(), states: new Map() };
  const adjust = () => {
    pool.target = ctx.stopped() ? 0 : targetAt();
    for (let id = 0; id < pool.target; id += 1) {
      if (!pool.active.has(id)) pool.active.set(id, virtualUser(id, ctx, pool));
    }
  };
  adjust();
  const timer = setInterval(adjust, 1000);

  return {
    activeCount: () => pool.active.size,
    visibleStates: () => [...pool.states.values()].slice(0, VISIBLE_BOTS),
    async drain() {
      clearInterval(timer);
      pool.target = 0;
      await Promise.allSettled([...pool.active.values()]);
    },
  };
}
