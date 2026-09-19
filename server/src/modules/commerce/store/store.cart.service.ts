import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { isEmailAddress } from '@utils/email';
import { StoreProductModel } from './storeProduct.model';
import { StoreCartModel, StoreWishlistModel, type IStoreCart } from './storeCart.model';
import { StoreStockAlertModel } from './storeReturn.model';
import { getStoreSettings } from './storeSettings.model';
import { cardsFor, listedFilter } from './store.catalog.service';
import { lineOut, priceStoreCart, resolveStoreLines } from './store.pricing';
import { availableFor, findVariant } from './store.product';
import { badInput, guestKeyOf, resolveOwner, round2, toObjectId, type StoreOwner } from './store.shared';

/**
 * The shopper's cart and wishlist. A cart holds only WHAT and HOW MANY — the
 * price, the stock and every discount are re-read from the catalogue each time
 * it is shown (`priceStoreCart`), so a cart left open for a week can never
 * charge last week's price.
 */

const MAX_CART_LINES = 50;
const MAX_WISHLIST = 200;

async function cartOf(owner: StoreOwner): Promise<IStoreCart> {
  return StoreCartModel.findOneAndUpdate(
    { owner_key: owner.owner_key },
    { $setOnInsert: { owner_key: owner.owner_key, user_id: owner.user_id } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).exec() as Promise<IStoreCart>;
}

/** The priced cart the storefront renders. */
async function cartView(cart: IStoreCart, userId: string | null) {
  const settings = await getStoreSettings();
  const lines = await resolveStoreLines(cart.items, settings);
  const priced = await priceStoreCart({
    lines,
    settings,
    pincode: '',
    paymentMethod: 'PREPAID',
    couponCode: cart.coupon_code,
    userId,
    email: cart.email,
  });
  const goods = priced.items_total;
  return {
    id: String(cart._id),
    lines: lines.map(lineOut),
    item_count: lines.reduce((s, l) => s + l.quantity, 0),
    items_total: goods,
    mrp_total: priced.mrp_total,
    savings: priced.savings,
    coupon_code: priced.coupon_code ?? '',
    coupon_discount: priced.coupon_discount,
    coupon_error: priced.coupon_error,
    free_shipping_above: settings.free_shipping_above,
    amount_to_free_shipping:
      settings.free_shipping_above > 0 ? round2(Math.max(0, settings.free_shipping_above - goods)) : 0,
    min_order_value: settings.min_order_value,
    has_issues: lines.some((l) => l.issue),
  };
}

function assertProductId(productId: string) {
  const id = toObjectId(productId);
  if (!id) badInput('That product could not be found');
  return id;
}

/** Validate an add: the product is on the shelf and the variant exists. */
async function assertAddable(productId: Types.ObjectId, variantId: string) {
  const product = await StoreProductModel.findOne(listedFilter({ _id: productId })).lean();
  if (!product) badInput('This product is not available right now');
  const hasVariants = (product.variants ?? []).length > 0;
  if (hasVariants && !findVariant(product as any, variantId)) badInput('Choose an option first');
  if (!hasVariants && variantId) badInput('This product has no options');
  return product;
}

const sameLine = (item: { product_id: Types.ObjectId; variant_id: string }, id: Types.ObjectId, variantId: string) =>
  String(item.product_id) === String(id) && (item.variant_id ?? '') === variantId;

export const storeCartService = {
  async get(ctx: GraphQLContext, token?: string | null) {
    const owner = resolveOwner(ctx, token);
    return cartView(await cartOf(owner), ctx.user?.id ?? null);
  },

  async add(ctx: GraphQLContext, token: string | null | undefined, productId: string, variantId: string, qty: number) {
    const owner = resolveOwner(ctx, token);
    const id = assertProductId(productId);
    const variant = String(variantId ?? '');
    const product = await assertAddable(id, variant);
    const units = Math.max(1, Math.floor(Number(qty) || 1));
    if (availableFor(product as any, findVariant(product as any, variant)) <= 0) {
      badInput('This product is out of stock');
    }
    const cart = await cartOf(owner);
    const existing = cart.items.find((i) => sameLine(i, id, variant));
    if (existing) existing.qty += units;
    else {
      if (cart.items.length >= MAX_CART_LINES) badInput('Your cart is full — check out or remove something first');
      cart.items.push({ product_id: id, variant_id: variant, qty: units, added_at: new Date() });
    }
    cart.last_activity_at = new Date();
    await cart.save();
    return cartView(cart, ctx.user?.id ?? null);
  },

  async setQty(ctx: GraphQLContext, token: string | null | undefined, productId: string, variantId: string, qty: number) {
    const owner = resolveOwner(ctx, token);
    const id = assertProductId(productId);
    const variant = String(variantId ?? '');
    const cart = await cartOf(owner);
    const units = Math.floor(Number(qty) || 0);
    if (units <= 0) {
      cart.items = cart.items.filter((i) => !sameLine(i, id, variant)) as any;
    } else {
      const line = cart.items.find((i) => sameLine(i, id, variant));
      if (!line) badInput('That item is not in your cart');
      line.qty = units;
    }
    cart.last_activity_at = new Date();
    await cart.save();
    return cartView(cart, ctx.user?.id ?? null);
  },

  async clear(ctx: GraphQLContext, token?: string | null) {
    const owner = resolveOwner(ctx, token);
    const cart = await cartOf(owner);
    cart.items = [] as any;
    cart.coupon_code = '';
    await cart.save();
    return cartView(cart, ctx.user?.id ?? null);
  },

  /** Remember a coupon on the cart. An invalid code is refused with its reason. */
  async applyCoupon(ctx: GraphQLContext, token: string | null | undefined, code: string | null) {
    const owner = resolveOwner(ctx, token);
    const cart = await cartOf(owner);
    cart.coupon_code = String(code ?? '').trim().toUpperCase();
    const view = await cartView(cart, ctx.user?.id ?? null);
    if (cart.coupon_code && view.coupon_error) badInput(view.coupon_error);
    await cart.save();
    return view;
  },

  /** Signing in: fold the guest's cart and wishlist into the account's. */
  async mergeGuest(ctx: GraphQLContext, token: string | null | undefined) {
    const user = requireAuth(ctx);
    const guestKey = guestKeyOf(token);
    const owner = resolveOwner(ctx, null);
    const cart = await cartOf(owner);
    if (guestKey) {
      const guest = await StoreCartModel.findOne({ owner_key: guestKey });
      for (const item of guest?.items ?? []) {
        const existing = cart.items.find((i) => sameLine(i, item.product_id, item.variant_id ?? ''));
        if (existing) existing.qty = Math.max(existing.qty, item.qty);
        else if (cart.items.length < MAX_CART_LINES) cart.items.push(item);
      }
      if (guest?.coupon_code && !cart.coupon_code) cart.coupon_code = guest.coupon_code;
      await StoreCartModel.deleteOne({ owner_key: guestKey });
      const [guestWish, ownWish] = await Promise.all([
        StoreWishlistModel.findOne({ owner_key: guestKey }).lean(),
        StoreWishlistModel.findOne({ owner_key: owner.owner_key }).select('items.product_id').lean(),
      ]);
      // Saved on both sides = one entry; `$addToSet` alone would keep both,
      // because the two rows differ in when they were saved.
      const held = new Set((ownWish?.items ?? []).map((i) => String(i.product_id)));
      const fresh = (guestWish?.items ?? []).filter((i) => !held.has(String(i.product_id)));
      if (fresh.length) {
        await StoreWishlistModel.updateOne(
          { owner_key: owner.owner_key },
          {
            $setOnInsert: { owner_key: owner.owner_key, user_id: new Types.ObjectId(user.id) },
            $push: { items: { $each: fresh } },
          },
          { upsert: true }
        );
      }
      await StoreWishlistModel.deleteOne({ owner_key: guestKey });
    }
    cart.last_activity_at = new Date();
    await cart.save();
    return cartView(cart, user.id);
  },

  /** The shopper's saved products, newest first, as shelf cards. */
  async wishlist(ctx: GraphQLContext, token?: string | null) {
    const owner = resolveOwner(ctx, token);
    const list = await StoreWishlistModel.findOne({ owner_key: owner.owner_key }).lean();
    const newestFirst = [...(list?.items ?? [])];
    newestFirst.sort((a, b) => b.added_at.getTime() - a.added_at.getTime());
    const ids = newestFirst.map((i) => i.product_id);
    const docs = await StoreProductModel.find(listedFilter({ _id: { $in: ids } })).lean();
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    return cardsFor(ids.map((id) => byId.get(String(id))).filter(Boolean));
  },

  async wishlistIds(ctx: GraphQLContext, token?: string | null) {
    const owner = resolveOwner(ctx, token);
    const list = await StoreWishlistModel.findOne({ owner_key: owner.owner_key }).select('items.product_id').lean();
    return (list?.items ?? []).map((i) => String(i.product_id));
  },

  /** Save or un-save a product. Answers with the wishlist's ids after the change. */
  async toggleWishlist(ctx: GraphQLContext, token: string | null | undefined, productId: string) {
    const owner = resolveOwner(ctx, token);
    const id = assertProductId(productId);
    const list = await StoreWishlistModel.findOne({ owner_key: owner.owner_key });
    const saved = list?.items.some((i) => String(i.product_id) === String(id)) ?? false;
    if (saved) {
      await StoreWishlistModel.updateOne({ owner_key: owner.owner_key }, { $pull: { items: { product_id: id } } });
      await StoreProductModel.updateOne(
        { _id: id, 'store.wishlist_count': { $gt: 0 } },
        { $inc: { 'store.wishlist_count': -1 } }
      );
    } else {
      if ((list?.items.length ?? 0) >= MAX_WISHLIST) badInput('Your wishlist is full');
      await StoreWishlistModel.updateOne(
        { owner_key: owner.owner_key },
        {
          $setOnInsert: { owner_key: owner.owner_key, user_id: owner.user_id },
          $push: { items: { product_id: id, added_at: new Date() } },
        },
        { upsert: true }
      );
      await StoreProductModel.updateOne({ _id: id }, { $inc: { 'store.wishlist_count': 1 } });
    }
    return this.wishlistIds(ctx, token);
  },

  /** "Notify me when it is back." One row per email + product + variant. */
  async subscribeStockAlert(ctx: GraphQLContext, productId: string, variantId: string | null, email: string) {
    const id = assertProductId(productId);
    const address = String(email ?? ctx.user?.email ?? '').trim().toLowerCase();
    if (!isEmailAddress(address)) badInput('Enter a valid email address');
    await StoreStockAlertModel.updateOne(
      { product_id: id, variant_id: String(variantId ?? ''), email: address },
      {
        $setOnInsert: { product_id: id, variant_id: String(variantId ?? ''), email: address },
        $set: { notified_at: null, user_id: toObjectId(ctx.user?.id) },
      },
      { upsert: true }
    );
    return true;
  },

  /** Remember the checkout contact on the cart, for the abandoned-cart follow-up. */
  async rememberContact(owner: StoreOwner, email: string, phone: string) {
    await StoreCartModel.updateOne(
      { owner_key: owner.owner_key },
      { $set: { email: email.toLowerCase(), phone, last_activity_at: new Date() } }
    );
  },

  cartOf,
  cartView,
};
