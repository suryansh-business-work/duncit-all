import { AsyncLocalStorage } from 'node:async_hooks';
import { isValidObjectId } from 'mongoose';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  EMAIL_LOG_HTML_LIMIT,
  EmailLogModel,
  type EmailLogSource,
  type EmailLogStatus,
} from './emailLog.model';

/**
 * The email log — one row per attempt, sent or not.
 *
 * Writing it must never be able to lose an email, so every write here is
 * best-effort and swallowed. A missing log row is a gap in a report; a thrown
 * logger is a customer who did not get their receipt.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const EMAIL_LOG_TABLE_CONFIG: TableEntityConfig = {
  // `bcc` is searched too, and it is not a nicety: a campaign goes out as one
  // message per 50-recipient batch, addressed to the sending mailbox with the
  // audience in bcc. Without it, "did this person get the campaign?" — the
  // question the log exists to answer — has no answer for any bulk send.
  searchFields: ['to', 'bcc', 'subject', 'template', 'reason', 'message_id'],
  sortFields: {
    to: 'to',
    subject: 'subject',
    template: 'template',
    category: 'category',
    status: 'status',
    provider: 'provider',
    source: 'source',
    duration_ms: 'duration_ms',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    category: { type: 'enum' },
    source: { type: 'enum' },
    provider: { type: 'string' },
    template: { type: 'string' },
    to: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/**
 * Which surface caused the send, for the length of one request.
 *
 * Threading a `source` argument through every one of the forty call sites
 * would be forty chances to forget it, and a background job has no call site to
 * thread it from. The context sets this once per request instead, and any send
 * that happens inside that request picks it up; anything outside one is the
 * server acting on its own, which is exactly what SERVER means.
 */
const surfaceStore = new AsyncLocalStorage<{ source: EmailLogSource; detail: string }>();

/** Run `fn` with every email inside it attributed to this surface. */
export function withEmailSource<T>(
  surface: { source: EmailLogSource; detail: string },
  fn: () => T
): T {
  return surfaceStore.run(surface, fn);
}

/** The surface currently in scope, or the server itself. */
export function currentEmailSource(): { source: EmailLogSource; detail: string } {
  return surfaceStore.getStore() ?? { source: 'SERVER', detail: '' };
}

/**
 * Map a browser Origin onto a surface.
 *
 * The origin is already on every request from a browser or the native web
 * build, and it maps exactly onto the surfaces an operator filters by. A native
 * BUILD (the store app) sends no origin, so it reads as SERVER unless it sends
 * one — which is honest: we do not know, and guessing would be worse.
 */
export function surfaceFromOrigin(origin?: string | null): {
  source: EmailLogSource;
  detail: string;
} {
  if (!origin) return { source: 'SERVER', detail: '' };
  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return { source: 'SERVER', detail: '' };
  }

  // The bare apex and the www host are the marketing website; everything else
  // is a named subdomain.
  const sub = host.replace(/^www\./, '').replace(/\.duncit\.com$/, '');
  if (sub === host && !host.endsWith('duncit.com')) {
    // localhost and preview hosts — keep the host so it is still traceable.
    return { source: 'SERVER', detail: host };
  }
  if (sub === 'duncit.com' || sub === host) return { source: 'WEBSITE', detail: host };
  if (sub.startsWith('native')) return { source: 'NATIVE', detail: host };
  if (sub.startsWith('mweb')) return { source: 'MWEB', detail: host };
  if (['website', 'ads', 'earnwith', 'partners', 'status', 'legal'].some((s) => sub.startsWith(s))) {
    // partners-app is the PORTAL; partners is the marketing site.
    if (sub.startsWith('partners-app')) return { source: 'PORTAL', detail: sub };
    return { source: 'WEBSITE', detail: sub };
  }
  if (sub === 'crm') return { source: 'CRM', detail: sub };
  return { source: 'PORTAL', detail: sub };
}

export interface EmailLogEntry {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  template?: string;
  fragment_key?: string | null;
  category?: string;
  status: EmailLogStatus;
  reason?: string;
  provider?: string;
  message_id?: string;
  duration_ms?: number;
  /** Overrides the request's surface — used by the CRM and by test sends. */
  source?: EmailLogSource;
  source_detail?: string;
  /** The rendered body, for the row's preview. Truncated past the cap. */
  html?: string;
  /** The variables it rendered with. */
  vars?: Record<string, string>;
}

/**
 * A body big enough to read, small enough to store thousands of.
 *
 * The marker is left inside the HTML on purpose: the preview shows the email
 * cut off rather than looking complete when it is not.
 */
function cappedHtml(html?: string): string {
  if (!html) return '';
  if (html.length <= EMAIL_LOG_HTML_LIMIT) return html;
  return `${html.slice(0, EMAIL_LOG_HTML_LIMIT)}\n<!-- truncated: the body was ${html.length} characters -->`;
}

/** One row as the API returns it. Without the body — see `byId` for that. */
const pub = (doc: any) => ({
  id: String(doc._id),
  to: doc.to,
  cc: doc.cc ?? [],
  bcc: doc.bcc ?? [],
  subject: doc.subject,
  template: doc.template,
  fragment_key: doc.fragment_key,
  category: doc.category,
  status: doc.status,
  reason: doc.reason,
  provider: doc.provider,
  message_id: doc.message_id,
  source: doc.source,
  source_detail: doc.source_detail,
  duration_ms: doc.duration_ms,
  created_at: doc.created_at?.toISOString() ?? null,
});

/**
 * The window the dashboard reads, never the number the client sent.
 *
 * An unbounded range turns every panel into a full-collection scan on a table
 * that grows by one row per email, so it is clamped the same way the telemetry
 * dashboard clamps its own.
 */
function clampRange(input?: number | null): number {
  const n = Math.floor(Number(input));
  if (!Number.isFinite(n) || n < 1) return 7;
  return Math.min(90, n);
}

/**
 * WHICH PEOPLE one row was addressed to — and, counted, how many. Not the same
 * number as how many rows there are.
 *
 * A campaign goes out as one message per batch, addressed TO the sending
 * mailbox with the audience in bcc. So when bcc is non-empty, adding the `to`
 * count would both inflate the audience and file the sender as a member of it;
 * the bcc list is the whole audience of that row. Otherwise `to` is the
 * `', '`-joined string `record()` writes, which is why that separator — and not
 * a comma — is what the count splits on.
 *
 * Exported because it is the rule this dashboard stands on, and a rule worth
 * stating is worth being able to test. Both the headline count and the
 * repeat-failure list read it, so neither can drift from the other.
 */
export const ADDRESSES_PER_ROW = {
  $let: {
    vars: {
      bcc_list: { $ifNull: ['$bcc', []] },
      to_s: { $trim: { input: { $ifNull: ['$to', ''] } } },
    },
    in: {
      $cond: [
        { $gt: [{ $size: '$$bcc_list' }, 0] },
        '$$bcc_list',
        { $cond: [{ $eq: ['$$to_s', ''] }, [], { $split: ['$$to_s', ', '] }] },
      ],
    },
  },
};

/** How many of them there were. The same rule, counted. */
export const RECIPIENTS_PER_ROW = { $size: ADDRESSES_PER_ROW };

const REASON = { $ifNull: ['$reason', ''] };

/**
 * One `$switch` branch, built in one place so `then` is written once.
 *
 * `then` on an object literal reads to a linter as a hand-rolled thenable —
 * something `await` would run. It is MongoDB's keyword on a document the driver
 * serializes into a pipeline, and nothing ever awaits it.
 */
const branch = (match: unknown, label: string) => ({ case: match, then: label }); // NOSONAR

/**
 * The free-text reason folded into fixed buckets.
 *
 * Three of the shapes `email.service.ts` writes interpolate a template slug or
 * an address list, and the catch-all is a raw exception message — so the raw
 * field has near-unbounded cardinality, and grouping on it draws hundreds of
 * bars of size one. These are the shapes that actually exist.
 */
const REASON_BUCKETS = {
  $switch: {
    branches: [
      branch({ $eq: [REASON, 'No recipient address'] }, 'No recipient address'),
      branch({ $eq: [REASON, 'No message body'] }, 'No message body'),
      branch({ $regexMatch: { input: REASON, regex: /is not active$/ } }, 'Template disabled'),
      branch({ $regexMatch: { input: REASON, regex: /does not exist$/ } }, 'Template missing'),
      branch(
        { $regexMatch: { input: REASON, regex: /^Refused by the mail server/ } },
        'Mail server refused'
      ),
      branch(
        { $regexMatch: { input: REASON, regex: /^Resend rejected the email/ } },
        'Provider rejected'
      ),
    ],
    default: 'Render or transport error',
  },
};

/** Everything that did not go out in the window, counted by one grouping key. */
async function notDeliveredBuckets(
  since: Date,
  groupBy: unknown,
  limit = 0
): Promise<Array<{ key: string; count: number }>> {
  const rows = await EmailLogModel.aggregate<{ _id: string | null; count: number }>([
    { $match: { created_at: { $gte: since }, status: { $ne: 'SENT' } } },
    { $group: { _id: groupBy, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    ...(limit > 0 ? [{ $limit: limit }] : []),
  ]);
  return rows.map((r) => ({ key: r._id ?? '', count: r.count }));
}

/**
 * Addresses that failed more than once inside the window.
 *
 * There is no bounce feed anywhere in this product, so an address that keeps
 * failing is the only hard-bounce proxy that exists — and the only list an
 * operator can act on by hand.
 */
async function repeatFailures(since: Date) {
  const rows = await EmailLogModel.aggregate<{
    _id: string | null;
    failures: number;
    last_reason: string | null;
    last_failed_at: Date | null;
  }>([
    { $match: { created_at: { $gte: since }, status: 'FAILED' } },
    // Sorted before the group so `$first` is genuinely the most recent attempt.
    { $sort: { created_at: -1 } },
    // Grouped on the ADDRESSES the row went to, not on `to`. On a campaign batch
    // `to` is the sending mailbox, so grouping on it would put our own address at
    // the top of a list of people who cannot receive mail — and hide the fifty
    // who actually could not.
    { $addFields: { address: ADDRESSES_PER_ROW } },
    { $unwind: '$address' },
    {
      $group: {
        _id: '$address',
        failures: { $sum: 1 },
        last_reason: { $first: '$reason' },
        last_failed_at: { $first: '$created_at' },
      },
    },
    { $match: { failures: { $gte: 2 } } },
    { $sort: { failures: -1 } },
    { $limit: 10 },
  ]);
  return rows.map((r) => ({
    address: r._id ?? '',
    failures: r.failures,
    last_reason: r.last_reason ?? '',
    last_failed_at: r.last_failed_at?.toISOString() ?? null,
  }));
}

export const emailLogService = {
  /** Record one attempt. Never throws; a lost log line is not worth a lost email. */
  async record(entry: EmailLogEntry): Promise<void> {
    try {
      const surface = currentEmailSource();
      await EmailLogModel.create({
        to: Array.isArray(entry.to) ? entry.to.join(', ') : entry.to,
        cc: entry.cc ?? [],
        bcc: entry.bcc ?? [],
        subject: entry.subject,
        template: entry.template ?? '',
        fragment_key: entry.fragment_key ?? null,
        category: entry.category ?? 'transactional',
        status: entry.status,
        reason: entry.reason ?? '',
        provider: entry.provider ?? '',
        message_id: entry.message_id ?? '',
        source: entry.source ?? surface.source,
        source_detail: entry.source_detail ?? surface.detail,
        duration_ms: entry.duration_ms ?? 0,
        html: cappedHtml(entry.html),
        vars: entry.vars ? JSON.stringify(entry.vars) : '',
      });
    } catch (error) {
      logs.server.warn('emailLog', 'record', { error, subject: entry.subject });
    }
  },

  /** Server-side table page for the emailLogsTable query. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery(
      EmailLogModel,
      {},
      input,
      EMAIL_LOG_TABLE_CONFIG
    );
    return {
      rows: docs.map(pub),
      total,
      page,
      page_size,
    };
  },

  /**
   * One row WITH its body and variables — what the drawer opens.
   *
   * Separate from the table on purpose: the body is the heavy field, and a
   * page of rows carries twenty-five of them nobody asked to see.
   */
  async byId(id: string) {
    if (!isValidObjectId(id)) return null;
    const doc: any = await EmailLogModel.findById(id).lean();
    if (!doc) return null;
    return { ...pub(doc), html: doc.html ?? '', vars: doc.vars ?? '' };
  },

  /** Headline counts for the page's summary strip. */
  async stats(days = 7) {
    const since = new Date(Date.now() - days * DAY_MS);
    const [rows, all_time_total] = await Promise.all([
      EmailLogModel.aggregate([
        { $match: { created_at: { $gte: since } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Collection metadata, so it costs nothing on a table that only grows.
      // It exists to give the delete-everything warning a sense of scale, and
      // the mutation reports the exact figure once it has run — an approximate
      // number is the right precision for "are you sure?".
      EmailLogModel.estimatedDocumentCount(),
    ]);
    const by = new Map(rows.map((r: any) => [r._id, r.count as number]));
    const sent = by.get('SENT') ?? 0;
    const skipped = by.get('SKIPPED') ?? 0;
    const failed = by.get('FAILED') ?? 0;
    return { days, sent, skipped, failed, total: sent + skipped + failed, all_time_total };
  },

  /**
   * What the log says about deliverability over a window.
   *
   * Small independent aggregations run together rather than one `$facet`: each
   * reads the same `created_at` index, and there is no `$facet` anywhere in this
   * server to be consistent with.
   */
  async dashboard(rangeDays?: number | null) {
    const days = clampRange(rangeDays);
    const since = new Date(Date.now() - days * DAY_MS);
    const match = { created_at: { $gte: since } };
    const [
      totals,
      byStatus,
      partially_refused,
      silently_discarded,
      not_delivered_reasons,
      not_delivered_templates,
      repeat_failures,
    ] = await Promise.all([
      EmailLogModel.aggregate<{ attempts: number; recipients: number }>([
        { $match: match },
        {
          $group: { _id: null, attempts: { $sum: 1 }, recipients: { $sum: RECIPIENTS_PER_ROW } },
        },
      ]),
      EmailLogModel.aggregate<{ _id: string; count: number }>([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Accepted by the mail server, with someone in the batch refused — the
      // row reads SENT and somebody still did not get it.
      EmailLogModel.countDocuments({ ...match, status: 'SENT', reason: { $nin: ['', null] } }),
      // With no provider entry configured, `email.service.ts` falls back to a
      // nodemailer json transport that accepts the message and throws it away:
      // nothing is rejected, so every row reads SENT. A sub-5ms handover is the
      // only measurable signature of that — no real mail server answers that
      // fast. TEST sends are excluded because they use it deliberately.
      EmailLogModel.countDocuments({
        ...match,
        status: 'SENT',
        source: { $ne: 'TEST' },
        duration_ms: { $lt: 5 },
      }),
      notDeliveredBuckets(since, REASON_BUCKETS),
      // The empty slug is a raw-HTML send; the portal is what names it.
      notDeliveredBuckets(since, '$template', 8),
      repeatFailures(since),
    ]);
    const by = new Map(byStatus.map((r) => [r._id, r.count]));
    return {
      range_days: days,
      attempts: totals[0]?.attempts ?? 0,
      recipients: totals[0]?.recipients ?? 0,
      sent: by.get('SENT') ?? 0,
      skipped: by.get('SKIPPED') ?? 0,
      failed: by.get('FAILED') ?? 0,
      partially_refused,
      silently_discarded,
      not_delivered_reasons,
      not_delivered_templates,
      repeat_failures,
    };
  },

  /**
   * Delete the rows an operator ticked.
   *
   * A malformed id is dropped rather than thrown on: the ids come from a table
   * selection, and one bad value should not cost the operator the other
   * twenty-four deletions they asked for.
   */
  async deleteByIds(ids: string[], actor: { id: string }): Promise<number> {
    if (ids.length === 0) return 0;
    const valid = ids.filter((id) => isValidObjectId(id));
    logs.server.warn('emailLog', 'deleteMany', { userId: actor.id, requested: valid.length });
    const res = await EmailLogModel.deleteMany({ _id: { $in: valid } });
    return res.deletedCount ?? 0;
  },

  /**
   * Clear the whole log.
   *
   * The warning is written before the delete and at `warn`, which the telemetry
   * runtime persists — so the record of who emptied the log lands in
   * TelemetryLog and outlives the rows it is about.
   */
  async deleteAll(actor: { id: string }): Promise<number> {
    logs.server.warn('emailLog', 'deleteAll', { userId: actor.id });
    const res = await EmailLogModel.deleteMany({});
    return res.deletedCount ?? 0;
  },
};
