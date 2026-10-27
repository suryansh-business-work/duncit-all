import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  PhysicalGiftCardBatchModel,
  PhysicalGiftCardEventModel,
  PhysicalGiftCardModel,
  type IPhysicalGiftCard,
  type IPhysicalGiftCardBatch,
  type IPhysicalGiftCardEvent,
} from './physicalGiftCard.model';
import { formatPasscode } from './physicalGiftCard.codes';
import { physicalCardStatus } from './physicalGiftCard.service';
import { coinCreditRow } from '@modules/finance/giftcard/giftcard.admin.service';
import { CoinTransactionModel } from '@modules/finance/coin/coin.model';
import { loadUserMap, monthKeys, userNameOrDeleted, type UserInfo } from '@utils/admin-ledger';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

/**
 * Loyalty > Physical Gift Cards: the dashboard, the card book, the batches, the
 * history and the per-card detail. Kept apart from the service so the paths
 * that mint and redeem stay small. The only writes here are the audit lines a
 * passcode read leaves behind.
 */

/** No list ever reads the passcode — only the two audited calls below do. */
const NO_PASSCODE = { passcode: 0 } as const;

function notFound(what: string): never {
  throw new GraphQLError(`${what} not found`, { extensions: { code: 'NOT_FOUND' } });
}

const CARD_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['card_number', 'passcode_last4', 'void_reason'],
  sortFields: {
    card_number: 'card_number',
    coins: 'coins',
    status: 'status',
    expires_at: 'expires_at',
    redeemed_at: 'redeemed_at',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    card_number: { type: 'string' },
    coins: { type: 'number' },
    expires_at: { type: 'date' },
    redeemed_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const BATCH_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['label'],
  sortFields: {
    label: 'label',
    coins: 'coins',
    quantity: 'quantity',
    expires_at: 'expires_at',
    created_at: 'created_at',
  },
  filterFields: {
    label: { type: 'string' },
    coins: { type: 'number' },
    quantity: { type: 'number' },
    expires_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const EVENT_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['card_number', 'note'],
  sortFields: {
    created_at: 'created_at',
    type: 'type',
    card_number: 'card_number',
    coins: 'coins',
  },
  filterFields: {
    type: { type: 'enum' },
    card_number: { type: 'string' },
    coins: { type: 'number' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const iso = (d: Date | null | undefined) => d?.toISOString?.() ?? null;
const idOf = (id: Types.ObjectId | null | undefined) => (id ? String(id) : null);

type BatchInfo = Pick<IPhysicalGiftCardBatch, '_id' | 'label'>;

async function loadBatchMap(ids: Array<Types.ObjectId | null>): Promise<Map<string, BatchInfo>> {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (unique.length === 0) return new Map();
  const rows = await PhysicalGiftCardBatchModel.find({ _id: { $in: unique } })
    .select('label')
    .lean<BatchInfo[]>();
  return new Map(rows.map((b) => [String(b._id), b]));
}

const toCardRow = (
  card: IPhysicalGiftCard,
  users: Map<string, UserInfo>,
  batches: Map<string, BatchInfo>
) => {
  const person = (id: Types.ObjectId | null) => (id ? users.get(String(id)) : undefined);
  const assigned = person(card.assigned_user_id);
  const redeemer = person(card.redeemed_by_user_id);
  return {
    id: String(card._id),
    card_number: card.card_number,
    passcode_last4: card.passcode_last4,
    coins: card.coins,
    status: physicalCardStatus(card),
    batch_id: String(card.batch_id),
    batch_label: batches.get(String(card.batch_id))?.label ?? '',
    assigned_user_id: idOf(card.assigned_user_id),
    assigned_user_name: userNameOrDeleted(assigned, card.assigned_user_id),
    assigned_user_email: assigned?.email ?? '',
    redeemed_by_user_id: idOf(card.redeemed_by_user_id),
    redeemer_name: userNameOrDeleted(redeemer, card.redeemed_by_user_id),
    redeemer_email: redeemer?.email ?? '',
    redeemed_at: iso(card.redeemed_at),
    expires_at: iso(card.expires_at) ?? '',
    created_at: iso(card.created_at) ?? '',
    created_by_name: userNameOrDeleted(person(card.created_by), card.created_by),
    voided_at: iso(card.voided_at),
    voided_by_name: userNameOrDeleted(person(card.voided_by), card.voided_by),
    void_reason: card.void_reason ?? '',
  };
};

const cardPeople = (cards: IPhysicalGiftCard[]) =>
  cards.flatMap((c) =>
    [c.assigned_user_id, c.redeemed_by_user_id, c.created_by, c.voided_by].map((id) => idOf(id) ?? '')
  );

async function cardRows(cards: IPhysicalGiftCard[]) {
  const [users, batches] = await Promise.all([
    loadUserMap(cardPeople(cards)),
    loadBatchMap(cards.map((c) => c.batch_id)),
  ]);
  return cards.map((c) => toCardRow(c, users, batches));
}

const toEventRow = (
  e: IPhysicalGiftCardEvent,
  users: Map<string, UserInfo>,
  batches: Map<string, BatchInfo>
) => {
  const actor = users.get(String(e.actor_user_id));
  return {
    id: String(e._id),
    card_id: idOf(e.card_id),
    card_number: e.card_number,
    batch_id: idOf(e.batch_id),
    batch_label: e.batch_id ? (batches.get(String(e.batch_id))?.label ?? '') : '',
    type: e.type,
    coins: e.coins,
    note: e.note ?? '',
    actor_user_id: String(e.actor_user_id),
    actor_name: userNameOrDeleted(actor, e.actor_user_id),
    actor_email: actor?.email ?? '',
    created_at: iso(e.created_at) ?? '',
  };
};

async function eventRows(events: IPhysicalGiftCardEvent[]) {
  const [users, batches] = await Promise.all([
    loadUserMap(events.map((e) => String(e.actor_user_id))),
    loadBatchMap(events.map((e) => e.batch_id)),
  ]);
  return events.map((e) => toEventRow(e, users, batches));
}

/** Per batch: how many of its cards were redeemed and cancelled, and their coins. */
async function batchTallies(batchIds: Types.ObjectId[]) {
  if (batchIds.length === 0) return new Map<string, { redeemed: number; voided: number; redeemed_coins: number }>();
  const rows = await PhysicalGiftCardModel.aggregate<{
    _id: Types.ObjectId;
    redeemed: number;
    voided: number;
    redeemed_coins: number;
  }>([
    { $match: { batch_id: { $in: batchIds } } },
    {
      $group: {
        _id: '$batch_id',
        redeemed: { $sum: { $cond: [{ $eq: ['$status', 'REDEEMED'] }, 1, 0] } },
        voided: { $sum: { $cond: [{ $eq: ['$status', 'VOID'] }, 1, 0] } },
        redeemed_coins: { $sum: { $cond: [{ $eq: ['$status', 'REDEEMED'] }, '$coins', 0] } },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
}

export async function physicalBatchRows(batches: IPhysicalGiftCardBatch[]) {
  const [users, tallies] = await Promise.all([
    loadUserMap(batches.map((b) => String(b.created_by))),
    batchTallies(batches.map((b) => b._id)),
  ]);
  return batches.map((b) => {
    const creator = users.get(String(b.created_by));
    const tally = tallies.get(String(b._id));
    return {
      id: String(b._id),
      label: b.label,
      coins: b.coins,
      quantity: b.quantity,
      total_coins: b.coins * b.quantity,
      assigned: b.assigned,
      expires_at: iso(b.expires_at) ?? '',
      created_at: iso(b.created_at) ?? '',
      created_by_name: userNameOrDeleted(creator, b.created_by),
      created_by_email: creator?.email ?? '',
      redeemed_count: tally?.redeemed ?? 0,
      redeemed_coins: tally?.redeemed_coins ?? 0,
      voided_count: tally?.voided ?? 0,
    };
  });
}

/** The four places a printed coin can be, as `$group` field prefixes. */
type Bucket = 'redeemed' | 'voided' | 'outstanding' | 'expired';

/** `<bucket>_count` and `<bucket>_coins` accumulators for one bucket — a `$group`
 * field holds exactly one accumulator, so each bucket is two fields. */
const tally = (bucket: Bucket, match: Record<string, unknown>) => ({
  [`${bucket}_count`]: { $sum: { $cond: [match, 1, 0] } },
  [`${bucket}_coins`]: { $sum: { $cond: [match, '$coins', 0] } },
});

type StatsRow = Record<string, number | null>;

export const physicalGiftCardAdminService = {
  /**
   * The physical card position. Every coin ever printed is in exactly one
   * place — redeemed, still live, lapsed or cancelled — so generated =
   * redeemed + outstanding + expired + voided, and the tiles cannot disagree.
   */
  async stats(months?: number | null) {
    const span = Math.min(36, Math.max(1, Math.trunc(months ?? 12)));
    const keys = monthKeys(span);
    const from = new Date(`${keys[0]}-01T00:00:00.000Z`);
    const now = new Date();
    const live = { $and: [{ $eq: ['$status', 'ACTIVE'] }, { $gt: ['$expires_at', now] }] };
    const lapsed = { $and: [{ $eq: ['$status', 'ACTIVE'] }, { $lte: ['$expires_at', now] }] };

    const [cards, buckets, batchCount] = await Promise.all([
      PhysicalGiftCardModel.aggregate<StatsRow>([
        {
          $group: {
            _id: null,
            generated_count: { $sum: 1 },
            generated_coins: { $sum: '$coins' },
            ...tally('redeemed', { $eq: ['$status', 'REDEEMED'] }),
            ...tally('voided', { $eq: ['$status', 'VOID'] }),
            ...tally('outstanding', live),
            ...tally('expired', lapsed),
            mapped_count: { $sum: { $cond: [{ $ne: ['$assigned_user_id', null] }, 1, 0] } },
          },
        },
      ]),
      PhysicalGiftCardEventModel.aggregate([
        { $match: { created_at: { $gte: from }, type: { $in: ['GENERATED', 'REDEEMED'] } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$created_at', timezone: 'UTC' } },
            generated: { $sum: { $cond: [{ $eq: ['$type', 'GENERATED'] }, '$coins', 0] } },
            redeemed: { $sum: { $cond: [{ $eq: ['$type', 'REDEEMED'] }, '$coins', 0] } },
          },
        },
      ]),
      PhysicalGiftCardBatchModel.countDocuments(),
    ]);

    const row: StatsRow = cards[0] ?? {};
    const n = (field: string) => row[field] ?? 0;
    const byMonth = new Map<string, { generated: number; redeemed: number }>(
      buckets.map((b: { _id: string; generated?: number; redeemed?: number }) => [
        b._id,
        { generated: b.generated ?? 0, redeemed: b.redeemed ?? 0 },
      ])
    );
    return {
      generated_count: n('generated_count'),
      generated_coins: n('generated_coins'),
      redeemed_count: n('redeemed_count'),
      redeemed_coins: n('redeemed_coins'),
      outstanding_count: n('outstanding_count'),
      outstanding_coins: n('outstanding_coins'),
      expired_count: n('expired_count'),
      expired_coins: n('expired_coins'),
      voided_count: n('voided_count'),
      voided_coins: n('voided_coins'),
      mapped_count: n('mapped_count'),
      batch_count: batchCount,
      // Every month in the window, so a quiet month reads as a zero bar.
      monthly: keys.map((month) => ({
        month,
        generated: byMonth.get(month)?.generated ?? 0,
        redeemed: byMonth.get(month)?.redeemed ?? 0,
      })),
    };
  },

  /** One page of the card book, optionally one batch's cards. */
  async cardsTable(input?: TableQueryInput | null, batchId?: string | null) {
    const base = batchId && Types.ObjectId.isValid(batchId) ? { batch_id: new Types.ObjectId(batchId) } : {};
    const { docs, total, page, page_size } = await runTableQuery<IPhysicalGiftCard>(
      PhysicalGiftCardModel,
      base,
      input,
      CARD_TABLE_CONFIG,
      { projection: NO_PASSCODE }
    );
    return { rows: await cardRows(docs), total, page, page_size };
  },

  async batchesTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IPhysicalGiftCardBatch>(
      PhysicalGiftCardBatchModel,
      {},
      input,
      BATCH_TABLE_CONFIG
    );
    return { rows: await physicalBatchRows(docs), total, page, page_size };
  },

  async batch(id: string) {
    if (!Types.ObjectId.isValid(id)) notFound('Batch');
    const doc = await PhysicalGiftCardBatchModel.findById(id);
    if (!doc) notFound('Batch');
    const [row] = await physicalBatchRows([doc]);
    return row;
  },

  /** The whole history — every card minted, redeemed, tried, cancelled or read. */
  async eventsTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IPhysicalGiftCardEvent>(
      PhysicalGiftCardEventModel,
      {},
      input,
      EVENT_TABLE_CONFIG
    );
    return { rows: await eventRows(docs), total, page, page_size };
  },

  /** Everything about one card: the card, its batch, its history and the coin
   * credit its redemption wrote. */
  async detail(id: string) {
    if (!Types.ObjectId.isValid(id)) notFound('Gift card');
    const card = await PhysicalGiftCardModel.findById(id).select(NO_PASSCODE);
    if (!card) notFound('Gift card');
    const [[row], batch, events, credit] = await Promise.all([
      cardRows([card]),
      PhysicalGiftCardBatchModel.findById(card.batch_id),
      PhysicalGiftCardEventModel.find({ card_id: card._id }).sort({ created_at: -1, _id: -1 }).limit(200),
      CoinTransactionModel.findOne({ gift_card_id: String(card._id), source: 'GIFT_CARD_REDEEM' }),
    ]);
    return {
      card: row,
      batch: batch ? (await physicalBatchRows([batch]))[0] : null,
      events: await eventRows(events),
      coin_credit: credit ? coinCreditRow(credit) : null,
    };
  },

  /** One card's passcode, for a reprint or a member on the phone. Every read is
   * written to the card's history with who asked. */
  async revealPasscode(id: string, actorId: string): Promise<string> {
    if (!Types.ObjectId.isValid(id)) notFound('Gift card');
    const card = await PhysicalGiftCardModel.findById(id);
    if (!card) notFound('Gift card');
    await PhysicalGiftCardEventModel.create({
      card_id: card._id,
      card_number: card.card_number,
      batch_id: card.batch_id,
      type: 'PASSCODE_VIEWED',
      actor_user_id: new Types.ObjectId(actorId),
      coins: 0,
      note: '',
    });
    return formatPasscode(card.passcode);
  },

  /** Every card of a batch with its passcode — the print file. One history line
   * records the export. */
  async batchPasscodes(batchId: string, actorId: string) {
    if (!Types.ObjectId.isValid(batchId)) notFound('Batch');
    const batch = await PhysicalGiftCardBatchModel.findById(batchId).select('label');
    if (!batch) notFound('Batch');
    const cards = await PhysicalGiftCardModel.find({ batch_id: batchId }).sort({ card_number: 1 });
    const users = await loadUserMap(cards.map((c) => idOf(c.assigned_user_id) ?? ''));
    await PhysicalGiftCardEventModel.create({
      card_id: null,
      card_number: '',
      batch_id: new Types.ObjectId(batchId),
      type: 'PASSCODES_EXPORTED',
      actor_user_id: new Types.ObjectId(actorId),
      coins: 0,
      note: `${cards.length} cards`,
    });
    return cards.map((c) => {
      const assigned = c.assigned_user_id ? users.get(String(c.assigned_user_id)) : undefined;
      return {
        card_number: c.card_number,
        passcode: formatPasscode(c.passcode),
        coins: c.coins,
        status: physicalCardStatus(c),
        assigned_user_name: userNameOrDeleted(assigned, c.assigned_user_id),
        assigned_user_email: assigned?.email ?? '',
        expires_at: iso(c.expires_at) ?? '',
      };
    });
  },

  async cardRow(card: IPhysicalGiftCard) {
    const [row] = await cardRows([card]);
    return row;
  },
};
