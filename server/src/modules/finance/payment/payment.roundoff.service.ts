/**
 * The read behind Finance › Round Offs: every payment whose bill was rounded up
 * to a whole rupee, with what the rounding added.
 *
 * The round-off is a first-class field on the payment (`round_off`), so this is
 * a plain filtered table over payments — the base filter is `round_off > 0`,
 * fixed here, and a client filter can only narrow it.
 *
 * `source` is the one filter that is not a stored column: it is the checkout
 * that created the payment, derived by the rule in payment.source.ts. It is
 * lifted out of the client's filters and turned into that rule's Mongo filter,
 * so the table, its count and the totals strip all use the same match.
 *
 * The totals are a server aggregate over EVERY matching payment — never a sum
 * of the page on screen.
 */
import { PaymentModel, type IPayment } from './payment.model';
import { roundOffOf } from './payment.roundoff';
import { parsePaymentSources, paymentSourceOf, paymentSourcesFilter } from './payment.source';
import {
  buildTableFilter,
  combineFilters,
  runTableQuery,
  type TableEntityConfig,
  type TableFilterInput,
  type TableQueryInput,
} from '@utils/table-query';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A payment appears here only when rounding added something to it. */
const HAS_ROUND_OFF = { round_off: { $gt: 0 } };

/** The derived filter's field name, as the table sends it. */
const SOURCE_FIELD = 'source';

/**
 * Allowlists for the shared table engine (paymentRoundOffsTable — DUNCIT TABLE
 * CONTRACT v1). `source` and `bill_amount` are derived, so neither is here:
 * `source` is handled before the engine sees the filters, and `bill_amount`
 * (total + coins − round-off) has no stored path to sort or match on.
 */
const ROUND_OFF_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['payment_id', 'invoice_no', 'user_name', 'user_email'],
  sortFields: {
    created_at: 'created_at',
    paid_at: 'paid_at',
    payment_id: 'payment_id',
    invoice_no: 'invoice_no',
    user_name: 'user_name',
    round_off: 'round_off',
    total: 'total',
    coins_redeemed: 'coins_redeemed',
    status: 'status',
  },
  filterFields: {
    status: { type: 'enum' },
    created_at: { type: 'date' },
    paid_at: { type: 'date' },
    round_off: { type: 'number' },
    total: { type: 'number' },
    coins_redeemed: { type: 'number' },
    user_name: { type: 'string' },
    payment_id: { type: 'string' },
  },
  defaultSort: { created_at: -1 },
};

/** The values a `source` filter asked for, whichever operator carried them. */
const sourceValues = (filter: TableFilterInput): (string | null | undefined)[] =>
  filter.op === 'in' ? (filter.values ?? []) : [filter.value];

/** Split the client's query into the source rule and everything the engine handles. */
function splitSourceFilter(input?: TableQueryInput | null) {
  const filters = input?.filters ?? [];
  const asked = filters.filter((f) => f.field === SOURCE_FIELD).flatMap(sourceValues);
  return {
    base: combineFilters(HAS_ROUND_OFF, paymentSourcesFilter(parsePaymentSources(asked))),
    query: { ...input, filters: filters.filter((f) => f.field !== SOURCE_FIELD) },
  };
}

const toRoundOffRow = (p: IPayment) => {
  const roundOff = roundOffOf(p);
  const coins = Math.max(0, Math.floor(p.coins_redeemed ?? 0));
  return {
    id: String(p._id),
    payment_id: p.payment_id,
    invoice_no: p.invoice_no ?? null,
    user_name: p.user_name,
    user_email: p.user_email,
    description: p.description,
    source: paymentSourceOf(p),
    // The bill as it stood before rounding: what was charged plus the coins
    // spent on it, less what rounding added (payment.roundoff.ts identity).
    bill_amount: round2(p.total + coins - roundOff),
    round_off: roundOff,
    coins_redeemed: coins,
    total: p.total,
    currency_symbol: p.currency_symbol,
    status: p.status,
    gateway: p.gateway,
    paid_at: p.paid_at ? p.paid_at.toISOString() : null,
    created_at: p.created_at.toISOString(),
  };
};

/** Round-off that reached Duncit as money: the payment succeeded and something was charged. */
const COLLECTED = { $and: [{ $eq: ['$status', 'SUCCESS'] }, { $gt: ['$total', 0] }] };

async function summaryFor(filter: Record<string, unknown>) {
  const [row] = await PaymentModel.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        round_off_total: { $sum: '$round_off' },
        collected_round_off_total: { $sum: { $cond: [COLLECTED, '$round_off', 0] } },
      },
    },
  ]);
  return {
    count: row?.count ?? 0,
    round_off_total: round2(row?.round_off_total ?? 0),
    collected_round_off_total: round2(row?.collected_round_off_total ?? 0),
  };
}

export const paymentRoundOffService = {
  /** Server-side table page plus filter-wide totals for paymentRoundOffsTable. */
  async table(input?: TableQueryInput | null) {
    const { base, query } = splitSourceFilter(input);
    const [{ docs, total, page, page_size }, summary] = await Promise.all([
      runTableQuery<IPayment>(PaymentModel, base, query, ROUND_OFF_TABLE_CONFIG),
      // The exact filter the page was read with — one match for rows, count and totals.
      summaryFor(combineFilters(base, buildTableFilter(query, ROUND_OFF_TABLE_CONFIG))),
    ]);
    return { rows: docs.map(toRoundOffRow), total, page, page_size, summary };
  },
};
