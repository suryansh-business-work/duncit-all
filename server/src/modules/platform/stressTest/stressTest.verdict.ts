import os from 'node:os';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import type { AuthUser } from '@context';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { openAiGraphQLError, openAiInvalidJsonError } from '@services/openai/openai.errors';
import {
  LIVE_STATUSES,
  StressRunModel,
  StressSampleModel,
  type IStressRun,
  type IStressSample,
  type IStressVerdict,
  type IStressVerdictItem,
  type StressLevel,
  type StressVerdictGrade,
} from './stressTest.model';
import { appendEvent, pubRun, settingsDoc } from './stressTest.records';

/**
 * The verdict on a finished run: OpenAI reads what the run measured and says
 * how many people this setup holds, what to upgrade and what to watch.
 *
 * The model only ever sees numbers the run recorded — the plan, the totals, the
 * slowest pages and queries, a condensed time series and the host's size — so
 * its answer can be checked against the charts on the same page. Both prompt
 * turns live in the AI Library (`stress.verdict`), so an operator retunes the
 * reading there, never in code.
 */

/** The time series is folded to this many points — enough to find the knee, few enough tokens. */
const SERIES_POINTS = 40;
const MAX_ENDPOINTS = 25;
const MAX_CONTAINERS = 8;
const MAX_ITEMS = 8;

const GRADES = new Set<StressVerdictGrade>(['HEALTHY', 'STRAINED', 'OVERLOADED', 'INCONCLUSIVE']);
const LEVELS = new Set<StressLevel>(['LOW', 'MEDIUM', 'HIGH']);

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

const maxOf = (rows: IStressSample[], pick: (s: IStressSample) => number) =>
  rows.reduce((acc, s) => Math.max(acc, pick(s) ?? 0), 0);
const avgOf = (rows: IStressSample[], pick: (s: IStressSample) => number) =>
  rows.length === 0 ? 0 : Math.round((rows.reduce((acc, s) => acc + (pick(s) ?? 0), 0) / rows.length) * 10) / 10;

/** Every sample folded into at most SERIES_POINTS windows — the worst reading of each window. */
function condensedSeries(samples: IStressSample[], startedAt: Date | null) {
  const size = Math.max(1, Math.ceil(samples.length / SERIES_POINTS));
  const start = (startedAt ?? samples[0]?.at ?? new Date()).getTime();
  const points = [];
  for (let i = 0; i < samples.length; i += size) {
    const rows = samples.slice(i, i + size);
    points.push({
      t_seconds: Math.round((rows[0].at.getTime() - start) / 1000),
      virtual_users: maxOf(rows, (s) => s.load.active_vus),
      browser_bots: maxOf(rows, (s) => s.load.active_bots),
      bot_rps: avgOf(rows, (s) => s.load.rps),
      server_rps_total: avgOf(rows, (s) => s.server.rps_total),
      p95_ms: maxOf(rows, (s) => s.load.p95_ms),
      error_rate_pct: maxOf(rows, (s) => s.load.error_rate_pct),
      host_cpu_pct: maxOf(rows, (s) => s.server.host_cpu_pct),
      host_memory_pct: maxOf(rows, (s) => s.server.host_memory_pct),
      event_loop_lag_ms: maxOf(rows, (s) => s.server.event_loop_lag_ms),
      server_p95_ms: maxOf(rows, (s) => s.server.server_p95_ms),
      api_rss_mb: maxOf(rows, (s) => s.server.rss_mb),
      real_people: maxOf(rows, (s) => s.server.real_users + s.server.visitors),
    });
  }
  return points;
}

/** Each container's worst reading across the run, busiest first. */
function containerPeaks(samples: IStressSample[]) {
  const peaks = new Map<string, { name: string; peak_cpu_pct: number; peak_memory_mb: number; peak_memory_pct: number }>();
  for (const c of samples.flatMap((s) => s.containers ?? [])) {
    const row = peaks.get(c.name) ?? { name: c.name, peak_cpu_pct: 0, peak_memory_mb: 0, peak_memory_pct: 0 };
    row.peak_cpu_pct = Math.max(row.peak_cpu_pct, c.cpu_pct);
    row.peak_memory_mb = Math.max(row.peak_memory_mb, c.memory_mb);
    row.peak_memory_pct = Math.max(row.peak_memory_pct, c.memory_pct);
    peaks.set(c.name, row);
  }
  const rows = [...peaks.values()];
  rows.sort((a, b) => b.peak_cpu_pct - a.peak_cpu_pct);
  return rows.slice(0, MAX_CONTAINERS);
}

async function runData(run: IStressRun) {
  const [samples, settings] = await Promise.all([
    StressSampleModel.find({ run_id: run._id }).sort({ at: 1 }).lean<IStressSample[]>(),
    settingsDoc(),
  ]);
  const pub = pubRun(run);
  return {
    run: { run_no: pub.run_no, status: pub.status, environment: pub.environment, duration_seconds: pub.duration_seconds },
    ended_because: pub.stop_reason || pub.error_message || 'completed its plan',
    host: { cpu_cores: os.cpus().length, total_memory_gb: Math.round(os.totalmem() / 1_073_741_824) },
    plan: pub.profile,
    guardrails: {
      abort_error_rate_pct: settings.abort_error_rate_pct,
      abort_p95_ms: settings.abort_p95_ms,
      abort_host_cpu_pct: settings.abort_host_cpu_pct,
      abort_host_memory_pct: settings.abort_host_memory_pct,
    },
    peaks: pub.peaks,
    summary: pub.summary,
    slowest_endpoints: pub.endpoints.slice(0, MAX_ENDPOINTS),
    time_series: condensedSeries(samples, run.started_at),
    containers: containerPeaks(samples),
  };
}

const text = (v: unknown, max = 600) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const count = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : 0);
const level = (v: unknown): StressLevel => (LEVELS.has(v as StressLevel) ? (v as StressLevel) : 'MEDIUM');

function items(v: unknown): IStressVerdictItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, MAX_ITEMS)
    .map((item) => ({ title: text(item?.title, 120), detail: text(item?.detail), level: level(item?.level) }))
    .filter((item) => item.title);
}

/** The model's JSON, held to the shape the portal renders — anything missing becomes empty, never invented. */
function parseVerdict(raw: string): Omit<IStressVerdict, 'model' | 'generated_by' | 'generated_at'> {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw openAiInvalidJsonError();
  }
  const grade = GRADES.has(parsed.grade as StressVerdictGrade) ? (parsed.grade as StressVerdictGrade) : 'INCONCLUSIVE';
  return {
    grade,
    headline: text(parsed.headline, 200),
    safe_concurrent_users: count(parsed.safe_concurrent_users),
    breaking_point_users: count(parsed.breaking_point_users),
    confidence: level(parsed.confidence),
    capacity_reasoning: text(parsed.capacity_reasoning, 2000),
    bottlenecks: items(parsed.bottlenecks),
    upgrades: items(parsed.upgrades),
    watch_points: Array.isArray(parsed.watch_points)
      ? parsed.watch_points.slice(0, MAX_ITEMS).map((w) => text(w, 300)).filter(Boolean)
      : [],
  };
}

/** Ask OpenAI for the verdict on a finished run and keep it on the run. Asking again replaces it. */
export async function generateStressVerdict(id: string, user: AuthUser) {
  const run = await StressRunModel.findById(id);
  if (!run) throw badInput('That stress run no longer exists.');
  if (LIVE_STATUSES.includes(run.status)) throw badInput('Wait for the run to end before asking for a verdict.');
  if (!run.started_at) throw badInput('This run never generated load, so there is nothing to judge.');

  const data = JSON.stringify(await runData(run));
  const [system, userTurn] = await Promise.all([
    resolvePrompt('stress.verdict'),
    resolvePrompt('stress.verdict.user', { run_data: data }),
  ]);
  const res = await openaiChat({
    task: 'platform.stress_verdict',
    detail: run.run_no,
    model: system.model,
    temperature: 0.2,
    json: true,
    user_id: user.id,
    messages: [
      { role: 'system', content: system.content },
      { role: 'user', content: userTurn.content },
    ],
  });
  if (!res.ok) throw openAiGraphQLError(res);

  const verdict: IStressVerdict = {
    ...parseVerdict(res.content),
    model: res.model,
    generated_by: user.email ?? user.id,
    generated_at: new Date(),
  };
  await StressRunModel.updateOne({ _id: run._id }, { $set: { verdict } });
  await appendEvent(run._id, 'INFO', 'portal', `AI verdict generated by ${verdict.generated_by}: ${verdict.grade}.`);
  logs.server.info('stressTest', 'verdict', { run_no: run.run_no, grade: verdict.grade, model: res.model });
  return pubRun((await StressRunModel.findById(id)) as IStressRun);
}
