import type { Model, PipelineStage } from 'mongoose';
import { TelemetryLogModel } from '@modules/platform/telemetry/telemetry.model';
import { RateLimitEventModel } from '@modules/platform/rateLimit/rateLimit.model';
import { RATE_LIMIT_MODES } from '@modules/platform/rateLimit/rateLimit.types';
import { OpenAiUsageLogModel } from '@modules/ai/openaiUsage/openaiUsage.model';
import { MediaScanLogModel, MONITORING_STATUSES } from '@modules/ai/aiMonitoring/aiMonitoring.model';
import { EMAIL_LOG_STATUSES, EmailLogModel } from '@modules/content/emailLog/emailLog.model';
import { WA_MESSAGE_STATUSES, WaMessageLogModel } from '@modules/platform/whatsapp/waMessageLog.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { GiftCardTransactionModel } from '@modules/finance/giftcard/giftcard.model';
import { CoinTransactionModel } from '@modules/finance/coin/coin.model';
import {
  POLICY_ACCEPTANCE_METHODS,
  PolicyAcceptanceModel,
} from '@modules/content/policyAcceptance/policyAcceptance.model';
import { POD_AUDIT_RISKS, PodAuditLogModel } from '@modules/pods/podAudit/podAudit.model';
import { dayKeyExpr, inRange, type AnalyticsWindow } from './window';
import { countOf, splitPeriod, type PeriodDayKey, type PeriodTotals } from './aggregates';

/**
 * Everything the Logs dashboard reads: every log the Logs console lists, each
 * counted from the collection its own page reads, so a number here and the
 * rows behind it agree.
 *
 * MSG91's one-time-code log is deliberately absent — MSG91 keeps it, Duncit
 * stores none of it, and its API caps a read at 31 days.
 */

export type LogSourceKey =
  | 'telemetry'
  | 'rate_limit'
  | 'openai'
  | 'ai_monitoring'
  | 'email'
  | 'whatsapp'
  | 'payment'
  | 'refund'
  | 'gift_card'
  | 'coin'
  | 'policy'
  | 'pod_audit';

export interface LogSource {
  key: LogSourceKey;
  model: Model<any>;
  /** The field a row is dated by. */
  field: string;
  /** True when that field holds ISO text, not a Date — a refund's stamp is written as a string. */
  isoText?: boolean;
  /** The field holding each row's outcome (a status, a level, a verdict). */
  status: string;
  /** Every outcome, in the order its breakdown shows them. */
  statuses: readonly string[];
  /** Outcomes that mean something went wrong. None for a ledger, where no row is a failure. */
  problems?: readonly string[];
  /** Whether more rows is good news — more error logs or blocked requests is not. */
  higherIsBetter: boolean;
  /** The Logs console page listing these rows. */
  path: string;
}

/** The logs, in the Logs console's sidebar order. */
export const LOG_SOURCES: readonly LogSource[] = [
  {
    key: 'telemetry',
    model: TelemetryLogModel,
    field: 'created_at',
    status: 'level',
    statuses: ['error', 'warn', 'info', 'debug'],
    problems: ['error'],
    higherIsBetter: false,
    path: '/telemetry/logs',
  },
  {
    key: 'rate_limit',
    model: RateLimitEventModel,
    field: 'created_at',
    status: 'mode',
    statuses: RATE_LIMIT_MODES,
    higherIsBetter: false,
    path: '/rate-limiting/blocked',
  },
  {
    key: 'openai',
    model: OpenAiUsageLogModel,
    field: 'created_at',
    status: 'status',
    statuses: ['SUCCESS', 'FAILED', 'SKIPPED'],
    problems: ['FAILED'],
    higherIsBetter: true,
    path: '/openai/logs',
  },
  {
    key: 'ai_monitoring',
    model: MediaScanLogModel,
    field: 'created_at',
    status: 'status',
    statuses: MONITORING_STATUSES,
    problems: ['FAILED'],
    higherIsBetter: true,
    path: '/monitoring',
  },
  {
    key: 'email',
    model: EmailLogModel,
    field: 'created_at',
    status: 'status',
    statuses: EMAIL_LOG_STATUSES,
    problems: ['FAILED'],
    higherIsBetter: true,
    path: '/emails/logs',
  },
  {
    key: 'whatsapp',
    model: WaMessageLogModel,
    field: 'created_at',
    status: 'status',
    statuses: WA_MESSAGE_STATUSES,
    problems: ['FAILED'],
    higherIsBetter: true,
    path: '/whatsapp/logs',
  },
  {
    key: 'payment',
    model: PaymentModel,
    field: 'created_at',
    status: 'status',
    statuses: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
    problems: ['FAILED'],
    higherIsBetter: true,
    path: '/payment-logs',
  },
  {
    // A refund is a payment carrying a refund stamp; a partial one leaves the payment SUCCESS.
    key: 'refund',
    model: PaymentModel,
    field: 'metadata.refunded_at',
    isoText: true,
    status: 'status',
    statuses: ['REFUNDED', 'SUCCESS'],
    higherIsBetter: false,
    path: '/user-refund-logs',
  },
  {
    key: 'gift_card',
    model: GiftCardTransactionModel,
    field: 'created_at',
    status: 'type',
    statuses: ['ISSUE', 'REDEEM'],
    higherIsBetter: true,
    path: '/gift-cards/logs',
  },
  {
    key: 'coin',
    model: CoinTransactionModel,
    field: 'created_at',
    status: 'type',
    statuses: ['CREDIT', 'DEBIT'],
    higherIsBetter: true,
    path: '/duncit-coin/transactions',
  },
  {
    key: 'policy',
    model: PolicyAcceptanceModel,
    field: 'accepted_at',
    status: 'method',
    statuses: POLICY_ACCEPTANCE_METHODS,
    higherIsBetter: true,
    path: '/policy-acceptance-logs',
  },
  {
    key: 'pod_audit',
    model: PodAuditLogModel,
    field: 'created_at',
    status: 'ai_risk',
    statuses: POD_AUDIT_RISKS,
    problems: ['HIGH'],
    higherIsBetter: true,
    path: '/pod-monitoring',
  },
];

interface LogDayRow {
  _id: PeriodDayKey & { status: string | null };
  value: number;
}

/** One log's period in numbers: every row, the rows that went wrong, and this period's outcomes. */
export interface LogFigures {
  source: LogSource;
  entries: PeriodTotals;
  problems: PeriodTotals;
  /** Rows in the chosen period, per outcome. */
  statuses: Map<string, number>;
}

/** A `$match` range on the source's date field — as Dates, or as the ISO text a refund stamp is. */
function rangeOf(source: LogSource, from: Date, to: Date) {
  if (source.isoText) return { $gte: from.toISOString(), $lt: to.toISOString() };
  return inRange(from, to);
}

/** Rows in either period, counted per day, per period and per outcome — one read per log. */
function pipelineOf(source: LogSource, window: AnalyticsWindow): PipelineStage[] {
  const { field } = source;
  return [
    {
      $match: {
        $or: [
          { [field]: rangeOf(source, window.from, window.to) },
          { [field]: rangeOf(source, window.prevFrom, window.prevTo) },
        ],
      },
    },
    // A no-op on a Date; turns a refund's ISO stamp into one so both are grouped alike.
    { $addFields: { logged_at: { $toDate: `$${field}` } } },
    {
      $group: {
        _id: {
          day: dayKeyExpr('logged_at', window.zone),
          current: { $gte: ['$logged_at', window.from] },
          status: `$${source.status}`,
        },
        value: { $sum: 1 },
      },
    },
  ];
}

function figuresOf(source: LogSource, rows: readonly LogDayRow[], window: AnalyticsWindow): LogFigures {
  const problems = new Set(source.problems ?? []);
  const statuses = new Map<string, number>();
  for (const row of rows) {
    if (!row._id.current) continue;
    const status = String(row._id.status);
    statuses.set(status, (statuses.get(status) ?? 0) + row.value);
  }
  return {
    source,
    entries: splitPeriod(rows, window, countOf),
    problems: splitPeriod(
      rows.filter((row) => problems.has(String(row._id.status))),
      window,
      countOf
    ),
    statuses,
  };
}

/** Every log's figures for the chosen period and the one it is compared with. */
export function loadLogFigures(window: AnalyticsWindow): Promise<LogFigures[]> {
  return Promise.all(
    LOG_SOURCES.map(async (source) => {
      const rows = await source.model.aggregate<LogDayRow>(pipelineOf(source, window));
      return figuresOf(source, rows, window);
    })
  );
}
