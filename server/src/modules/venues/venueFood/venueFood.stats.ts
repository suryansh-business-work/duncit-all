import type { PipelineStage, Types } from 'mongoose';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { shortLinkService } from '@modules/crm/marketing/shortLink.service';
import { shortLinkClickService } from '@modules/crm/marketing/shortLinkClick.service';
import type { ShareLinkTarget } from '@modules/crm/marketing/shortLink.share';
import { logs } from '@observability/log';
import { getAppTimeZone } from '@utils/app-time';
import { FOOD_ORDER_STATUSES, VenueFoodOrderModel } from './venueFoodOrder.model';
import { FOOD_LOG, FOOD_PAID_STATUSES, managedVenue, rupees } from './venueFoodOrder.shared';
import { VenueSubscriberModel } from './venueSubscriber.model';

/**
 * The venue owner's Food Dashboard: what the QR brought in over a window —
 * orders, money, what sells, what guests said — and how many people scanned
 * the poster and the table labels to get there.
 *
 * One aggregation over the venue's own orders (the `venue_id, created_at`
 * index), so the page costs one read however many tiles it shows.
 */

const MAX_DAYS = 366;
const TOP_ITEMS = 5;
const RECENT_FEEDBACK = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

interface Totals {
  orders: number;
  revenue_paise: number;
  discount_paise: number;
  tax_paise: number;
  coupon_orders: number;
  served: number;
  cancelled: number;
  refunded_paise: number;
  invoice_downloads: number;
  subscribe_opt_ins: number;
}

interface Facets {
  totals: Totals[];
  statuses: Array<{ _id: string; count: number }>;
  items: Array<{ _id: string; quantity: number; revenue_paise: number }>;
  daily: Array<{ _id: string; orders: number; revenue_paise: number }>;
  rating: Array<{ count: number; average: number }>;
  feedback: Array<{
    order_no: string;
    customer_name: string;
    feedback: { rating: number; comment?: string; images?: string[]; submitted_at: Date };
  }>;
}

const sumIf = (condition: Record<string, unknown>, value: unknown = 1) => ({ $sum: { $cond: [condition, value, 0] } });

/** Money counts only where it stayed: a cancelled order's total is a refund, not revenue. */
const KEPT = { $eq: ['$payment_status', 'PAID'] };

function pipeline(venueId: Types.ObjectId, since: Date | null): PipelineStage[] {
  return [
    {
      $match: {
        venue_id: venueId,
        payment_status: { $in: [...FOOD_PAID_STATUSES] },
        ...(since ? { created_at: { $gte: since } } : {}),
      },
    },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              revenue_paise: sumIf(KEPT, '$total_paise'),
              discount_paise: sumIf(KEPT, { $add: ['$discount_paise', '$coupon_discount_paise'] }),
              // An order from before GST has no tax_paise; it counts as none.
              tax_paise: sumIf(KEPT, { $ifNull: ['$tax_paise', 0] }),
              coupon_orders: sumIf({ $gt: ['$coupon_discount_paise', 0] }),
              served: sumIf({ $eq: ['$status', 'SERVED'] }),
              cancelled: sumIf({ $eq: ['$status', 'CANCELLED'] }),
              refunded_paise: sumIf({ $ne: ['$payment_status', 'PAID'] }, '$total_paise'),
              invoice_downloads: { $sum: { $ifNull: ['$invoice_downloads', 0] } },
              subscribe_opt_ins: sumIf({ $eq: ['$subscribe_events', true] }),
            },
          },
        ],
        statuses: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        items: [
          { $match: { payment_status: 'PAID' } },
          { $unwind: '$lines' },
          { $group: { _id: '$lines.name', quantity: { $sum: '$lines.quantity' }, revenue_paise: { $sum: '$lines.line_paise' } } },
          { $sort: { quantity: -1, _id: 1 } },
          { $limit: TOP_ITEMS },
        ],
        daily: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at', timezone: getAppTimeZone() } },
              orders: { $sum: 1 },
              revenue_paise: sumIf(KEPT, '$total_paise'),
            },
          },
          { $sort: { _id: 1 } },
        ],
        rating: [
          { $match: { 'feedback.rating': { $gte: 1 } } },
          { $group: { _id: null, count: { $sum: 1 }, average: { $avg: '$feedback.rating' } } },
        ],
        feedback: [
          { $match: { 'feedback.rating': { $gte: 1 } } },
          { $sort: { 'feedback.submitted_at': -1 } },
          { $limit: RECENT_FEEDBACK },
          { $project: { order_no: 1, customer_name: 1, feedback: 1 } },
        ],
      },
    },
  ];
}

/** Scans of one of the venue's tracked links in the window; 0 when the link was never minted. */
async function scans(target: ShareLinkTarget, venueId: string, days: number): Promise<number> {
  try {
    const link = await shortLinkService.existingShare(target, venueId);
    if (!link) return 0;
    return (await shortLinkClickService.stats(link.id, days)).total_clicks;
  } catch (error) {
    // The scan count is a side number: the dashboard still shows its orders without it.
    logs.server.warn(FOOD_LOG, 'stats', { error, venueId, target, msg: 'scan count unavailable' });
    return 0;
  }
}

const round1 = (value: number) => Math.round(value * 10) / 10;

export const venueFoodStatsService = {
  /** `days` 0 is all time. Owner of the venue, or a venues-console editor. */
  async stats(userId: string, isAdmin: boolean, venueId: string, days?: number | null) {
    const venue = await managedVenue(userId, isAdmin, venueId);
    const window = Math.min(MAX_DAYS, Math.max(0, Math.floor(Number(days) || 0)));
    const since = window ? new Date(Date.now() - window * DAY_MS) : null;
    const id = venue._id.toHexString();

    const [[facets], subscribers, pageScans, tableScans, finance] = await Promise.all([
      VenueFoodOrderModel.aggregate<Facets>(pipeline(venue._id, since)),
      VenueSubscriberModel.countDocuments({ venue_id: venue._id, is_active: true }),
      scans('VENUE_PAGE', id, window),
      scans('VENUE_MENU', id, window),
      getFinanceSettings(),
    ]);

    const totals = facets?.totals[0];
    const kept = (totals?.orders ?? 0) - (totals?.cancelled ?? 0);
    const counts = new Map((facets?.statuses ?? []).map((row) => [row._id, row.count]));
    const rating = facets?.rating[0];
    return {
      days: window,
      currency_symbol: finance.currency_symbol,
      orders: totals?.orders ?? 0,
      revenue: rupees(totals?.revenue_paise ?? 0),
      average_order: kept > 0 ? Math.round((totals?.revenue_paise ?? 0) / kept) / 100 : 0,
      discount_given: rupees(totals?.discount_paise ?? 0),
      tax_collected: rupees(totals?.tax_paise ?? 0),
      coupon_orders: totals?.coupon_orders ?? 0,
      served: totals?.served ?? 0,
      cancelled: totals?.cancelled ?? 0,
      refunded: rupees(totals?.refunded_paise ?? 0),
      invoice_downloads: totals?.invoice_downloads ?? 0,
      subscribe_opt_ins: totals?.subscribe_opt_ins ?? 0,
      subscribers,
      page_scans: pageScans,
      table_scans: tableScans,
      feedback_count: rating?.count ?? 0,
      average_rating: rating ? round1(rating.average) : 0,
      status_counts: FOOD_ORDER_STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 })),
      top_items: (facets?.items ?? []).map((item) => ({
        name: item._id,
        quantity: item.quantity,
        revenue: rupees(item.revenue_paise),
      })),
      daily: (facets?.daily ?? []).map((day) => ({ date: day._id, orders: day.orders, revenue: rupees(day.revenue_paise) })),
      recent_feedback: (facets?.feedback ?? []).map((row) => ({
        order_no: row.order_no,
        customer_name: row.customer_name,
        rating: row.feedback.rating,
        comment: row.feedback.comment ?? '',
        images: row.feedback.images ?? [],
        submitted_at: row.feedback.submitted_at.toISOString(),
      })),
    };
  },
};
