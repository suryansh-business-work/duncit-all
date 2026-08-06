import { AsyncLocalStorage } from 'node:async_hooks';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { EmailLogModel, type EmailLogSource, type EmailLogStatus } from './emailLog.model';

/**
 * The email log — one row per attempt, sent or not.
 *
 * Writing it must never be able to lose an email, so every write here is
 * best-effort and swallowed. A missing log row is a gap in a report; a thrown
 * logger is a customer who did not get their receipt.
 */

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
      rows: docs.map((doc: any) => ({
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
      })),
      total,
      page,
      page_size,
    };
  },

  /** Headline counts for the page's summary strip. */
  async stats(days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await EmailLogModel.aggregate([
      { $match: { created_at: { $gte: since } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const by = new Map(rows.map((r: any) => [r._id, r.count as number]));
    const sent = by.get('SENT') ?? 0;
    const skipped = by.get('SKIPPED') ?? 0;
    const failed = by.get('FAILED') ?? 0;
    return { days, sent, skipped, failed, total: sent + skipped + failed };
  },
};
