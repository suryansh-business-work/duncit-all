import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { paymentService } from '@modules/finance/payment/payment.service';
import { productReviewService } from '@modules/venues/productReview/productReview.service';
import { storeCatalogService, type StoreSearchInput } from './store.catalog.service';
import { storeStorefrontService } from './store.storefront.service';
import { storeCartService } from './store.cart.service';
import {
  storeCheckoutService,
  type StorePlaceOrderArgs,
  type StoreQuoteArgs,
} from './store.checkout.service';
import { storeOrderService } from './store.order.service';
import { storeReturnService, type ReturnRequestInput } from './store.return.service';
import { storeAutoshipService } from './store.autoship.service';
import { ticketFromStore } from '@modules/support/ticket/ticket.fromStore';
import { badInput, forbidden, notFound, sameSecret, toObjectId } from './store.shared';

/**
 * The storefront's resolvers. Thin on purpose: each hands its arguments to the
 * service that owns the rule, so the rules live in one place.
 */

type Args = Record<string, any>;
type Ctx = GraphQLContext;

/** An order its buyer (or its guest key) may read — for returns and the invoice. */
async function buyerOrder(ctx: Ctx, orderNo: string, accessKey?: string | null) {
  const order = await ProductOrderModel.findOne({ channel: 'PET_STORE', order_no: String(orderNo ?? '').trim() }).select(
    '+access_key'
  );
  if (!order) notFound('Order not found');
  if (order.buyer_id) {
    if (ctx.user?.id && String(order.buyer_id) === String(ctx.user.id)) return order;
    forbidden('Sign in with the account that placed this order');
  }
  if (accessKey && sameSecret(accessKey, order.access_key)) return order;
  forbidden('This order link is not valid');
}

/** A review is for goods the reviewer actually received from the store. */
async function assertPurchased(userId: string, productId: string) {
  const id = toObjectId(productId);
  const bought = id
    ? await ProductOrderModel.exists({
        channel: 'PET_STORE',
        buyer_id: new Types.ObjectId(userId),
        fulfilment_status: 'DELIVERED',
        'line_items.product_id': id,
      })
    : null;
  if (!bought) badInput('You can review a product once it has been delivered to you');
}

export const storeResolvers = {
  Query: {
    storeSettings: () => storeStorefrontService.settings(),
    storeNavigation: () => storeStorefrontService.navigation(),
    storeHome: () => storeStorefrontService.home(),
    storeSearch: (_p: unknown, a: { input: StoreSearchInput }) => storeCatalogService.search(a.input ?? {}),
    storeProduct: (_p: unknown, a: Args) => storeCatalogService.productBySlug(a.slug),
    storeProductsByIds: (_p: unknown, a: Args) => storeCatalogService.productsByIds(a.ids ?? []),
    storeRelatedProducts: (_p: unknown, a: Args) => storeCatalogService.related(a.product_id, a.limit ?? 12),
    storeSuggest: (_p: unknown, a: Args) => storeCatalogService.suggest(a.q),
    storePetType: (_p: unknown, a: Args) => storeStorefrontService.petType(a.slug),
    storeCategory: (_p: unknown, a: Args) => storeStorefrontService.category(a.slug),
    storeCollection: (_p: unknown, a: Args) => storeStorefrontService.collection(a.slug),
    storeBrands: () => storeStorefrontService.brands(),
    storePage: (_p: unknown, a: Args) => storeStorefrontService.page(a.slug),
    storePincodeServiceable: (_p: unknown, a: Args) => storeStorefrontService.pincodeServiceable(a.pincode),
    storeDeliveryCheck: (_p: unknown, a: Args) =>
      storeStorefrontService.deliveryCheck(a.product_id, a.variant_id ?? null, a.pincode),
    storeSitemap: () => storeStorefrontService.sitemap(),
    storeProductReviews: (_p: unknown, a: Args, ctx: Ctx) =>
      productReviewService.listByProduct(a.product_id, ctx.user?.id ?? null),
    storeCart: (_p: unknown, a: Args, ctx: Ctx) => storeCartService.get(ctx, a.cart_token),
    storeWishlist: (_p: unknown, a: Args, ctx: Ctx) => storeCartService.wishlist(ctx, a.cart_token),
    storeWishlistIds: (_p: unknown, a: Args, ctx: Ctx) => storeCartService.wishlistIds(ctx, a.cart_token),
    storeCheckoutQuote: (_p: unknown, a: { input: StoreQuoteArgs }, ctx: Ctx) =>
      storeCheckoutService.quote(ctx, a.input ?? {}),
    storeOrderConfirmation: (_p: unknown, a: Args, ctx: Ctx) =>
      storeCheckoutService.confirmation(ctx, a.payment_doc_id, a.cart_token, a.access_key),
    storeMyOrders: (_p: unknown, _a: Args, ctx: Ctx) => storeOrderService.mine(ctx),
    storeOrder: (_p: unknown, a: Args, ctx: Ctx) => storeOrderService.detail(ctx, a.order_no, a.access_key),
    storeTrackOrder: (_p: unknown, a: Args) => storeOrderService.track(a.order_no, a.contact),
    storeMyReturns: (_p: unknown, _a: Args, ctx: Ctx) => storeReturnService.mine(ctx),
    storeOrderReturns: async (_p: unknown, a: Args, ctx: Ctx) => {
      const order = await buyerOrder(ctx, a.order_no, a.access_key);
      return storeReturnService.forOrder(String(order._id));
    },
    storeInvoicePdf: async (_p: unknown, a: Args, ctx: Ctx) => {
      const order = await buyerOrder(ctx, a.order_no, a.access_key);
      // Ownership is settled above, so the payment read runs as an operator's.
      return paymentService.invoicePdfBase64(String(order.payment_id), '', true);
    },
    storeMySubscriptions: (_p: unknown, _a: Args, ctx: Ctx) => storeAutoshipService.mine(ctx),
  },
  Mutation: {
    storeAddToCart: (_p: unknown, a: Args, ctx: Ctx) =>
      storeCartService.add(ctx, a.cart_token, a.product_id, a.variant_id ?? '', a.qty),
    storeSetCartQty: (_p: unknown, a: Args, ctx: Ctx) =>
      storeCartService.setQty(ctx, a.cart_token, a.product_id, a.variant_id ?? '', a.qty),
    storeClearCart: (_p: unknown, a: Args, ctx: Ctx) => storeCartService.clear(ctx, a.cart_token),
    storeApplyCoupon: (_p: unknown, a: Args, ctx: Ctx) => storeCartService.applyCoupon(ctx, a.cart_token, a.code),
    storeMergeGuest: (_p: unknown, a: Args, ctx: Ctx) => storeCartService.mergeGuest(ctx, a.cart_token),
    storeToggleWishlist: (_p: unknown, a: Args, ctx: Ctx) =>
      storeCartService.toggleWishlist(ctx, a.cart_token, a.product_id),
    storeSubscribeStockAlert: (_p: unknown, a: Args, ctx: Ctx) =>
      storeCartService.subscribeStockAlert(ctx, a.product_id, a.variant_id ?? null, a.email),
    storeRecordView: (_p: unknown, a: Args) => storeCatalogService.recordView(a.product_id),
    storeCreateSupportTicket: (_p: unknown, a: Args, ctx: Ctx) => ticketFromStore(ctx.user?.id ?? null, a.input ?? {}),
    storeRequestCodOtp: (_p: unknown, a: Args, ctx: Ctx) =>
      storeCheckoutService.requestCodOtp(ctx, a.cart_token, a.phone_extension, a.phone_number),
    storeVerifyCodOtp: (_p: unknown, a: Args) => storeCheckoutService.verifyCodOtp(a.challenge_id, a.code),
    storePlaceOrder: (_p: unknown, a: { input: StorePlaceOrderArgs }, ctx: Ctx) =>
      storeCheckoutService.place(ctx, a.input),
    storeVerifyPayment: (_p: unknown, a: Args, ctx: Ctx) => storeCheckoutService.verify(ctx, a.input),
    storeCancelOrder: (_p: unknown, a: Args, ctx: Ctx) =>
      storeOrderService.cancelMine(ctx, a.order_no, a.reason, a.access_key),
    storeRequestReturn: (_p: unknown, a: { input: ReturnRequestInput }, ctx: Ctx) =>
      storeReturnService.request(ctx, a.input),
    storeSubmitReview: async (_p: unknown, a: Args, ctx: Ctx) => {
      const user = requireAuth(ctx);
      await assertPurchased(user.id, a.input?.product_id);
      return productReviewService.create(user.id, a.input);
    },
    storeCreateSubscription: (_p: unknown, a: Args, ctx: Ctx) => storeAutoshipService.create(ctx, a.input),
    storeUpdateSubscription: (_p: unknown, a: Args, ctx: Ctx) => storeAutoshipService.update(ctx, a.id, a.input ?? {}),
    storePauseSubscription: (_p: unknown, a: Args, ctx: Ctx) => storeAutoshipService.pause(ctx, a.id, a.paused),
    storeSkipSubscription: (_p: unknown, a: Args, ctx: Ctx) => storeAutoshipService.skip(ctx, a.id),
    storeCancelSubscription: (_p: unknown, a: Args, ctx: Ctx) => storeAutoshipService.cancel(ctx, a.id),
    storeSubscriptionOrderNow: (_p: unknown, a: Args, ctx: Ctx) =>
      storeAutoshipService.orderNow(ctx, a.id, a.cart_token),
  },
};
