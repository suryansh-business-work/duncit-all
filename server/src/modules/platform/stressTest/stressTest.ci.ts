import { GraphQLError } from 'graphql';
import { StressRunModel, type IStressRun, type IStressShardResult, type StressEventLevel } from './stressTest.model';
import { trafficKeyFor } from './stressTest.traffic';
import { noteShardReport, type StressBotState } from './stressTest.live';
import { appendEvent, finaliseRun } from './stressTest.records';

/**
 * The three calls a runner makes: claim the run, report while it loads, and
 * say how it ended. Authenticated with the same CI token the E2E and build
 * workflows use, so a report carries the Tech gate a portal read does.
 */

const TERMINAL = new Set(['COMPLETED', 'ABORTED', 'FAILED']);
/** A report may carry a few log lines; a runner that floods them is clipped. */
const MAX_EVENTS_PER_REPORT = 20;
const MAX_BOTS_PER_REPORT = 60;

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

const str = (v: string | number | null | undefined, max = 500): string => String(v ?? '').trim().slice(0, max);
const nonNegative = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

async function runFor(dispatchId: string | undefined): Promise<IStressRun> {
  const id = str(dispatchId, 100);
  const run = id ? await StressRunModel.findOne({ dispatch_id: id }) : null;
  if (!run) throw badInput('No stress run matches this dispatch.');
  return run;
}

function shardOf(run: IStressRun, value: unknown): number {
  const shard = Number(value);
  if (!Number.isInteger(shard) || shard < 0 || shard >= run.profile.runners) {
    throw badInput(`Shard must be between 0 and ${run.profile.runners - 1}.`);
  }
  return shard;
}

const LEVELS = new Set<StressEventLevel>(['INFO', 'WARN', 'ERROR']);

function botsOf(input: any): StressBotState[] {
  const bots = Array.isArray(input.bots) ? input.bots.slice(0, MAX_BOTS_PER_REPORT) : [];
  return bots.map((b: any) => ({
    bot: str(b.bot, 40),
    kind: b.kind === 'BROWSER' ? 'BROWSER' : 'HTTP',
    journey: str(b.journey, 40),
    page: str(b.page, 300),
    status: str(b.status, 40),
    load_ms: Math.round(nonNegative(b.load_ms)),
    at: str(b.at, 40),
  }));
}

function summaryOf(input: any): IStressShardResult['summary'] {
  const s = input ?? {};
  return {
    requests: nonNegative(s.requests),
    errors: nonNegative(s.errors),
    error_rate_pct: nonNegative(s.error_rate_pct),
    avg_rps: nonNegative(s.avg_rps),
    avg_ms: nonNegative(s.avg_ms),
    p50_ms: nonNegative(s.p50_ms),
    p95_ms: nonNegative(s.p95_ms),
    p99_ms: nonNegative(s.p99_ms),
    navigations: nonNegative(s.navigations),
    navigation_errors: nonNegative(s.navigation_errors),
    avg_page_load_ms: nonNegative(s.avg_page_load_ms),
  };
}

export const stressTestCi = {
  async claim(input: any) {
    const run = await runFor(input.dispatch_id);
    const shard = shardOf(run, input.shard);
    if (TERMINAL.has(run.status)) {
      return { accepted: false, reason: `The run is already ${run.status}.`, run_no: run.run_no };
    }
    const now = new Date();
    if (run.status === 'QUEUED') {
      // Guarded, so two shards claiming in the same second both see ONE start.
      await StressRunModel.updateOne(
        { _id: run._id, status: 'QUEUED' },
        { $set: { status: 'RUNNING', started_at: now, last_report_at: now } }
      );
    }
    await StressRunModel.updateOne(
      { _id: run._id },
      { $set: { workflow_run_id: str(input.workflow_run_id, 40), workflow_run_url: str(input.workflow_run_url) } }
    );
    await appendEvent(run._id, 'INFO', `runner-${shard + 1}`, `Runner ${shard + 1} of ${run.profile.runners} claimed the run.`);
    const fresh = (await StressRunModel.findById(run._id)) as IStressRun;
    return {
      accepted: true,
      reason: '',
      run_no: fresh.run_no,
      // Handed over once per shard and never stored — see stressTest.traffic.
      traffic_key: trafficKeyFor(fresh.dispatch_id),
      profile: fresh.profile,
      target_mweb_url: fresh.target_mweb_url,
      target_graphql_url: fresh.target_graphql_url,
      // Every shard schedules its ramp from the FIRST claim, so a runner that
      // boots late joins the plan where it is instead of starting it again.
      started_at: (fresh.started_at ?? now).toISOString(),
    };
  },

  async report(input: any) {
    const run = await runFor(input.dispatch_id);
    const shard = shardOf(run, input.shard);
    if (TERMINAL.has(run.status)) return { stop: true, reason: `The run is already ${run.status}.` };
    noteShardReport(run._id.toHexString(), {
      shard,
      phase: str(input.phase, 40),
      elapsed_seconds: nonNegative(input.elapsed_seconds),
      active_vus: nonNegative(input.active_vus),
      active_bots: nonNegative(input.active_bots),
      window_seconds: nonNegative(input.window_seconds),
      requests: nonNegative(input.requests),
      errors: nonNegative(input.errors),
      p50_ms: nonNegative(input.p50_ms),
      p95_ms: nonNegative(input.p95_ms),
      p99_ms: nonNegative(input.p99_ms),
      navigations: nonNegative(input.navigations),
      page_load_ms: nonNegative(input.page_load_ms),
      status_counts: (Array.isArray(input.status_counts) ? input.status_counts : []).map((c: any) => ({
        code: str(c.code, 10),
        count: nonNegative(c.count),
      })),
      bots: botsOf(input),
      received_at: Date.now(),
    });
    await StressRunModel.updateOne({ _id: run._id }, { $set: { last_report_at: new Date() } });
    const events = Array.isArray(input.events) ? input.events.slice(0, MAX_EVENTS_PER_REPORT) : [];
    for (const event of events) {
      const level = LEVELS.has(event.level) ? event.level : 'INFO';
      await appendEvent(run._id, level, `runner-${shard + 1}`, str(event.message));
    }
    return { stop: run.status === 'STOPPING', reason: run.stop_reason ?? '' };
  },

  async finish(input: any) {
    const run = await runFor(input.dispatch_id);
    const shard = shardOf(run, input.shard);
    const outcome = ['COMPLETED', 'ABORTED', 'FAILED'].includes(input.outcome) ? input.outcome : 'FAILED';
    const result: IStressShardResult = {
      shard,
      outcome,
      error: str(input.error, 1000),
      summary: summaryOf(input.summary),
      endpoints: (Array.isArray(input.endpoints) ? input.endpoints.slice(0, 100) : []).map((e: any) => ({
        key: str(e.key, 80),
        requests: nonNegative(e.requests),
        errors: nonNegative(e.errors),
        avg_ms: nonNegative(e.avg_ms),
        p50_ms: nonNegative(e.p50_ms),
        p95_ms: nonNegative(e.p95_ms),
        p99_ms: nonNegative(e.p99_ms),
      })),
      at: new Date(),
    };
    // Two atomic operators rather than a rewrite: shards finish within the same
    // second, and a read-modify-write would drop whichever landed mid-flight.
    await StressRunModel.updateOne({ _id: run._id }, { $pull: { shard_results: { shard } } });
    await StressRunModel.updateOne({ _id: run._id }, { $push: { shard_results: result } });
    const detail = result.error ? ' — ' + result.error : '';
    await appendEvent(
      run._id,
      outcome === 'FAILED' ? 'ERROR' : 'INFO',
      `runner-${shard + 1}`,
      `Runner ${shard + 1} finished: ${outcome}${detail}.`
    );
    const fresh = (await StressRunModel.findById(run._id)) as IStressRun;
    if ((fresh.shard_results ?? []).length >= fresh.profile.runners) await finaliseRun(fresh);
    return true;
  },
};
