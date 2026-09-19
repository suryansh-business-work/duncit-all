import type { GraphQLContext } from '@context';
import type { IStoreSettings } from './storeSettings.model';
import { storeAdminMerchService } from './store.admin.merch.service';
import { storeAdminCatalogService } from './store.admin.catalog.service';
import { storeAdminProductsService } from './store.admin.products.service';
import { storeAdminPackagingService } from './store.admin.packaging.service';
import { storeOrderService } from './store.order.service';
import { storeReturnService } from './store.return.service';
import { storeDashboardService } from './store.dashboard.service';
import { storeAutoshipService } from './store.autoship.service';
import { requireStoreAdmin, iso } from './store.shared';

/**
 * The ecomm portal's resolvers. Every field is gated here, before it reaches a
 * service — a hidden button in the portal is never the only thing between a
 * shopper and an operator's write.
 */

type Args = Record<string, any>;
type Ctx = GraphQLContext;

/** Wrap a resolver so it only runs for the store's operators. */
const admin =
  <A extends Args>(run: (args: A, ctx: Ctx) => unknown) =>
  (_p: unknown, args: A, ctx: Ctx) => {
    requireStoreAdmin(ctx);
    return run(args, ctx);
  };

const settingsOut = (s: IStoreSettings | null) => {
  const plain = (s as any)?.toObject?.() ?? s ?? {};
  return {
    ...plain,
    social_links: (plain.social_links ?? []).map((l: Args) => ({ label: l.label, url: l.url })),
    updated_at: iso(plain.updated_at) ?? '',
  };
};

export const storeAdminResolvers = {
  Query: {
    storeAdminSettings: admin(async () => settingsOut(await storeAdminMerchService.settings())),
    storeAdminPetTypes: admin(() => storeAdminMerchService.petTypes()),
    storeAdminCategories: admin(() => storeAdminMerchService.categories()),
    storeAdminFacets: admin(() => storeAdminMerchService.facets()),
    storeAdminCollections: admin(() => storeAdminMerchService.collections()),
    storeAdminCollection: admin((a) => storeAdminMerchService.collection(a.id)),
    storeAdminCollectionPreview: admin((a) => storeAdminMerchService.previewCollection(a.slug)),
    storeAdminPickerProducts: admin((a) => storeAdminMerchService.productsForPicker(a.ids ?? [])),
    storeAdminSections: admin(() => storeAdminMerchService.sections()),
    storeAdminProductsTable: admin((a) => storeAdminProductsService.table(a.query)),
    storeAdminProduct: admin((a) => storeAdminProductsService.get(a.id)),
    storeAdminWarehouses: admin(() => storeAdminProductsService.warehouses()),
    storeAdminBrands: admin(() => storeAdminMerchService.brands()),
    storeAdminRazorpayAccounts: admin(() => storeAdminMerchService.razorpayAccounts()),
    storePackagingExport: admin((a) => storeAdminPackagingService.exportRows(a.product_ids)),
    storeOrdersTable: admin((a) => storeOrderService.table(a.query)),
    storeAdminOrder: admin((a) => storeOrderService.adminDetail(a.id)),
    storeCustomerOrders: admin((a) => storeOrderService.forCustomer(a.email)),
    storeReturnsTable: admin((a) => storeReturnService.table(a.query)),
    storeAdminReturn: admin((a) => storeReturnService.get(a.id)),
    storeReturnsForOrder: admin((a) => storeReturnService.forOrder(a.order_id)),
    storeCustomersTable: admin((a) => storeAdminCatalogService.customersTable(a.query)),
    storeCartsTable: admin((a) => storeAdminCatalogService.cartsTable(a.query, a.abandoned_only !== false)),
    storeStockAlertsTable: admin((a) => storeAdminCatalogService.alertsTable(a.query)),
    storeReviewsTable: admin((a) => storeAdminCatalogService.reviewsTable(a.query)),
    storeCouponsTable: admin((a) => storeAdminCatalogService.couponsTable(a.query)),
    storeDashboard: admin((a) => storeDashboardService.overview(Number(a.days) || 30)),
    storeSubscriptionsTable: admin((a) => storeAutoshipService.table(a.query)),
  },
  Mutation: {
    storeSaveSettings: admin(async (a, ctx) => settingsOut(await storeAdminMerchService.saveSettings(ctx, a.input))),
    storeSavePetType: admin((a) => storeAdminMerchService.savePetType(a.id, a.input)),
    storeDeletePetType: admin((a) => storeAdminMerchService.deletePetType(a.id)),
    storeReorderPetTypes: admin((a) => storeAdminMerchService.reorderPetTypes(a.ids)),
    storeSaveCategory: admin((a) => storeAdminMerchService.saveCategory(a.id, a.input)),
    storeDeleteCategory: admin((a) => storeAdminMerchService.deleteCategory(a.id)),
    storeReorderCategories: admin((a) => storeAdminMerchService.reorderCategories(a.ids)),
    storeSaveFacet: admin((a) => storeAdminMerchService.saveFacet(a.id, a.input)),
    storeDeleteFacet: admin((a) => storeAdminMerchService.deleteFacet(a.id)),
    storeReorderFacets: admin((a) => storeAdminMerchService.reorderFacets(a.ids)),
    storeSaveCollection: admin((a) => storeAdminMerchService.saveCollection(a.id, a.input)),
    storeDeleteCollection: admin((a) => storeAdminMerchService.deleteCollection(a.id)),
    storeReorderCollections: admin((a) => storeAdminMerchService.reorderCollections(a.ids)),
    storeSaveSection: admin((a) => storeAdminMerchService.saveSection(a.id, a.input)),
    storeDeleteSection: admin((a) => storeAdminMerchService.deleteSection(a.id)),
    storeReorderSections: admin((a) => storeAdminMerchService.reorderSections(a.ids)),
    storeSaveProduct: admin((a, ctx) => storeAdminProductsService.save(String(ctx.user?.id), a.id, a.input, a.status)),
    storeSetProductStatus: admin((a) => storeAdminProductsService.setStatus(a.ids, a.status)),
    storeBulkSetPackaging: admin((a) => storeAdminPackagingService.bulkSet(a.product_ids, a.input)),
    storeImportPackaging: admin((a) => storeAdminPackagingService.importRows(a.rows)),
    storeBulkFile: admin((a) =>
      storeAdminProductsService.bulkFile(a.product_ids, a.pet_type_ids ?? [], a.category_ids ?? [])
    ),
    storeSaveBrand: admin((a) => storeAdminMerchService.saveBrand(a.id, a.input)),
    storeDeleteBrand: admin((a) => storeAdminMerchService.deleteBrand(a.id)),
    storeReorderBrands: admin((a) => storeAdminMerchService.reorderBrands(a.ids)),
    storeUpdateOrderStatus: admin((a) => storeOrderService.updateStatus(a.id, a.status, a.note ?? '')),
    storeAddOrderNote: admin((a, ctx) => storeOrderService.addNote(ctx, a.id, a.text)),
    storeAdminCancelOrder: admin((a, ctx) => storeOrderService.adminCancel(ctx, a.id, a.reason, a.refund_mode)),
    storeMarkCodCollected: admin((a) => storeOrderService.markCodCollected(a.id)),
    storeCreateShipment: admin((a) => storeOrderService.createShipment(a.id)),
    storeRefreshTracking: admin((a) => storeOrderService.refreshTracking(a.id)),
    storeUpdateReturn: admin((a, ctx) => storeReturnService.update(ctx, a.id, a.input)),
    storeRemindCart: admin((a) => storeAdminCatalogService.remindCart(a.id)),
    storeSendBackInStock: admin(() => storeAdminCatalogService.sendBackInStock()),
    storeDeleteReview: admin((a) => storeAdminCatalogService.deleteReview(a.id)),
    storeReplyReview: admin((a) => storeAdminCatalogService.replyReview(a.id, a.reply)),
    storeSaveCoupon: admin((a) => storeAdminCatalogService.saveCoupon(a.id, a.input)),
    storeDeleteCoupon: admin((a) => storeAdminCatalogService.deleteCoupon(a.id)),
    storeAdminSetSubscriptionStatus: admin((a) => storeAutoshipService.adminSetStatus(a.id, a.status)),
  },
};
