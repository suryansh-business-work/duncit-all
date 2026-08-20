import { GraphQLError } from 'graphql';
import crypto from 'node:crypto';
import { Types, type ClientSession } from 'mongoose';
import {
  GiftCardModel,
  GiftCardTransactionModel,
  type GiftCardScopeType,
  type IGiftCard,
} from './giftcard.model';
import { giftCardSettingsService } from './giftcard.settings.service';
import { CategoryModel } from '@modules/pods/category/category.model';
import { UserModel } from '@modules/access/user/user.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { coinService } from '@modules/finance/coin/coin.service';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { sendGiftCardReceivedEmail } from '@services/email/email.service';
import { emailTranslationVars, recipientLocale } from '@services/email/email-i18n';
import { getUrlConfigs } from '@config/url-configs';

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

const LEVEL_BY_SCOPE: Record<Exclude<GiftCardScopeType, 'SHOP'>, string> = {
  SUPER: 'SUPER',
  CATEGORY: 'CATEGORY',
  SUB: 'SUB',
};

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

/** The facts checkout freezes onto the payment — everything the issue leg needs. */
export interface GiftCardPurchaseFacts {
  scope_type: GiftCardScopeType;
  scope_category_id: string | null;
  scope_name: string;
  scope_image_url: string;
  amount: number;
  recipient_email: string;
  recipient_name: string;
  message: string;
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

  /**
   * Validate a purchase request and resolve the theme's display snapshots.
   * Category scopes must reference a live category of exactly that level; the
   * SHOP scope has no document, so its name stays '' (clients localize it) and
   * its image comes from the branding the Pod Shop already renders.
   */
  async purchaseFacts(input: {
    scope_type: string;
    scope_category_id?: string | null;
    amount: number;
    recipient_email?: string | null;
    recipient_name?: string | null;
    message?: string | null;
  }): Promise<GiftCardPurchaseFacts> {
    const settings = await giftCardSettingsService.get();
    const amount = Math.floor(Number(input.amount) || 0);
    if (amount < settings.min_amount || amount > settings.max_amount) {
      badInput(`Gift card amount must be between ${settings.min_amount} and ${settings.max_amount}`);
    }

    const scopeType = input.scope_type as GiftCardScopeType;
    let scopeCategoryId: string | null = null;
    let scopeName = '';
    let scopeImage = '';
    if (scopeType === 'SHOP') {
      if (input.scope_category_id) badInput('A shop gift card carries no category');
      const branding = await settingsService.getBranding();
      scopeImage = branding?.pod_shop_slider?.[0]?.url || branding?.logo_url || '';
    } else {
      if (!input.scope_category_id || !Types.ObjectId.isValid(input.scope_category_id)) {
        badInput('Choose a category for this gift card');
      }
      const doc = await CategoryModel.findById(input.scope_category_id);
      if (!doc) {
        throw new GraphQLError('Category not found', { extensions: { code: 'NOT_FOUND' } });
      }
      if (doc.level !== LEVEL_BY_SCOPE[scopeType]) {
        badInput('The chosen category does not match the gift card type');
      }
      if (!doc.is_active) badInput('That category is not available right now');
      scopeCategoryId = String(doc._id);
      scopeName = doc.name;
      scopeImage = doc.icon || doc.media?.find((m: { type: string }) => m.type === 'IMAGE')?.url || '';
    }

    return {
      scope_type: scopeType,
      scope_category_id: scopeCategoryId,
      scope_name: scopeName,
      scope_image_url: scopeImage,
      amount,
      recipient_email: (input.recipient_email ?? '').trim().toLowerCase(),
      recipient_name: (input.recipient_name ?? '').trim(),
      message: (input.message ?? '').trim(),
    };
  },

  /**
   * Create the card for one successful purchase payment. Idempotent per payment
   * — the unique `payment_id` on the card absorbs every replay of the success
   * path, and the ISSUE ledger row's unique (payment_id, source) does the same
   * for the statement. Expiry counts from the moment of issue.
   */
  async issueForPayment(opts: {
    paymentId: string;
    purchaserId: string;
    facts: GiftCardPurchaseFacts;
    session?: ClientSession;
  }): Promise<IGiftCard> {
    const { facts, session } = opts;
    const purchaserId = new Types.ObjectId(opts.purchaserId);
    const settings = await giftCardSettingsService.get();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + settings.validity_months);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const existing = await GiftCardModel.findOne({ payment_id: opts.paymentId }).session(
        session ?? null
      );
      if (existing) return existing;
      try {
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
              initial_amount: facts.amount,
              balance: facts.amount,
              status: 'ACTIVE',
              payment_id: opts.paymentId,
              expires_at: expiresAt,
            },
          ],
          { session }
        );
        try {
          await GiftCardTransactionModel.create(
            [
              {
                gift_card_id: card._id,
                code: card.code,
                user_id: purchaserId,
                type: 'ISSUE',
                amount: facts.amount,
                balance_after: facts.amount,
                source: 'PURCHASE',
                payment_id: opts.paymentId,
              },
            ],
            { session }
          );
        } catch (e) {
          if ((e as { code?: number })?.code !== DUPLICATE_KEY) throw e;
        }
        return card;
      } catch (e) {
        // Either the code collided (regenerate and retry) or a concurrent
        // replay won the payment_id race (the loop re-reads and returns it).
        if ((e as { code?: number })?.code !== DUPLICATE_KEY) throw e;
      }
    }
    throw new GraphQLError('The gift card could not be issued', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
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
   * Mail the card to whoever it is for — the recipient when gifted, the buyer
   * when self-purchased. Called from the payment's deferred side effects, never
   * inside a transaction. Throws when the card is missing so the step records a
   * failure the reconciler will retry.
   */
  async emailForPayment(payment: {
    payment_id: string;
    user_name: string;
    user_email: string;
  }): Promise<{ to: string; cardId: string }> {
    const card = await GiftCardModel.findOne({ payment_id: payment.payment_id });
    if (!card) throw new Error('No gift card exists for this payment');
    const to = card.recipient_email || payment.user_email;
    const [fs, urlConfigs, t] = await Promise.all([
      getFinanceSettings(),
      getUrlConfigs(),
      recipientLocale(to).then((locale) => emailTranslationVars(locale)),
    ]);
    // The SHOP theme has no category name; its label is the localized Pod Shop
    // line, resolved here in the recipient's language.
    const scopeLabel = card.scope_name || t['t:email.giftCard.shopScope'] || 'Pod Shop';
    await sendGiftCardReceivedEmail({
      to,
      recipient_name: card.recipient_name || payment.user_name,
      sender_name: payment.user_name,
      amount: `${fs.currency_symbol}${card.initial_amount.toFixed(2)}`,
      scope_label: scopeLabel,
      code: card.code,
      message_line: card.message ? `“${card.message}”` : '',
      redeem_url: `${urlConfigs.appUrl}/gift-card/${card.code}`,
      expires_on: card.expires_at.toLocaleDateString('en-IN'),
    });
    return { to, cardId: String(card._id) };
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
