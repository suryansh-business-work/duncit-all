import { Types } from 'mongoose';
import {
  GiftCardModel,
  GiftCardTransactionModel,
  type IGiftCard,
  type IGiftCardTransaction,
} from './giftcard.model';
import { giftCardPub } from './giftcard.service';
import { giftCardSettingsService } from './giftcard.settings.service';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import {
  loadUserMap,
  monthKeys,
  userNameOrDeleted,
  type UserInfo,
} from '@utils/admin-ledger';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

/**
 * Platform-wide reads over the gift card book for Finance > Gift Cards. Kept
 * apart from giftcard.service.ts so the money path stays a small file with one
 * job. Nothing here writes.
 */

/** Sums `amount` only for ledger rows of one type — the shape both aggregates use. */
const sumOfType = (type: 'ISSUE' | 'REDEEM') => ({
  $sum: { $cond: [{ $eq: ['$type', type] }, '$amount', 0] },
});

/** Allowlists for the shared table engine (giftCardsTable — DUNCIT TABLE
 * CONTRACT v1). Only fields that physically exist on the card belong here:
 * buyer/redeemer names are joined AFTER the page is fetched. */
const GIFT_CARD_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['code', 'recipient_email', 'recipient_name', 'payment_id', 'scope_name'],
  sortFields: {
    code: 'code',
    scope_type: 'scope_type',
    scope_name: 'scope_name',
    initial_amount: 'initial_amount',
    balance: 'balance',
    status: 'status',
    expires_at: 'expires_at',
    created_at: 'created_at',
  },
  filterFields: {
    scope_type: { type: 'enum' },
    status: { type: 'enum' },
    initial_amount: { type: 'number' },
    expires_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/** Allowlists for the ledger table (giftCardTransactionsTable). */
const GIFT_CARD_TXN_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['code', 'payment_id'],
  sortFields: {
    created_at: 'created_at',
    amount: 'amount',
    type: 'type',
    source: 'source',
    code: 'code',
  },
  filterFields: {
    type: { type: 'enum' },
    source: { type: 'enum' },
    amount: { type: 'number' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const toCardRow = (card: IGiftCard, users: Map<string, UserInfo>) => {
  const purchaser = users.get(String(card.purchaser_user_id));
  const redeemer = card.redeemed_by_user_id ? users.get(String(card.redeemed_by_user_id)) : undefined;
  return {
    ...giftCardPub(card),
    purchaser_name: userNameOrDeleted(purchaser, card.purchaser_user_id),
    purchaser_email: purchaser?.email ?? '',
    redeemer_name: userNameOrDeleted(redeemer, card.redeemed_by_user_id),
    redeemer_email: redeemer?.email ?? '',
    payment_id: card.payment_id,
  };
};

const toTxnRow = (t: IGiftCardTransaction, users: Map<string, UserInfo>) => {
  const user = users.get(String(t.user_id));
  return {
    id: String(t._id),
    gift_card_id: String(t.gift_card_id),
    code: t.code,
    user_id: String(t.user_id),
    user_name: userNameOrDeleted(user, t.user_id),
    user_email: user?.email ?? '',
    type: t.type,
    amount: t.amount,
    balance_after: t.balance_after,
    source: t.source,
    payment_id: t.payment_id ?? null,
    created_at: t.created_at?.toISOString?.() ?? '',
  };
};

export const giftCardAdminService = {
  /**
   * The platform gift card position. Sold and converted are read from the
   * ledger — the insert-only source of truth — and outstanding is the balance
   * still sitting on live unexpired cards; expired value is the breakage that
   * will never convert. Outstanding + expired + converted = sold, so the
   * headline numbers can never disagree with each other.
   */
  async stats(months?: number | null) {
    const span = Math.min(36, Math.max(1, Math.trunc(months ?? 12)));
    const keys = monthKeys(span);
    const from = new Date(`${keys[0]}-01T00:00:00.000Z`);
    const now = new Date();

    const [totals, buckets, cardAggregate, settings, finance] = await Promise.all([
      GiftCardTransactionModel.aggregate([
        {
          $group: {
            _id: null,
            sold_value: sumOfType('ISSUE'),
            redeemed_value: sumOfType('REDEEM'),
            sold_count: { $sum: { $cond: [{ $eq: ['$type', 'ISSUE'] }, 1, 0] } },
            redeemed_count: { $sum: { $cond: [{ $eq: ['$type', 'REDEEM'] }, 1, 0] } },
          },
        },
      ]),
      GiftCardTransactionModel.aggregate([
        { $match: { created_at: { $gte: from } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$created_at', timezone: 'UTC' } },
            sold: sumOfType('ISSUE'),
            redeemed: sumOfType('REDEEM'),
          },
        },
      ]),
      GiftCardModel.aggregate([
        { $match: { status: 'ACTIVE' } },
        {
          $group: {
            _id: null,
            outstanding: {
              $sum: { $cond: [{ $gt: ['$expires_at', now] }, '$balance', 0] },
            },
            expired: {
              $sum: { $cond: [{ $lte: ['$expires_at', now] }, '$balance', 0] },
            },
          },
        },
      ]),
      giftCardSettingsService.get(),
      getFinanceSettings(),
    ]);

    const byMonth = new Map<string, { sold: number; redeemed: number }>(
      buckets.map((b: any) => [b._id as string, { sold: b.sold ?? 0, redeemed: b.redeemed ?? 0 }])
    );

    return {
      sold_count: totals[0]?.sold_count ?? 0,
      sold_value: totals[0]?.sold_value ?? 0,
      redeemed_count: totals[0]?.redeemed_count ?? 0,
      redeemed_value: totals[0]?.redeemed_value ?? 0,
      outstanding_value: cardAggregate[0]?.outstanding ?? 0,
      expired_value: cardAggregate[0]?.expired ?? 0,
      validity_months: settings.validity_months,
      currency_symbol: finance.currency_symbol,
      // Every month in the window is emitted, so a quiet month reads as a zero
      // bar rather than vanishing and compressing the timeline.
      monthly: keys.map((month) => ({
        month,
        sold: byMonth.get(month)?.sold ?? 0,
        redeemed: byMonth.get(month)?.redeemed ?? 0,
      })),
    };
  },

  /** One page of the card book, each row carrying who bought and who redeemed. */
  async cardsTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IGiftCard>(
      GiftCardModel,
      {},
      input,
      GIFT_CARD_TABLE_CONFIG
    );
    const users = await loadUserMap(
      docs.flatMap((d) => [
        String(d.purchaser_user_id),
        d.redeemed_by_user_id ? String(d.redeemed_by_user_id) : '',
      ])
    );
    return { rows: docs.map((d) => toCardRow(d, users)), total, page, page_size };
  },

  /** One page of the gift card ledger — every issue and every conversion. */
  async transactionsTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IGiftCardTransaction>(
      GiftCardTransactionModel,
      {},
      input,
      GIFT_CARD_TXN_TABLE_CONFIG
    );
    const users = await loadUserMap(docs.map((d) => String(d.user_id)));
    return { rows: docs.map((d) => toTxnRow(d, users)), total, page, page_size };
  },
};
