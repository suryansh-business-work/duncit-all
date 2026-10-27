import { GraphQLError } from 'graphql';
import { Types, type ClientSession } from 'mongoose';
import {
  PhysicalGiftCardBatchModel,
  PhysicalGiftCardEventModel,
  PhysicalGiftCardModel,
  type IPhysicalGiftCard,
  type IPhysicalGiftCardBatch,
} from './physicalGiftCard.model';
import {
  cardExpiryFor,
  generateCardNumber,
  generatePasscode,
  normalizeCardNumber,
  normalizePasscode,
  passcodeMatches,
} from './physicalGiftCard.codes';
import { giftCardSettingsService } from '@modules/finance/giftcard/giftcard.settings.service';
import { coinService } from '@modules/finance/coin/coin.service';
import { UserModel } from '@modules/access/user/user.model';
import { withTransaction } from '@utils/mongoTransaction';
import { logs } from '@observability/log';

/** Mongo's duplicate-key error — a unique index rejecting a repeat. */
const DUPLICATE_KEY = 11000;

/** Cards minted in one run. A print order is a few hundred cards; a bigger run
 * is split so one transaction never holds thousands of writes. */
export const MAX_CARDS_PER_BATCH = 500;

/** Wrong tries a member gets inside the window before redeeming is paused for
 * them. A 16-digit passcode cannot be guessed, but card numbers can be walked,
 * and every try is a probe for which numbers exist. */
const FAILED_TRY_LIMIT = 10;
const FAILED_TRY_WINDOW_MS = 60 * 60_000;

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

/**
 * Why a redemption was refused, carried on the error as `extensions.reason` so
 * the apps can say it in the member's language — the message is the English
 * fallback for every other reader.
 */
export type PhysicalRedeemRefusal =
  | 'INVALID_FORMAT'
  | 'MISMATCH'
  | 'LOCKED'
  | 'VOID'
  | 'OTHER_ACCOUNT'
  | 'ALREADY_REDEEMED'
  | 'EXPIRED';

function refuse(reason: PhysicalRedeemRefusal, message: string): never {
  const code = reason === 'LOCKED' ? 'TOO_MANY_REQUESTS' : 'BAD_USER_INPUT';
  throw new GraphQLError(message, { extensions: { code, reason } });
}

const REFUSAL_MESSAGES: Record<PhysicalRedeemRefusal, string> = {
  INVALID_FORMAT: 'Enter the 9-digit card number and the 16-digit passcode',
  MISMATCH: 'That card number and passcode do not match',
  LOCKED: 'Too many wrong tries. Please wait an hour and try again.',
  VOID: 'This gift card has been cancelled',
  OTHER_ACCOUNT: 'This gift card is mapped to a different Duncit account',
  ALREADY_REDEEMED: 'This gift card has already been redeemed',
  EXPIRED: 'This gift card has expired',
};

function refuseWith(reason: PhysicalRedeemRefusal): never {
  return refuse(reason, REFUSAL_MESSAGES[reason]);
}

export const isPhysicalCardExpired = (card: Pick<IPhysicalGiftCard, 'expires_at'>) =>
  card.expires_at.getTime() <= Date.now();

/** What the row shows: REDEEMED and VOID are stored, a lapsed ACTIVE card reads EXPIRED. */
export const physicalCardStatus = (
  card: Pick<IPhysicalGiftCard, 'status' | 'expires_at'>
): 'ACTIVE' | 'REDEEMED' | 'VOID' | 'EXPIRED' => {
  if (card.status !== 'ACTIVE') return card.status;
  return isPhysicalCardExpired(card) ? 'EXPIRED' : 'ACTIVE';
};

/** The member-facing view of a card — never the passcode. */
export const physicalCardPub = (card: IPhysicalGiftCard) => ({
  id: String(card._id),
  card_number: card.card_number,
  coins: card.coins,
  status: physicalCardStatus(card),
  redeemed_at: card.redeemed_at?.toISOString?.() ?? null,
  expires_at: card.expires_at?.toISOString?.() ?? '',
});

/**
 * `count` card numbers nobody holds yet. The 9-digit space is ~900 million, so a
 * collision is rare — but a printed duplicate is a card that pays out twice,
 * so the check is real, and the unique index still has the last word when two
 * generations race.
 */
async function freshCardNumbers(count: number, session?: ClientSession): Promise<string[]> {
  const chosen = new Set<string>();
  while (chosen.size < count) {
    const wanted = count - chosen.size;
    const candidates = new Set<string>();
    while (candidates.size < wanted) {
      const n = generateCardNumber();
      if (!chosen.has(n)) candidates.add(n);
    }
    const taken = await PhysicalGiftCardModel.find({ card_number: { $in: [...candidates] } })
      .select('card_number')
      .session(session ?? null)
      .lean();
    const takenSet = new Set(taken.map((t) => t.card_number));
    for (const n of candidates) if (!takenSet.has(n)) chosen.add(n);
  }
  return [...chosen];
}

/** Record a wrong try, so the history shows it and the next try can be refused. */
async function recordFailedTry(opts: {
  userId: Types.ObjectId;
  cardNumber: string;
  card: IPhysicalGiftCard | null;
}): Promise<void> {
  await PhysicalGiftCardEventModel.create({
    card_id: opts.card?._id ?? null,
    card_number: opts.cardNumber,
    batch_id: opts.card?.batch_id ?? null,
    type: 'REDEEM_FAILED',
    actor_user_id: opts.userId,
    coins: 0,
    note: 'Card number and passcode did not match',
  });
}

async function assertNotLockedOut(userId: Types.ObjectId): Promise<void> {
  const since = new Date(Date.now() - FAILED_TRY_WINDOW_MS);
  const tries = await PhysicalGiftCardEventModel.countDocuments({
    actor_user_id: userId,
    type: 'REDEEM_FAILED',
    created_at: { $gte: since },
  });
  if (tries >= FAILED_TRY_LIMIT) refuseWith('LOCKED');
}

/** Why a card whose passcode matched still cannot pay this member. Null when it can. */
function refusalFor(card: IPhysicalGiftCard, userId: Types.ObjectId): PhysicalRedeemRefusal | null {
  if (card.status === 'VOID') return 'VOID';
  if (card.assigned_user_id && !card.assigned_user_id.equals(userId)) return 'OTHER_ACCOUNT';
  if (card.status === 'REDEEMED' && !card.redeemed_by_user_id?.equals(userId)) {
    return 'ALREADY_REDEEMED';
  }
  if (card.status === 'ACTIVE' && isPhysicalCardExpired(card)) return 'EXPIRED';
  return null;
}

export interface GeneratePhysicalGiftCardsOptions {
  adminId: string;
  label: string;
  coins: number;
  /** How many unmapped cards to mint. Ignored when `userIds` is given. */
  quantity?: number | null;
  /** One mapped card per member. */
  userIds?: string[] | null;
  /** 'YYYY-MM-DD' in the app time zone; empty means the gift card validity. */
  expiresOn?: string | null;
}

export const physicalGiftCardService = {
  /**
   * Mint one batch of printed cards — the batch, every card and its GENERATED
   * history line land together or not at all. Each card carries the same
   * coins; a mapped batch makes one card per chosen member.
   */
  async generate(opts: GeneratePhysicalGiftCardsOptions): Promise<IPhysicalGiftCardBatch> {
    const label = (opts.label ?? '').trim();
    if (!label) badInput('Give the batch a name — it is how the history finds it');
    if (!Types.ObjectId.isValid(opts.adminId)) badInput('Sign in again to generate cards');

    // A card is worth what a virtual card may be worth: one sales policy, read live.
    const settings = await giftCardSettingsService.get();
    const coins = Math.floor(Number(opts.coins) || 0);
    if (coins < 1 || coins > settings.max_amount) {
      badInput(`Each card carries between 1 and ${settings.max_amount} coins`);
    }

    const userIds = [...new Set((opts.userIds ?? []).map(String).filter(Boolean))];
    const mapped = userIds.length > 0;
    const quantity = mapped ? userIds.length : Math.floor(Number(opts.quantity) || 0);
    if (quantity < 1 || quantity > MAX_CARDS_PER_BATCH) {
      badInput(`Generate between 1 and ${MAX_CARDS_PER_BATCH} cards at a time`);
    }
    if (mapped) {
      if (userIds.some((id) => !Types.ObjectId.isValid(id))) badInput('Choose members from the list');
      const found = await UserModel.countDocuments({ _id: { $in: userIds } });
      if (found !== userIds.length) badInput('One of the chosen members no longer exists');
    }

    const expiresAt = cardExpiryFor(opts.expiresOn, settings.validity_months);
    if (!expiresAt) badInput('Choose a valid expiry date');
    if (expiresAt.getTime() <= Date.now()) badInput('The expiry date must be in the future');

    const adminId = new Types.ObjectId(opts.adminId);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const batch = await withTransaction(async (session) => {
          const [created] = await PhysicalGiftCardBatchModel.create(
            [{ label, coins, quantity, assigned: mapped, expires_at: expiresAt, created_by: adminId }],
            { session }
          );
          const numbers = await freshCardNumbers(quantity, session);
          const cards = await PhysicalGiftCardModel.insertMany(
            numbers.map((cardNumber, i) => {
              const passcode = generatePasscode();
              return {
                card_number: cardNumber,
                passcode,
                passcode_last4: passcode.slice(-4),
                coins,
                status: 'ACTIVE',
                batch_id: created._id,
                assigned_user_id: mapped ? new Types.ObjectId(userIds[i]) : null,
                expires_at: expiresAt,
                created_by: adminId,
              };
            }),
            { session }
          );
          await PhysicalGiftCardEventModel.insertMany(
            cards.map((card) => ({
              card_id: card._id,
              card_number: card.card_number,
              batch_id: created._id,
              type: 'GENERATED',
              actor_user_id: adminId,
              coins,
              note: label,
            })),
            { session }
          );
          return created;
        });
        logs.server.info('physicalGiftCard', 'generate', {
          msg: 'Physical gift cards generated',
          batch_id: String(batch._id),
          quantity,
          coins,
          assigned: mapped,
          admin_id: opts.adminId,
        });
        return batch;
      } catch (e) {
        // Two generations raced to the same card number: the transaction rolled
        // back whole, so a clean re-run picks fresh numbers.
        if ((e as { code?: number })?.code !== DUPLICATE_KEY) throw e;
      }
    }
    throw new GraphQLError('The cards could not be generated. Please try again.', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  },

  /**
   * Turn a printed card into Duncit Coins for the caller.
   *
   * A wrong number and a wrong passcode answer with the SAME message, so a
   * guess never learns which card numbers exist; only once the passcode is
   * proven does the answer say why a card cannot pay out. The winner is picked
   * by one guarded update, and the coin credit is idempotent per card — a retry
   * after a crash between the two writes lands the credit it missed.
   */
  async redeem(cardNumberInput: string, passcodeInput: string, userId: string) {
    const cardNumber = normalizeCardNumber(cardNumberInput);
    const passcode = normalizePasscode(passcodeInput);
    if (!cardNumber || !passcode) refuseWith('INVALID_FORMAT');
    if (!Types.ObjectId.isValid(userId)) badInput('Sign in again to redeem this card');
    const uid = new Types.ObjectId(userId);
    await assertNotLockedOut(uid);

    const found = await PhysicalGiftCardModel.findOne({ card_number: cardNumber });
    if (!found || !passcodeMatches(found.passcode, passcode)) {
      await recordFailedTry({ userId: uid, cardNumber, card: found });
      refuseWith('MISMATCH');
    }
    const refusal = refusalFor(found, uid);
    if (refusal) refuseWith(refusal);

    const won = await PhysicalGiftCardModel.findOneAndUpdate(
      {
        _id: found._id,
        status: 'ACTIVE',
        expires_at: { $gt: new Date() },
        $or: [{ assigned_user_id: null }, { assigned_user_id: uid }],
      },
      {
        $set: {
          status: 'REDEEMED',
          redeemed_by_user_id: uid,
          redeemed_at: new Date(),
          // A bulk card belongs to whoever redeemed it — that IS the mapping.
          assigned_user_id: found.assigned_user_id ?? uid,
        },
      },
      { new: true }
    );
    // Lost a race to another holder, or this member already redeemed it (the
    // refusal check let that through so an interrupted credit can heal).
    const card = won ?? (await PhysicalGiftCardModel.findById(found._id));
    if (!card || !card.redeemed_by_user_id?.equals(uid)) refuseWith('ALREADY_REDEEMED');

    const credited = await coinService.creditForGiftCard({
      userId,
      giftCardId: String(card._id),
      coins: card.coins,
      reason: `Physical gift card ${card.card_number}`,
    });
    try {
      await PhysicalGiftCardEventModel.create({
        card_id: card._id,
        card_number: card.card_number,
        batch_id: card.batch_id,
        type: 'REDEEMED',
        actor_user_id: uid,
        coins: card.coins,
        note: '',
      });
    } catch (e) {
      if ((e as { code?: number })?.code !== DUPLICATE_KEY) throw e;
    }

    return {
      coins_added: credited,
      coin_balance: await coinService.balanceOf(userId),
      card: physicalCardPub(card),
    };
  },

  /**
   * Cancel a card that must never pay out — lost before it was handed over,
   * printed with a mistake, given to the wrong person. Only an unredeemed card
   * can be voided: coins already credited are a member's balance, which the
   * Duncit Coin console adjusts, not this one.
   */
  async void(opts: { id: string; adminId: string; reason: string }): Promise<IPhysicalGiftCard> {
    const reason = (opts.reason ?? '').trim();
    if (!reason) badInput('A reason is required — it is what the history explains');
    if (!Types.ObjectId.isValid(opts.id)) badInput('That card does not exist');
    const adminId = new Types.ObjectId(opts.adminId);

    const card = await PhysicalGiftCardModel.findOneAndUpdate(
      { _id: opts.id, status: 'ACTIVE' },
      { $set: { status: 'VOID', voided_by: adminId, voided_at: new Date(), void_reason: reason } },
      { new: true }
    );
    if (!card) {
      const existing = await PhysicalGiftCardModel.findById(opts.id).select('status').lean();
      if (!existing) {
        throw new GraphQLError('Gift card not found', { extensions: { code: 'NOT_FOUND' } });
      }
      badInput(
        existing.status === 'REDEEMED'
          ? 'This card is already redeemed — its coins are in the member balance'
          : 'This card is already cancelled'
      );
    }
    await PhysicalGiftCardEventModel.create({
      card_id: card._id,
      card_number: card.card_number,
      batch_id: card.batch_id,
      type: 'VOIDED',
      actor_user_id: adminId,
      coins: card.coins,
      note: reason,
    });
    return card;
  },

  /** Build the unique indexes (card number, the once-only redeem line) at boot —
   * mongoose autoIndex only ADDS, so unique-index changes need this. */
  async syncIndexes(): Promise<void> {
    await PhysicalGiftCardBatchModel.syncIndexes();
    await PhysicalGiftCardModel.syncIndexes();
    await PhysicalGiftCardEventModel.syncIndexes();
  },
};
