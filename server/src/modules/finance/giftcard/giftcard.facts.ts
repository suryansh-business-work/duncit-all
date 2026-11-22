import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { GiftCardScopeType, IGiftCardSettings } from './giftcard.model';
import { giftCardSettingsService } from './giftcard.settings.service';
import { CategoryModel } from '@modules/pods/category/category.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { GiftCardDesignModel, type IGiftCardDesign } from '@modules/finance/giftcardOrder/giftCardDesign.model';
import type {
  GiftCardDeliveryMode,
  IGiftCardShippingAddress,
} from '@modules/finance/giftcardOrder/giftCardOrder.model';
import { addressProblems } from '@modules/commerce/shiprocket/shiprocket.address';

/**
 * The facts a checkout freezes onto the payment — everything the issue leg
 * needs on payment success, never the client's word at that later moment.
 *
 * Two shapes reach here:
 *  - the DESIGN purchase (current apps): one catalogue design, a quantity, and
 *    digital (email) or physical (courier) delivery;
 *  - the legacy THEME purchase (apps from before the catalogue): one card with a
 *    category theme. It keeps working unchanged so no installed app breaks.
 * Fields added for designs are optional, so facts frozen before them still read.
 */
export interface GiftCardPurchaseFacts {
  scope_type: GiftCardScopeType;
  scope_category_id: string | null;
  scope_name: string;
  scope_image_url: string;
  /** The card artwork at the moment of purchase — see IGiftCard. */
  scope_image_front_url: string;
  scope_image_back_url: string;
  /** Face value of ONE card. */
  amount: number;
  recipient_email: string;
  recipient_name: string;
  message: string;
  /** Absent on legacy facts = 1. */
  quantity?: number;
  /** Absent on legacy facts = DIGITAL. */
  delivery_mode?: GiftCardDeliveryMode;
  design_id?: string | null;
  design_name?: string;
  /** Charged once per physical order; 0/absent for digital. */
  shipping_fee?: number;
  shipping_address?: IGiftCardShippingAddress | null;
}

export interface GiftCardPurchaseInput {
  scope_type?: string | null;
  scope_category_id?: string | null;
  amount: number;
  recipient_email?: string | null;
  recipient_name?: string | null;
  message?: string | null;
  design_id?: string | null;
  quantity?: number | null;
  delivery_mode?: string | null;
  shipping_address?: Partial<Record<keyof IGiftCardShippingAddress | 'email', string | null>> | null;
}

export const factsQuantity = (f: Pick<GiftCardPurchaseFacts, 'quantity'>): number =>
  Math.max(1, Math.floor(Number(f.quantity) || 1));

export const factsMode = (f: Pick<GiftCardPurchaseFacts, 'delivery_mode'>): GiftCardDeliveryMode =>
  f.delivery_mode === 'PHYSICAL' ? 'PHYSICAL' : 'DIGITAL';

/** What the buyer pays: every card's face value, plus the delivery fee once. */
export const factsTotal = (f: GiftCardPurchaseFacts): number =>
  f.amount * factsQuantity(f) + (factsMode(f) === 'PHYSICAL' ? Number(f.shipping_fee) || 0 : 0);

const badInput = (message: string, field?: string): never => {
  throw new GraphQLError(message, {
    extensions: { code: 'BAD_USER_INPUT', ...(field ? { field } : {}) },
  });
};

const LEVEL_BY_SCOPE: Record<Exclude<GiftCardScopeType, 'SHOP'>, string> = {
  SUPER: 'SUPER',
  CATEGORY: 'CATEGORY',
  SUB: 'SUB',
};

/** A legacy client names a theme and none of the catalogue fields. */
export const isLegacyThemePurchase = (input: GiftCardPurchaseInput): boolean =>
  !!input.scope_type && !input.design_id && !input.delivery_mode && input.quantity == null;

const recipientOf = (input: GiftCardPurchaseInput) => ({
  recipient_email: (input.recipient_email ?? '').trim().toLowerCase(),
  recipient_name: (input.recipient_name ?? '').trim(),
  message: (input.message ?? '').trim(),
});

function assertAmount(amount: number, settings: IGiftCardSettings) {
  if (amount < settings.min_amount || amount > settings.max_amount) {
    badInput(`Gift card amount must be between ${settings.min_amount} and ${settings.max_amount}`, 'amount');
  }
}

/**
 * The legacy theme purchase. Category scopes must reference a live category of
 * exactly that level; the SHOP scope has no document, so its name stays ''
 * (clients localize it) and its image comes from the Pod Shop branding.
 */
async function themeFacts(input: GiftCardPurchaseInput, amount: number): Promise<GiftCardPurchaseFacts> {
  const scopeType = input.scope_type as GiftCardScopeType;
  const base = { scope_type: scopeType, amount, ...recipientOf(input) };
  if (scopeType === 'SHOP') {
    if (input.scope_category_id) badInput('A shop gift card carries no category');
    const branding = await settingsService.getBranding();
    return {
      ...base,
      scope_category_id: null,
      scope_name: '',
      scope_image_url: branding?.pod_shop_slider?.[0]?.url || branding?.logo_url || '',
      scope_image_front_url: '',
      scope_image_back_url: '',
    };
  }
  if (!input.scope_category_id || !Types.ObjectId.isValid(input.scope_category_id)) {
    badInput('Choose a category for this gift card');
  }
  const doc = await CategoryModel.findById(input.scope_category_id);
  if (!doc) throw new GraphQLError('Category not found', { extensions: { code: 'NOT_FOUND' } });
  if (doc.level !== LEVEL_BY_SCOPE[scopeType as Exclude<GiftCardScopeType, 'SHOP'>]) {
    badInput('The chosen category does not match the gift card type');
  }
  if (!doc.is_active) badInput('That category is not available right now');
  return {
    ...base,
    scope_category_id: String(doc._id),
    scope_name: doc.name,
    scope_image_url: doc.icon || doc.media?.find((m: { type: string }) => m.type === 'IMAGE')?.url || '',
    scope_image_front_url: doc.gift_card_image_front ?? '',
    scope_image_back_url: doc.gift_card_image_back ?? '',
  };
}

async function designFor(designId: string | null | undefined): Promise<IGiftCardDesign> {
  if (designId && !Types.ObjectId.isValid(designId)) badInput('Choose a gift card design', 'design_id');
  const design = designId
    ? await GiftCardDesignModel.findOne({ _id: designId, is_active: true })
    : await GiftCardDesignModel.findOne({ is_default: true, is_active: true });
  if (!design) {
    throw new GraphQLError('This gift card is not available right now', {
      extensions: { code: 'NOT_FOUND', field: 'design_id' },
    });
  }
  return design;
}

const addressText = (value: string | null | undefined, max: number) => (value ?? '').trim().slice(0, max);

/** The ship-to, cleaned and checked by the same rules the courier booking applies. */
function shippingAddressFrom(input: GiftCardPurchaseInput): IGiftCardShippingAddress {
  const a = input.shipping_address ?? {};
  const address: IGiftCardShippingAddress = {
    name: addressText(a.name, 160),
    phone: addressText(a.phone, 32),
    line1: addressText(a.line1, 200),
    line2: addressText(a.line2, 200),
    landmark: addressText(a.landmark, 200),
    city: addressText(a.city, 120),
    state: addressText(a.state, 120),
    pincode: addressText(a.pincode, 10),
    country: addressText(a.country, 80) || 'India',
  };
  if (!address.name) badInput('Enter who the cards are delivered to', 'shipping_address.name');
  const problems = addressProblems(address);
  if (problems.length > 0) badInput(`Enter ${problems.join(' and ')}`, 'shipping_address');
  return address;
}

/** Physical delivery: switched on, in stock for the whole quantity, and a courier-ready address. */
function physicalFacts(
  input: GiftCardPurchaseInput,
  settings: IGiftCardSettings,
  design: IGiftCardDesign,
  quantity: number
) {
  if (!settings.physical_enabled) badInput('Physical gift cards are not available right now', 'delivery_mode');
  if (design.physical_stock < quantity) {
    badInput(
      design.physical_stock > 0
        ? `Only ${design.physical_stock} printed cards are left`
        : 'Printed cards are out of stock right now',
      'quantity'
    );
  }
  return { shipping_fee: settings.shipping_fee, shipping_address: shippingAddressFrom(input) };
}

/** The catalogue purchase: a design, a quantity, and how the cards travel. */
async function designFacts(
  input: GiftCardPurchaseInput,
  settings: IGiftCardSettings,
  amount: number
): Promise<GiftCardPurchaseFacts> {
  const design = await designFor(input.design_id);
  const quantity = Math.floor(Number(input.quantity ?? 1));
  const maxQuantity = settings.max_quantity ?? 10;
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > maxQuantity) {
    badInput(`Choose between 1 and ${maxQuantity} cards`, 'quantity');
  }
  const mode: GiftCardDeliveryMode = input.delivery_mode === 'PHYSICAL' ? 'PHYSICAL' : 'DIGITAL';
  const delivery =
    mode === 'PHYSICAL'
      ? physicalFacts(input, settings, design, quantity)
      : { shipping_fee: 0, shipping_address: null };
  const recipient = recipientOf(input);
  return {
    scope_type: 'SHOP',
    scope_category_id: null,
    scope_name: '',
    scope_image_url: design.front_image_url,
    scope_image_front_url: design.front_image_url,
    scope_image_back_url: design.back_image_url,
    amount,
    ...recipient,
    // A printed card is handed over, never emailed: no inbox to name.
    recipient_email: mode === 'PHYSICAL' ? '' : recipient.recipient_email,
    quantity,
    delivery_mode: mode,
    design_id: String(design._id),
    design_name: design.name,
    ...delivery,
  };
}

/** Validate a purchase request and resolve everything the card(s) will carry. */
export async function resolvePurchaseFacts(input: GiftCardPurchaseInput): Promise<GiftCardPurchaseFacts> {
  const settings = await giftCardSettingsService.get();
  const amount = Math.floor(Number(input.amount) || 0);
  assertAmount(amount, settings);
  return isLegacyThemePurchase(input) ? themeFacts(input, amount) : designFacts(input, settings, amount);
}
