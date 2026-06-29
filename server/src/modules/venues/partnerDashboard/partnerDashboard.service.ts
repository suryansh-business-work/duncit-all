import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PaymentReleaseModel } from '@modules/finance/finance/paymentRelease.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';

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

function productTotal(pods: any[], productIds: Set<string>) {
  return money(pods.reduce((sum, pod) => {
    const items = pod.product_requests ?? [];
    return sum + items.reduce((itemSum: number, item: any) => {
      if (!productIds.has(String(item.product_id))) return itemSum;
      return itemSum + Number(item.total_cost ?? Number(item.unit_cost || 0) * Number(item.quantity || 0));
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
  async get(userId: string, range: DashboardRange) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new GraphQLError('Authentication required', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    const userObjectId = new Types.ObjectId(userId);
    const { from, to } = parseRange(range);
    const podDateFilter = { pod_date_time: { $gte: from, $lte: to } };
    const releaseDateFilter = { reviewed_at: { $gte: from, $lte: to } };

    const [venues, products] = await Promise.all([
      VenueModel.find({ owner_user_id: userObjectId }).select('_id status').lean(),
      InventoryProductModel.find({ listing_submitted_by_id: userId }).select('_id listing_review_status').lean(),
    ]);
    const venueIds = venues.map((venue) => venue._id);
    const productIds = products.map((product) => product._id);
    const productIdSet = new Set(productIds.map(String));

    const [hostPods, venuePods, productPods, venueReleases, hostReleases] = await Promise.all([
      PodModel.find({ pod_hosts_id: userObjectId, ...podDateFilter }).lean(),
      venueIds.length ? PodModel.find({ venue_id: { $in: venueIds }, ...podDateFilter }).lean() : [],
      productIds.length ? PodModel.find({ 'product_requests.product_id': { $in: productIds }, ...podDateFilter }).lean() : [],
      venueIds.length
        ? PaymentReleaseModel.find({ kind: 'VENUE_BILLING', status: 'APPROVED', venue_id: { $in: venueIds }, ...releaseDateFilter }).lean()
        : [],
      PaymentReleaseModel.find({ kind: 'HOST_PAYMENT', status: 'APPROVED', host_user_id: userObjectId, ...releaseDateFilter }).lean(),
    ]);

    const summaryPods = uniquePods([hostPods, venuePods, productPods]);
    const venueEarning = releaseTotal(venueReleases);
    const hostEarning = releaseTotal(hostReleases);
    const summaryProductEarning = productTotal(productPods, productIdSet);

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
      venue: metrics(venuePods, { venue: venueEarning, product: productTotal(venuePods, productIdSet) }, addedSlots),
      host: metrics(hostPods, { host: hostEarning, product: productTotal(hostPods, productIdSet) }),
      products: metrics(productPods, { product: summaryProductEarning }),
    };
  },
};