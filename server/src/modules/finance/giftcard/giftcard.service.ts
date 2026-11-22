import { GraphQLError } from 'graphql';
import crypto from 'node:crypto';
import { Types, type ClientSession } from 'mongoose';
import { GiftCardModel, GiftCardTransactionModel, type IGiftCard } from './giftcard.model';
import { giftCardSettingsService } from './giftcard.settings.service';
import {
  factsQuantity,
  resolvePurchaseFacts,
  type GiftCardPurchaseFacts,
  type GiftCardPurchaseInput,
} from './giftcard.facts';
import { UserModel } from '@modules/access/user/user.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { coinService } from '@modules/finance/coin/coin.service';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { sendGiftCardReceivedEmail } from '@services/email/email.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { emailTranslationVars, recipientLocale } from '@services/email/email-i18n';
import { getUrlConfigs } from '@config/url-configs';
import { appDate } from '@utils/app-time';

/** Mongo's duplicate-key error — a unique index rejecting a repeat. */
const DUPLICATE_KEY = 11000;

const badInput = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

/** No 0/O/1/I — a code read aloud over a phone call must survive the trip. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 16;

function generateCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let raw = '';
  for (const b of bytes) raw += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return raw.replace(/(.{4})(?=.)/g, '$1-');
}

/** Uppercase, strip everything but letters/digits, re-group as XXXX-XXXX-XXXX-XXXX. */
export function normalizeGiftCardCode(input: string): string {
  const raw = (input ?? '').toUpperCase().replaceAll(/[^A-Z0-9]/g, '');
  if (raw.length !== CODE_LENGTH) return '';
  return raw.replace(/(.{4})(?=.)/g, '$1-');
}

const isExpired = (card: IGiftCard) => card.expires_at.getTime() <= Date.now();

const statusOf = (card: IGiftCard): 'ACTIVE' | 'REDEEMED' | 'EXPIRED' => {
  if (card.status === 'REDEEMED') return 'REDEEMED';
  if (isExpired(card)) return 'EXPIRED';
  return 'ACTIVE';
};

export const giftCardPub = (card: IGiftCard) => ({
  id: String(card._id),
  code: card.code,
  scope_type: card.scope_type,
  scope_category_id: card.scope_category_id ? String(card.scope_category_id) : null,
  scope_name: card.scope_name ?? '',
  scope_image_url: card.scope_image_url ?? '',
  scope_image_front_url: card.scope_image_front_url ?? '',
  scope_image_back_url: card.scope_image_back_url ?? '',
  design_id: card.design_id ? String(card.design_id) : null,
  design_name: card.design_name ?? '',
  initial_amount: card.initial_amount,
  balance: card.balance,
  status: statusOf(card),
  recipient_email: card.recipient_email ?? '',
  recipient_name: card.recipient_name ?? '',
  message: card.message ?? '',
  redeemed: !!card.redeemed_by_user_id,
  redeemed_at: card.redeemed_at?.toISOString?.() ?? null,
  expires_at: card.expires_at?.toISOString?.() ?? '',
  created_at: card.created_at?.toISOString?.() ?? '',
});

export type { GiftCardPurchaseFacts } from './giftcard.facts';

export interface IssueOptions {
  paymentId: string;
  purchaserId: string;
  facts: GiftCardPurchaseFacts;
  /** The gift card order the cards belong to, when one exists. */
  orderId?: string | null;
  session?: ClientSession;
}

/** The card a replay already issued at this position. Legacy single cards carry no
 * line_index, so position 0 also matches a card without one. */
const lineFilter = (paymentId: string, lineIndex: number) => ({
  payment_id: paymentId,
  line_index: lineIndex === 0 ? { $in: [0, null] } : lineIndex,
});

const isDuplicate = (e: unknown) => (e as { code?: number })?.code === DUPLICATE_KEY;

/** The card's ISSUE ledger row. A replay finds it already written, which is fine. */
async function writeIssueRow(card: IGiftCard, opts: IssueOptions): Promise<void> {
  try {
    await GiftCardTransactionModel.create(
      [
        {
          gift_card_id: card._id,
          code: card.code,
          user_id: card.purchaser_user_id,
          type: 'ISSUE',
          amount: card.initial_amount,
          balance_after: card.initial_amount,
          source: 'PURCHASE',
          payment_id: opts.paymentId,
        },
      ],
      { session: opts.session }
    );
  } catch (e) {
    if (!isDuplicate(e)) throw e;
  }
}

/** Create the card at one position with a fresh code. */
async function createLine(opts: IssueOptions, lineIndex: number, expiresAt: Date): Promise<IGiftCard> {
  const { facts, session } = opts;
  const purchaserId = new Types.ObjectId(opts.purchaserId);
  const [card] = await GiftCardModel.create(
    [
      {
        code: generateCode(),
        purchaser_user_id: purchaserId,
        recipient_email: facts.recipient_email,
        recipient_name: facts.recipient_name,
        message: facts.message,
        scope_type: facts.scope_type,
        scope_category_id: facts.scope_category_id
          ? new Types.ObjectId(facts.scope_category_id)
          : null,
        scope_name: facts.scope_name,
        scope_image_url: facts.scope_image_url,
        // Older payments were frozen before artwork existed, so their
        // facts carry none — the card then renders as it always did.
        scope_image_front_url: facts.scope_image_front_url ?? '',
        scope_image_back_url: facts.scope_image_back_url ?? '',
        design_id: facts.design_id ? new Types.ObjectId(facts.design_id) : null,
        design_name: facts.design_name ?? '',
        order_id: opts.orderId ? new Types.ObjectId(opts.orderId) : null,
        initial_amount: facts.amount,
        balance: facts.amount,
        status: 'ACTIVE',
        payment_id: opts.paymentId,
        line_index: lineIndex,
        expires_at: expiresAt,
      },
    ],
    { session }
  );
  return card;
}

/**
 * Issue the card at one position of a purchase. Idempotent per (payment,
 * position) — the unique index absorbs every replay of the success path, and
 * the ISSUE ledger row's unique (card, source) does the same for the statement.
 */
async function issueLine(opts: IssueOptions, lineIndex: number, expiresAt: Date): Promise<IGiftCard> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    // Sequential by design: a retry must re-read before it writes again.
    const existing = await GiftCardModel.findOne(lineFilter(opts.paymentId, lineIndex)).session(
      opts.session ?? null
    );
    if (existing) return existing;
    try {
      const card = await createLine(opts, lineIndex, expiresAt);
      await writeIssueRow(card, opts);
      return card;
    } catch (e) {
      // Either the code collided (regenerate and retry) or a concurrent
      // replay won this position (the loop re-reads and returns it).
      if (!isDuplicate(e)) throw e;
    }
  }
  throw new GraphQLError('The gift card could not be issued', {
    extensions: { code: 'INTERNAL_SERVER_ERROR' },
  });
}

export const giftcardService = {
  /** The purchase gate. Redemption is deliberately NOT gated — people already
   * holding value must be able to convert it even if sales are switched off. */
  async assertPurchaseEnabled(): Promise<void> {
    const flags = await settingsService.listPublicFlags();
    const flag = flags.find((f: { key: string; enabled: boolean }) => f.key === 'gift_cards');
    if (!flag?.enabled) {
      throw new GraphQLError('Gift cards are not available right now', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
  },

  /** Validate a purchase request and resolve the facts frozen onto the payment. */
  purchaseFacts(input: GiftCardPurchaseInput): Promise<GiftCardPurchaseFacts> {
    return resolvePurchaseFacts(input);
  },

  /**
   * Issue every virtual card one successful payment bought — one per unit of
   * the order's quantity, each with its own code. Expiry counts from issue.
   */
  async issueAllForPayment(opts: IssueOptions): Promise<IGiftCard[]> {
    const settings = await giftCardSettingsService.get();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + settings.validity_months);
    const cards: IGiftCard[] = [];
    // One at a time, not Promise.all: every write rides the payment's
    // transaction session, and a MongoDB session runs one operation at a time.
    for (let i = 0; i < factsQuantity(opts.facts); i += 1) {
      cards.push(await issueLine(opts, i, expiresAt));
    }
    return cards;
  },

  /** The first (for a legacy purchase, the only) card of a payment. */
  async issueForPayment(opts: IssueOptions): Promise<IGiftCard> {
    const [first] = await this.issueAllForPayment(opts);
    return first;
  },

  /**
   * Convert a card's full value into Duncit Coins for the caller.
   *
   * The winner is picked by ONE guarded update — two people racing the same
   * shared code cannot both flip an ACTIVE card. The coin credit that follows
   * is idempotent per card (the coin ledger's unique gift_card_id guard), and a
   * retry after a crash between the two writes heals itself: the card already
   * says "redeemed by me", so the credit is simply attempted again.
   */
  async redeemToCoins(code: string, userId: string) {
    const normalized = normalizeGiftCardCode(code);
    if (!normalized) badInput('That gift card code is not valid');
    const uid = new Types.ObjectId(userId);

    const won = await GiftCardModel.findOneAndUpdate(
      { code: normalized, status: 'ACTIVE', expires_at: { $gt: new Date() } },
      {
        $set: {
          status: 'REDEEMED',
          balance: 0,
          redeemed_by_user_id: uid,
          redeemed_at: new Date(),
        },
      },
      { new: true }
    );

    let card = won;
    if (!card) {
      const existing = await GiftCardModel.findOne({ code: normalized });
      if (!existing) {
        throw new GraphQLError('Gift card not found', { extensions: { code: 'NOT_FOUND' } });
      }
      if (existing.status === 'ACTIVE' && isExpired(existing)) {
        badInput('This gift card has expired');
      }
      if (String(existing.redeemed_by_user_id) !== String(uid)) {
        badInput('This gift card has already been redeemed');
      }
      // Redeemed by me before — fall through so an interrupted first attempt
      // still lands its coin credit (both writes below are idempotent).
      card = existing;
    }

    const credited = await coinService.creditForGiftCard({
      userId,
      giftCardId: String(card!._id),
      coins: card!.initial_amount,
      reason: `Gift card ${card!.code}`,
    });
    try {
      await GiftCardTransactionModel.create({
        gift_card_id: card!._id,
        code: card!.code,
        user_id: uid,
        type: 'REDEEM',
        amount: card!.initial_amount,
        balance_after: 0,
        source: 'REDEEM_TO_COINS',
        payment_id: null,
      });
    } catch (e) {
      if ((e as { code?: number })?.code !== DUPLICATE_KEY) throw e;
    }

    return {
      coins_added: credited,
      coin_balance: await coinService.balanceOf(userId),
      card: giftCardPub(card),
    };
  },

  /**
   * Mail every card a payment bought to whoever it is for — the recipient when
   * gifted, the buyer when self-purchased. One email per card, because each
   * carries its own code. Called from the payment's deferred side effects,
   * never inside a transaction. Throws when no card exists so the step records
   * a failure the reconciler will retry.
   */
  async emailForPayment(payment: {
    payment_id: string;
    user_name: string;
    user_email: string;
  }): Promise<{ to: string; cardId: string; cardIds: string[] }> {
    const cards = await GiftCardModel.find({ payment_id: payment.payment_id }).sort({ line_index: 1 });
    const [card] = cards;
    if (!card) throw new Error('No gift card exists for this payment');
    const to = card.recipient_email || payment.user_email;
    const [fs, urlConfigs, t] = await Promise.all([
      getFinanceSettings(),
      getUrlConfigs(),
      recipientLocale(to).then((locale) => emailTranslationVars(locale)),
    ]);
    // A catalogue card is labelled by its design; a SHOP theme card has no
    // name, so its label is the localized Pod Shop line, in the recipient's language.
    const scopeLabel =
      card.design_name || card.scope_name || t['t:email.giftCard.shopScope'] || 'Pod Shop';
    await Promise.all(
      cards.map((each) =>
        sendGiftCardReceivedEmail({
          to,
          recipient_name: each.recipient_name || payment.user_name,
          sender_name: payment.user_name,
          amount: `${fs.currency_symbol}${each.initial_amount.toFixed(2)}`,
          scope_label: scopeLabel,
          code: each.code,
          message_line: each.message ? `“${each.message}”` : '',
          redeem_url: `${urlConfigs.appUrl}/gift-card/${each.code}`,
          expires_on: appDate(each.expires_at),
        })
      )
    );
    // A gift is the one email people most often miss. When the address belongs
    // to a Duncit account, the same news goes to its WhatsApp too — once per
    // purchase, keyed on its first card so a retried step cannot send it twice.
    const holder = await UserModel.findOne({ 'auth.email': to })
      .select('profile.first_name profile.last_name auth.email auth.phone communication.whatsapp')
      .lean();
    if (holder) {
      const name = card.recipient_name || holder.profile?.first_name || 'there';
      const total = cards.reduce((sum, c) => sum + c.initial_amount, 0);
      await whatsappService.send({
        event: 'USER_GIFT_CARD_RECEIVED',
        entityId: String(card._id),
        user: holder,
        name,
        params: [
          name,
          payment.user_name || 'Someone',
          `${fs.currency_symbol}${total.toFixed(2)}`,
          // Several codes cannot share one claim link: they arrive by email, and
          // the redeem page takes any of them.
          cards.length > 1
            ? `${urlConfigs.appUrl}/gift-cards/redeem`
            : `${urlConfigs.appUrl}/gift-card/${card.code}`,
        ],
      });
    }
    return { to, cardId: String(card._id), cardIds: cards.map((c) => String(c._id)) };
  },

  /** One card by code, for the claim/redeem page — any signed-in holder of the
   * code may look, because holding the code is holding the value. */
  async byCode(code: string) {
    const normalized = normalizeGiftCardCode(code);
    if (!normalized) badInput('That gift card code is not valid');
    const card = await GiftCardModel.findOne({ code: normalized });
    if (!card) {
      throw new GraphQLError('Gift card not found', { extensions: { code: 'NOT_FOUND' } });
    }
    const sender = await UserModel.findById(card.purchaser_user_id)
      .select('profile.first_name profile.last_name')
      .lean();
    const senderName = `${(sender as any)?.profile?.first_name ?? ''} ${
      (sender as any)?.profile?.last_name ?? ''
    }`.trim();
    return { ...giftCardPub(card), sender_name: senderName };
  },

  /** The caller's cards: the ones they hold or redeemed, and the ones they
   * gifted away. A bearer card someone ELSE holds is nobody's list entry until
   * it is redeemed — that is the nature of a code. */
  async myGiftCards(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return { owned: [], gifted: [] };
    const uid = new Types.ObjectId(userId);
    const cards = await GiftCardModel.find({
      $or: [{ purchaser_user_id: uid }, { redeemed_by_user_id: uid }],
    }).sort({ created_at: -1 });
    const isMine = (c: IGiftCard) => {
      if (c.redeemed_by_user_id) return String(c.redeemed_by_user_id) === String(uid);
      return String(c.purchaser_user_id) === String(uid) && !c.recipient_email;
    };
    return {
      owned: cards.filter((c) => isMine(c)).map(giftCardPub),
      gifted: cards.filter((c) => !isMine(c)).map(giftCardPub),
    };
  },

  /** Drop superseded index definitions and build the declared ones at boot —
   * mongoose autoIndex only ADDS, so unique-index changes need this. */
  async syncIndexes(): Promise<void> {
    await GiftCardModel.syncIndexes();
    await GiftCardTransactionModel.syncIndexes();
  },
};
