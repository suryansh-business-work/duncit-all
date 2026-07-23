import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PaymentReleaseModel } from '@modules/finance/finance/paymentRelease.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';

/** Order states that never count toward a partner's e-commerce sales. */
const EXCLUDED_ORDER_STATUSES = ['CANCELLED', 'FAILED', 'RTO'];

interface DashboardRange {
  from: string;
  to: string;
}

interface EarningsParts {
  venue?: number;
  host?: number;
  product?: number;
}

function parseRange(range: DashboardRange) {
  const from = new Date(range.from);
  const to = new Date(range.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new GraphQLError('Select a valid dashboard date range', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  if (from.getTime() > to.getTime()) {
    throw new GraphQLError('From date must be before to date', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return { from, to };
}

const money = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

function podGross(pods: any[]) {
  return money(pods.reduce((sum, pod) => sum + Number(pod.pod_amount || 0) * (pod.pod_attendees?.length || 0), 0));
}

function releaseTotal(docs: any[]) {
  return money(docs.reduce((sum, doc) => sum + Number(doc.approved_amount ?? doc.amount_requested ?? 0), 0));
}

const clampPct = (n: number) => Math.min(100, Math.max(0, Number(n) || 0));

/**
 * A partner's product earning is the NET of the Duncit commission (gross −
 * commission), mirroring the product invoice/payout (productInvoice.service).
 * Netting keeps product on the same "actual earning" footing as the venue/host
 * payout releases, so Summary Total reflects real earning rather than gross retail.
 */
function productTotal(pods: any[], productIds: Set<string>, commissionByProduct: Map<string, number>) {
  return money(pods.reduce((sum, pod) => {
    const items = pod.product_requests ?? [];
    return sum + items.reduce((itemSum: number, item: any) => {
      const pid = String(item.product_id);
      if (!productIds.has(pid)) return itemSum;
      const gross = Number(item.total_cost ?? Number(item.unit_cost || 0) * Number(item.quantity || 0));
      const pct = commissionByProduct.get(pid) ?? 0;
      return itemSum + gross * (1 - pct / 100);
    }, 0);
  }, 0));
}

function uniquePods(groups: any[][]) {
  const byId = new Map<string, any>();
  groups.flat().forEach((pod) => byId.set(String(pod._id), pod));
  return Array.from(byId.values());
}

function metrics(pods: any[], earnings: EarningsParts, addedSlots = 0) {
  const venue = money(earnings.venue ?? 0);
  const host = money(earnings.host ?? 0);
  const product = money(earnings.product ?? 0);
  return {
    total_earning: money(venue + host + product),
    number_of_pods: pods.length,
    pods_earning: podGross(pods),
    venue_earning: venue,
    host_earning: host,
    product_earning: product,
    added_slots: addedSlots,
  };
}

export const partnerDashboardService = {
  /** Venue KPI cards for the partner portal's Venue Dashboard. Scope = one of
   * the owner's venues (venue_id) or all of them. Potential earning = the value
   * of the whole upcoming published calendar (every future slot's price). */
  async venueStats(userId: string, venueId?: string | null) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    const owner = new Types.ObjectId(userId);
    const venueFilter: any = { owner_user_id: owner };
    if (venueId) {
      if (!Types.ObjectId.isValid(venueId)) {
        throw new GraphQLError('Invalid venue id', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      venueFilter._id = new Types.ObjectId(venueId);
    }
    const venues = await VenueModel.find(venueFilter).select('_id status capacity').lean();
    if (venueId && venues.length === 0) {
      throw new GraphQLError('Venue not found or not yours', { extensions: { code: 'NOT_FOUND' } });
    }
    const venueIds = venues.map((v) => v._id);

    const byStatus = new Map<string, { count: number; total: number }>();
    if (venueIds.length) {
      const rows = await VenueSlotModel.aggregate([
        { $match: { venue_id: { $in: venueIds }, start_at: { $gte: new Date() } } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$price' } } },
      ]);
      rows.forEach((r: any) => byStatus.set(String(r._id), { count: r.count ?? 0, total: r.total ?? 0 }));
    }
    const stat = (status: string) => byStatus.get(status) ?? { count: 0, total: 0 };
    const upcoming = ['AVAILABLE', 'PENDING', 'BOOKED'].map(stat);

    return {
      total_venues: venues.length,
      approved_venues: venues.filter((v) => v.status === 'APPROVED').length,
      total_capacity: venues.reduce((sum, v) => sum + (v.capacity ?? 0), 0),
      potential_earning: upcoming.reduce((sum, s) => sum + s.total, 0),
      booked_earning: stat('BOOKED').total,
      upcoming_slots: upcoming.reduce((sum, s) => sum + s.count, 0),
      booked_slots: stat('BOOKED').count,
      pending_requests: stat('PENDING').count,
    };
  },

  /** E-commerce KPI cards for the partner portal's E-Commerce Dashboard. Scope =
   * one of the owner's brands (brand_doc_id) or all of them. Sales figures come
   * from ProductOrder line items only (pod product_requests earnings are a
   * separate stream on the main dashboard). */
  async ecommStats(userId: string, brandDocId?: string | null) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    const brandFilter: any = { owner_user_id: new Types.ObjectId(userId) };
    if (brandDocId) {
      if (!Types.ObjectId.isValid(brandDocId)) {
        throw new GraphQLError('Invalid brand id', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      brandFilter._id = new Types.ObjectId(brandDocId);
    }
    const brands = await EcommBrandModel.find(brandFilter).select('_id status').lean();
    if (brandDocId && brands.length === 0) {
      throw new GraphQLError('Brand not found or not yours', { extensions: { code: 'NOT_FOUND' } });
    }
    const brandIds = brands.map((b) => b._id);

    const productScope = { brand_id: { $in: brandIds }, ownership: 'BRAND' };
    const [totalProducts, approvedProducts, totalWarehouses] = brandIds.length
      ? await Promise.all([
          InventoryProductModel.countDocuments(productScope),
          InventoryProductModel.countDocuments({ ...productScope, listing_review_status: 'APPROVED' }),
          BrandPickupLocationModel.countDocuments({ owner_kind: 'BRAND', brand_id: { $in: brandIds } }),
        ])
      : [0, 0, 0];

    const orderRows = brandIds.length
      ? await ProductOrderModel.aggregate([
          {
            $match: {
              'line_items.brand_id': { $in: brandIds },
              fulfilment_status: { $nin: EXCLUDED_ORDER_STATUSES },
            },
          },
          { $unwind: '$line_items' },
          { $match: { 'line_items.brand_id': { $in: brandIds } } },
          {
            $group: {
              _id: null,
              items: { $sum: '$line_items.qty' },
              revenue: { $sum: '$line_items.gross' },
              orders: { $addToSet: '$_id' },
            },
          },
        ])
      : [];
    const orderAgg = orderRows[0] ?? { items: 0, revenue: 0, orders: [] };

    return {
      total_brands: brands.length,
      approved_brands: brands.filter((b) => b.status === 'APPROVED').length,
      total_products: totalProducts,
      approved_products: approvedProducts,
      total_warehouses: totalWarehouses,
      total_orders: orderAgg.orders.length,
      total_items_sold: orderAgg.items,
      gross_revenue: money(orderAgg.revenue),
    };
  },

  async get(userId: string, range: DashboardRange) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    const userObjectId = new Types.ObjectId(userId);
    const { from, to } = parseRange(range);
    const podDateFilter = { pod_date_time: { $gte: from, $lte: to } };

    const [venues, products] = await Promise.all([
      VenueModel.find({ owner_user_id: userObjectId }).select('_id status').lean(),
      InventoryProductModel.find({ listing_submitted_by_id: userId })
        .select('_id listing_review_status commission_pct brand_id')
        .lean(),
    ]);
    const venueIds = venues.map((venue) => venue._id);
    const productIds = products.map((product) => product._id);
    const productIdSet = new Set(productIds.map(String));

    // Duncit commission per product (brand override → per-product → global
    // default) so product earning is netted like venue/host settled payouts.
    const fs = await getFinanceSettings();
    const brandIds = [...new Set(products.map((p: any) => String(p.brand_id ?? '')).filter(Boolean))];
    const brands = brandIds.length
      ? await EcommBrandModel.find({ _id: { $in: brandIds } }).select('product_commission_pct').lean()
      : [];
    const brandPctById = new Map(brands.map((b: any) => [String(b._id), b.product_commission_pct ?? 0]));
    const commissionByProduct = new Map<string, number>(
      products.map((p: any) => {
        const brandPct = p.brand_id ? brandPctById.get(String(p.brand_id)) ?? 0 : 0;
        return [String(p._id), clampPct(brandPct || p.commission_pct || fs.default_product_commission_pct)];
      }),
    );

    // Pods drive pod counts + product earning (current membership, in range).
    const [hostPods, venuePods, productPods] = await Promise.all([
      PodModel.find({ pod_hosts_id: userObjectId, ...podDateFilter }).lean(),
      venueIds.length ? PodModel.find({ venue_id: { $in: venueIds }, ...podDateFilter }).lean() : [],
      productIds.length ? PodModel.find({ 'product_requests.product_id': { $in: productIds }, ...podDateFilter }).lean() : [],
    ]);

    // Venue/host earning = APPROVED payout releases whose IMMUTABLE beneficiary
    // (venue_id / host_user_id, stamped when the pod settled) is this partner,
    // AND whose pod falls in the selected range. Keying on the release's own
    // beneficiary + pod date — not the pod's CURRENT venue/host membership —
    // puts all three streams on the same pod-date basis as the displayed
    // activity WITHOUT dropping a real settled earning when a pod is later
    // reassigned to a different host/venue.
    const [venueReleasesAll, hostReleasesAll] = await Promise.all([
      venueIds.length
        ? PaymentReleaseModel.find({ kind: 'VENUE_BILLING', status: 'APPROVED', venue_id: { $in: venueIds } })
            .select('approved_amount amount_requested pod_id')
            .lean()
        : [],
      PaymentReleaseModel.find({ kind: 'HOST_PAYMENT', status: 'APPROVED', host_user_id: userObjectId })
        .select('approved_amount amount_requested pod_id')
        .lean(),
    ]);
    const releasePodIds = [
      ...new Set([...venueReleasesAll, ...hostReleasesAll].map((r) => String(r.pod_id))),
    ];
    const inRangeReleasePods = releasePodIds.length
      ? await PodModel.find({ _id: { $in: releasePodIds }, ...podDateFilter }).select('_id').lean()
      : [];
    const inRangeReleasePodSet = new Set(inRangeReleasePods.map((p) => String(p._id)));
    const venueReleases = venueReleasesAll.filter((r) => inRangeReleasePodSet.has(String(r.pod_id)));
    const hostReleases = hostReleasesAll.filter((r) => inRangeReleasePodSet.has(String(r.pod_id)));

    const summaryPods = uniquePods([hostPods, venuePods, productPods]);
    const venueEarning = releaseTotal(venueReleases);
    const hostEarning = releaseTotal(hostReleases);
    const summaryProductEarning = productTotal(productPods, productIdSet, commissionByProduct);

    // Upcoming, still-available slots the owner has published across their venues.
    const addedSlots = venueIds.length
      ? await VenueSlotModel.countDocuments({
          venue_id: { $in: venueIds },
          status: 'AVAILABLE',
          start_at: { $gte: new Date() },
        })
      : 0;

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      summary: metrics(summaryPods, { venue: venueEarning, host: hostEarning, product: summaryProductEarning }, addedSlots),
      venue: metrics(venuePods, { venue: venueEarning, product: productTotal(venuePods, productIdSet, commissionByProduct) }, addedSlots),
      host: metrics(hostPods, { host: hostEarning, product: productTotal(hostPods, productIdSet, commissionByProduct) }),
      products: metrics(productPods, { product: summaryProductEarning }),
    };
  },
};