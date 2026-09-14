/**
 * Latency bookkeeping for one shard, cheap enough to call on every request.
 *
 * Latencies go into a log-scaled histogram (5% wide buckets) rather than an
 * array: a shard sends hundreds of thousands of requests, and a percentile read
 * off buckets is within 5% of the truth at a fixed few hundred counters.
 *
 * Two views are kept at once — the WINDOW since the last report (what the
 * live charts draw) and the TOTAL for the run (what the final summary says) —
 * plus a per-endpoint total, which is where a slow query shows itself.
 */

const FACTOR = 1.05;
const LOG_FACTOR = Math.log(FACTOR);
const MAX_BUCKET = 260; // ≈ 330 s — beyond any request timeout

const bucketOf = (ms) => (ms <= 1 ? 0 : Math.min(MAX_BUCKET, Math.floor(Math.log(ms) / LOG_FACTOR)));
const valueOf = (bucket) => Math.round(FACTOR ** (bucket + 0.5));

function histogram() {
  return { counts: new Map(), n: 0, sum: 0 };
}

function add(h, ms) {
  const bucket = bucketOf(ms);
  h.counts.set(bucket, (h.counts.get(bucket) ?? 0) + 1);
  h.n += 1;
  h.sum += ms;
}

function percentile(h, p) {
  if (h.n === 0) return 0;
  const rank = Math.ceil((p / 100) * h.n);
  let seen = 0;
  const buckets = [...h.counts.keys()];
  buckets.sort((a, b) => a - b);
  for (const bucket of buckets) {
    seen += h.counts.get(bucket);
    if (seen >= rank) return valueOf(bucket);
  }
  return valueOf(buckets.at(-1));
}

const avg = (h) => (h.n === 0 ? 0 : Math.round(h.sum / h.n));

function freshWindow() {
  return {
    startedAt: Date.now(),
    requests: 0,
    errors: 0,
    latency: histogram(),
    statuses: new Map(),
    navigations: 0,
    pageLoad: histogram(),
  };
}

export function createMetrics() {
  let window = freshWindow();
  const total = { requests: 0, errors: 0, latency: histogram(), navigations: 0, navigationErrors: 0, pageLoad: histogram() };
  const endpoints = new Map();
  const startedAt = Date.now();

  return {
    /** One request: which endpoint, how long, what came back, and whether it counts as an error. */
    request(key, ms, status, ok) {
      window.requests += 1;
      total.requests += 1;
      add(window.latency, ms);
      add(total.latency, ms);
      window.statuses.set(status, (window.statuses.get(status) ?? 0) + 1);
      let endpoint = endpoints.get(key);
      if (!endpoint) {
        endpoint = { requests: 0, errors: 0, latency: histogram() };
        endpoints.set(key, endpoint);
      }
      endpoint.requests += 1;
      add(endpoint.latency, ms);
      if (!ok) {
        window.errors += 1;
        total.errors += 1;
        endpoint.errors += 1;
      }
    },

    /** One real-browser page load. */
    navigation(ms, ok) {
      window.navigations += 1;
      total.navigations += 1;
      if (ok) {
        add(window.pageLoad, ms);
        add(total.pageLoad, ms);
      } else {
        total.navigationErrors += 1;
      }
    },

    /** The window since the last call, then a fresh one. */
    takeWindow() {
      const w = window;
      window = freshWindow();
      return {
        window_seconds: Math.max(0.001, (Date.now() - w.startedAt) / 1000),
        requests: w.requests,
        errors: w.errors,
        p50_ms: percentile(w.latency, 50),
        p95_ms: percentile(w.latency, 95),
        p99_ms: percentile(w.latency, 99),
        navigations: w.navigations,
        page_load_ms: avg(w.pageLoad),
        status_counts: [...w.statuses.entries()].map(([code, count]) => ({ code, count })),
      };
    },

    summary() {
      const seconds = Math.max(1, (Date.now() - startedAt) / 1000);
      return {
        requests: total.requests,
        errors: total.errors,
        error_rate_pct: total.requests > 0 ? Math.round((total.errors / total.requests) * 1000) / 10 : 0,
        avg_rps: Math.round((total.requests / seconds) * 10) / 10,
        avg_ms: avg(total.latency),
        p50_ms: percentile(total.latency, 50),
        p95_ms: percentile(total.latency, 95),
        p99_ms: percentile(total.latency, 99),
        navigations: total.navigations,
        navigation_errors: total.navigationErrors,
        avg_page_load_ms: avg(total.pageLoad),
      };
    },

    endpoints() {
      return [...endpoints.entries()].map(([key, e]) => ({
        key,
        requests: e.requests,
        errors: e.errors,
        avg_ms: avg(e.latency),
        p50_ms: percentile(e.latency, 50),
        p95_ms: percentile(e.latency, 95),
        p99_ms: percentile(e.latency, 99),
      }));
    },
  };
}
