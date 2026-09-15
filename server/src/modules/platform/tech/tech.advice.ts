import { logs } from '@observability/log';
import { getStatusEnvironment } from '@observability/statusServices';
import type { AuthUser } from '@context';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { openAiGraphQLError, openAiInvalidJsonError } from '@services/openai/openai.errors';
import { graphqlMonitorService } from '../graphqlMonitor/graphqlMonitor.service';
import { techService } from './tech.service';
import { serverHistory } from './tech.history.service';
import {
  SERVER_HISTORY_DAYS,
  ServerAdviceModel,
  type IServerAdvice,
  type IServerAdviceDay,
  type IServerAdviceItem,
  type ServerAdviceGrade,
  type ServerAdviceLevel,
} from './tech.history.model';

/**
 * The recommendation on Tech > Server > Info: OpenAI reads the host's size, a
 * month of per-day readings, the heaviest containers and the slowest GraphQL
 * operations, and says what to improve on the server and why.
 *
 * The model only sees numbers this server recorded, so every recommendation
 * can be checked against the charts on the same page. Both prompt turns live
 * in the AI Library (`tech.server_advice`) — an operator retunes the reading
 * there, never in code. Asked on demand only, and the answer is kept, so
 * opening the page costs nothing.
 */

const GB = 1_073_741_824;
const MAX_ITEMS = 8;
const MAX_OPERATIONS = 10;
/** An operation called fewer times than this over the month says nothing about its p95. */
const MIN_OPERATION_REQUESTS = 20;

const GRADES = new Set<ServerAdviceGrade>(['HEALTHY', 'WATCH', 'ACTION_NEEDED', 'INCONCLUSIVE']);
const LEVELS = new Set<ServerAdviceLevel>(['LOW', 'MEDIUM', 'HIGH']);

const gb = (bytes: number | null | undefined) => (bytes == null ? null : Math.round((bytes / GB) * 10) / 10);

async function graphqlLoad() {
  const operations = (await graphqlMonitorService.operations('LAST_30_DAYS')).filter(
    (op) => op.requests >= MIN_OPERATION_REQUESTS
  );
  const pick = ({ name, type, requests, p95_ms, avg_ms, error_rate_pct }: (typeof operations)[number]) => ({
    name,
    type,
    requests,
    p95_ms,
    avg_ms,
    error_rate_pct,
  });
  const slowest = [...operations];
  slowest.sort((a, b) => b.p95_ms - a.p95_ms);
  const heaviest = [...operations];
  heaviest.sort((a, b) => b.avg_ms * b.requests - a.avg_ms * a.requests);
  return {
    slowest_by_p95: slowest.slice(0, MAX_OPERATIONS).map(pick),
    most_total_time: heaviest.slice(0, MAX_OPERATIONS).map(pick),
  };
}

async function serverData(sslHost?: string) {
  const [info, docker, history, graphql] = await Promise.all([
    techService.serverInfo(sslHost),
    techService.dockerInfo(),
    serverHistory(SERVER_HISTORY_DAYS),
    graphqlLoad(),
  ]);
  const { diskGrowthBytesPerDay, ...month } = history.summary;
  return {
    environment: getStatusEnvironment(),
    time_zone: history.timeZone,
    host: {
      os: `${info.os.distro} ${info.os.release}`,
      arch: info.os.arch,
      node_version: info.os.nodeVersion,
      cpu_model: info.cpu.model,
      cpu_cores: info.cpu.cores,
      memory_total_gb: gb(info.memory.totalBytes),
      swap_total_gb: gb(info.swap.totalBytes),
      disk_total_gb: gb(info.disk.totalBytes),
      kernel_uptime_days: Math.round(info.os.kernelUptimeSeconds / 86_400),
    },
    right_now: {
      cpu_pct: info.cpu.usagePercent,
      load_avg_1_5_15: [info.cpu.loadAvg1, info.cpu.loadAvg5, info.cpu.loadAvg15],
      memory_pct: info.memory.usagePercent,
      swap_pct: info.swap.usagePercent,
      disk_pct: info.disk.usagePercent,
      disk_free_gb: gb(info.disk.freeBytes),
      inode_pct: info.disk.inodeUsagePercent,
      ssl_days_remaining: info.ssl?.daysRemaining ?? null,
    },
    docker: {
      available: docker.available,
      running: docker.containersRunning,
      total: docker.containersTotal,
      not_running: docker.containers.filter((c) => c.state !== 'running').map((c) => `${c.name} (${c.status})`),
    },
    month: { ...month, disk_growth_gb_per_day: gb(diskGrowthBytesPerDay) },
    days: history.days.map((d) => ({
      date: d.date,
      samples: d.samples,
      cpu_avg_pct: d.cpuAvgPct,
      cpu_peak_pct: d.cpuPeakPct,
      load_avg_5: d.loadAvg,
      memory_avg_pct: d.memoryAvgPct,
      memory_peak_pct: d.memoryPeakPct,
      swap_peak_pct: d.swapPeakPct,
      disk_pct: d.diskPct,
      disk_used_gb: gb(d.diskUsedBytes),
      requests: d.requests,
      errors_5xx: d.errors5xx,
      api_latency_avg_ms: d.latencyAvgMs,
      api_latency_p95_ms: d.latencyP95Ms,
      worst_5min_p95_ms: d.latencyPeakMs,
      health_probe_ms: d.probeLatencyMs,
      uptime_pct: d.uptimePct,
      event_loop_p99_peak_ms: d.eventLoopP99PeakMs,
      api_rss_peak_mb: d.rssPeakMb,
    })),
    containers: history.containers,
    graphql_operations_30d: graphql,
  };
}

const text = (v: unknown, max = 800) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const level = (v: unknown): ServerAdviceLevel => (LEVELS.has(v as ServerAdviceLevel) ? (v as ServerAdviceLevel) : 'MEDIUM');
const list = (v: unknown): Array<Record<string, unknown>> =>
  Array.isArray(v) ? v.slice(0, MAX_ITEMS).map((row) => (row && typeof row === 'object' ? row : {})) : [];

function items(v: unknown): IServerAdviceItem[] {
  return list(v)
    .map((row) => ({ title: text(row.title, 140), detail: text(row.detail, 1200), level: level(row.level) }))
    .filter((item) => item.title);
}

function days(v: unknown): IServerAdviceDay[] {
  return list(v)
    .map((row) => ({ date: text(row.date, 10), note: text(row.note, 400) }))
    .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.date) && day.note);
}

/** The model's JSON, held to the shape the portal renders — anything missing becomes empty, never invented. */
function parseAdvice(raw: string) {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw openAiInvalidJsonError();
  }
  const grade = GRADES.has(parsed.grade as ServerAdviceGrade) ? (parsed.grade as ServerAdviceGrade) : 'INCONCLUSIVE';
  return {
    grade,
    headline: text(parsed.headline, 200),
    summary: text(parsed.summary, 2500),
    trends: items(parsed.trends),
    recommendations: items(parsed.recommendations),
    notable_days: days(parsed.notable_days),
    watch_points: Array.isArray(parsed.watch_points)
      ? parsed.watch_points.slice(0, MAX_ITEMS).map((w) => text(w, 300)).filter(Boolean)
      : [],
  };
}

function pubAdvice(doc: IServerAdvice | null) {
  if (!doc) return null;
  return {
    id: String(doc._id),
    grade: doc.grade,
    headline: doc.headline,
    summary: doc.summary,
    trends: doc.trends,
    recommendations: doc.recommendations,
    notableDays: doc.notable_days,
    watchPoints: doc.watch_points,
    periodDays: doc.period_days,
    daysWithData: doc.days_with_data,
    model: doc.model,
    generatedBy: doc.generated_by,
    generatedAt: doc.generated_at.toISOString(),
  };
}

/** The newest recommendation, or null before anyone asked for one. */
export async function latestServerAdvice() {
  return pubAdvice(await ServerAdviceModel.findOne().sort({ generated_at: -1 }).lean<IServerAdvice>());
}

/** Ask OpenAI to read the month and recommend what to improve. Each ask is kept; the page shows the newest. */
export async function generateServerAdvice(user: AuthUser, sslHost?: string) {
  const data = await serverData(sslHost);
  const [system, userTurn] = await Promise.all([
    resolvePrompt('tech.server_advice'),
    resolvePrompt('tech.server_advice.user', { server_data: JSON.stringify(data) }),
  ]);
  const res = await openaiChat({
    task: 'platform.server_advice',
    detail: data.environment,
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

  const created = await ServerAdviceModel.create({
    ...parseAdvice(res.content),
    period_days: SERVER_HISTORY_DAYS,
    days_with_data: data.month.daysWithData,
    model: res.model,
    generated_by: user.email ?? user.id,
    generated_at: new Date(),
  });
  logs.server.info('tech', 'serverAdvice', { grade: created.grade, model: res.model, userId: user.id });
  return pubAdvice(created.toObject<IServerAdvice>());
}
