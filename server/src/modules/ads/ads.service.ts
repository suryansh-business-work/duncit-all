import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  AD_POSITIONS,
  AdRequestModel,
  getAdPricing,
  nextAdTraceId,
  type AdPosition,
  type IAdPricing,
  type IAdRequest,
} from './ads.model';

const DAY_MS = 24 * 60 * 60 * 1000;

function fail(message: string, code = 'BAD_USER_INPUT'): never {
  throw new GraphQLError(message, { extensions: { code } });
}

const POSITION_PRICE_FIELD: Record<AdPosition, keyof IAdPricing> = {
  AUTO: 'auto_per_day',
  HOME_BOTTOM: 'home_bottom_per_day',
  SIDEBAR: 'sidebar_per_day',
  EXPLORE_SCROLL: 'explore_scroll_per_day',
  STATUS: 'status_per_day',
  VENUE_LIST: 'venue_list_per_day',
  CLUB_LIST: 'club_list_per_day',
  POD_LIST: 'pod_list_per_day',
  POD_DETAILS: 'pod_details_per_day',
};

export function pricePerDayFor(pricing: IAdPricing, position: AdPosition): number {
  return Number(pricing[POSITION_PRICE_FIELD[position]] ?? 0);
}

/** LIVE/EXPIRED are windows of an APPROVED ad, never stored. */
export function deriveAdStatus(doc: Pick<IAdRequest, 'status' | 'start_at' | 'end_at'>, now = new Date()): string {
  if (doc.status !== 'APPROVED') return doc.status;
  if (now >= doc.end_at) return 'EXPIRED';
  if (now >= doc.start_at) return 'LIVE';
  return 'APPROVED';
}

function toPub(doc: IAdRequest, currencySymbol: string) {
  return {
    id: String(doc._id),
    trace_id: doc.trace_id,
    ad_title: doc.ad_title,
    ad_description: doc.ad_description,
    ad_type: doc.ad_type,
    media_url: doc.media_url,
    position: doc.position,
    start_at: doc.start_at.toISOString(),
    duration_days: doc.duration_days,
    end_at: doc.end_at.toISOString(),
    redirect_url: doc.redirect_url ?? null,
    target_audience: doc.target_audience ?? null,
    status: deriveAdStatus(doc),
    marketing_remarks: doc.marketing_remarks ?? null,
    estimated_cost: doc.estimated_cost,
    approved_cost: doc.approved_cost ?? null,
    currency_symbol: currencySymbol,
    submitted_by: String(doc.submitted_by),
    reviewed_at: doc.reviewed_at?.toISOString() ?? null,
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at.toISOString(),
  };
}

function pricingToPub(p: IAdPricing) {
  return {
    auto_per_day: p.auto_per_day,
    home_bottom_per_day: p.home_bottom_per_day,
    sidebar_per_day: p.sidebar_per_day,
    explore_scroll_per_day: p.explore_scroll_per_day,
    status_per_day: p.status_per_day,
    venue_list_per_day: p.venue_list_per_day,
    club_list_per_day: p.club_list_per_day,
    pod_list_per_day: p.pod_list_per_day,
    pod_details_per_day: p.pod_details_per_day,
    currency_symbol: p.currency_symbol,
  };
}

const AD_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['trace_id', 'ad_title'],
  sortFields: {
    trace_id: 'trace_id',
    ad_title: 'ad_title',
    position: 'position',
    status: 'status',
    start_at: 'start_at',
    duration_days: 'duration_days',
    estimated_cost: 'estimated_cost',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    position: { type: 'enum' },
    ad_type: { type: 'enum' },
    created_at: { type: 'date' },
    start_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const HTTPS_URL = /^https?:\/\//i;

function validateSubmission(input: any): { startAt: Date; endAt: Date } {
  if (!AD_POSITIONS.includes(input.position)) fail('Unknown ad position');
  if (!HTTPS_URL.test(String(input.media_url ?? ''))) {
    fail('Ad media must be uploaded before submitting');
  }
  if (input.redirect_url && !HTTPS_URL.test(String(input.redirect_url))) {
    fail('Redirect URL must start with http(s)://');
  }
  const days = Number(input.duration_days);
  if (!Number.isInteger(days) || days < 1 || days > 30) {
    fail('Duration must be between 1 day and 1 month');
  }
  const startAt = new Date(input.start_at);
  if (Number.isNaN(startAt.getTime())) fail('Invalid start date');
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (startAt < startOfToday) fail('Start date cannot be in the past');
  return { startAt, endAt: new Date(startAt.getTime() + days * DAY_MS) };
}

export const adsService = {
  async pricing() {
    return pricingToPub(await getAdPricing());
  },

  async updatePricing(input: Record<string, unknown>) {
    const pricing = await getAdPricing();
    const editable = [...Object.values(POSITION_PRICE_FIELD), 'currency_symbol'] as const;
    for (const field of editable) {
      const value = input[field] as string | number | null | undefined;
      if (value === undefined || value === null) continue;
      if (field === 'currency_symbol') {
        const symbol = String(value).trim();
        if (!symbol) fail('Currency symbol is required');
        pricing.currency_symbol = symbol;
      } else {
        const price = Number(value);
        if (!Number.isFinite(price) || price < 0) fail(`Invalid price for ${field}`);
        (pricing as any)[field] = price;
      }
    }
    await pricing.save();
    return pricingToPub(pricing);
  },

  async submit(userId: string, input: any) {
    const { startAt, endAt } = validateSubmission(input);
    const pricing = await getAdPricing();
    const estimated = pricePerDayFor(pricing, input.position) * Number(input.duration_days);
    const doc = await AdRequestModel.create({
      trace_id: await nextAdTraceId(),
      ad_title: String(input.ad_title).trim(),
      ad_description: String(input.ad_description).trim(),
      ad_type: input.ad_type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      media_url: String(input.media_url).trim(),
      position: input.position,
      start_at: startAt,
      duration_days: Number(input.duration_days),
      end_at: endAt,
      redirect_url: input.redirect_url ? String(input.redirect_url).trim() : null,
      target_audience: input.target_audience ? String(input.target_audience).trim() : null,
      status: 'PENDING',
      estimated_cost: estimated,
      submitted_by: new Types.ObjectId(userId),
    });
    return toPub(doc, pricing.currency_symbol);
  },

  async review(reviewerId: string, id: string, approve: boolean, remarks?: string | null) {
    if (!Types.ObjectId.isValid(id)) fail('Ad request not found', 'NOT_FOUND');
    const doc = await AdRequestModel.findById(id);
    if (!doc) fail('Ad request not found', 'NOT_FOUND');
    if (doc.status !== 'PENDING') fail('Only pending requests can be reviewed');
    const pricing = await getAdPricing();
    doc.status = approve ? 'APPROVED' : 'REJECTED';
    doc.marketing_remarks = remarks?.trim() || null;
    doc.reviewed_by = new Types.ObjectId(reviewerId);
    doc.reviewed_at = new Date();
    if (approve) {
      // Freeze the bill at approval time; later pricing edits don't change it.
      doc.approved_cost = pricePerDayFor(pricing, doc.position) * doc.duration_days;
    }
    await doc.save();
    return toPub(doc, pricing.currency_symbol);
  },

  /**
   * Advertiser dashboard KPIs, computed in-memory over the caller's own ads
   * (advertiser volumes are small). Counts bucket every ad by its DERIVED
   * status; "approved" therefore means approved-but-not-started.
   */
  async myDashboard(userId: string) {
    const [pricing, docs] = await Promise.all([
      getAdPricing(),
      AdRequestModel.find({ submitted_by: new Types.ObjectId(userId) }),
    ]);
    const now = new Date();
    const counts = { PENDING: 0, APPROVED: 0, LIVE: 0, REJECTED: 0, EXPIRED: 0 };
    let totalEstimated = 0;
    let totalApproved = 0;
    let liveSpend = 0;
    let next: IAdRequest | null = null;
    for (const doc of docs) {
      const status = deriveAdStatus(doc, now) as keyof typeof counts;
      counts[status] += 1;
      totalEstimated += doc.estimated_cost;
      if (doc.status !== 'APPROVED') continue;
      totalApproved += doc.approved_cost ?? 0;
      if (status === 'LIVE') liveSpend += doc.approved_cost ?? 0;
      // Derived APPROVED means the start is still in the future — keep the soonest.
      if (status === 'APPROVED' && (!next || doc.start_at < next.start_at)) next = doc;
    }
    return {
      total: docs.length,
      pending: counts.PENDING,
      approved: counts.APPROVED,
      live: counts.LIVE,
      rejected: counts.REJECTED,
      expired: counts.EXPIRED,
      total_estimated_cost: totalEstimated,
      total_approved_cost: totalApproved,
      live_spend: liveSpend,
      next_start_at: next ? next.start_at.toISOString() : null,
      next_start_title: next ? next.ad_title : null,
      currency_symbol: pricing.currency_symbol,
    };
  },

  async myTable(userId: string, input?: TableQueryInput) {
    const pricing = await getAdPricing();
    const { docs, total, page, page_size } = await runTableQuery<IAdRequest>(
      AdRequestModel,
      { submitted_by: new Types.ObjectId(userId) },
      input,
      AD_TABLE_CONFIG
    );
    return { rows: docs.map((d) => toPub(d, pricing.currency_symbol)), total, page, page_size };
  },

  async table(input?: TableQueryInput) {
    const pricing = await getAdPricing();
    const { docs, total, page, page_size } = await runTableQuery<IAdRequest>(
      AdRequestModel,
      {},
      input,
      AD_TABLE_CONFIG
    );
    return { rows: docs.map((d) => toPub(d, pricing.currency_symbol)), total, page, page_size };
  },

  async byId(id: string, viewer: { id: string; canReview: boolean }) {
    if (!Types.ObjectId.isValid(id)) fail('Ad request not found', 'NOT_FOUND');
    const doc = await AdRequestModel.findById(id);
    if (!doc) fail('Ad request not found', 'NOT_FOUND');
    if (!viewer.canReview && String(doc.submitted_by) !== viewer.id) {
      fail('You do not have access to this ad request', 'FORBIDDEN');
    }
    const pricing = await getAdPricing();
    return toPub(doc, pricing.currency_symbol);
  },

  /** Live ads for a placement. AUTO ads are eligible everywhere. */
  async activeAds(position: AdPosition) {
    if (!AD_POSITIONS.includes(position)) fail('Unknown ad position');
    const now = new Date();
    const positions: AdPosition[] = position === 'AUTO' ? ['AUTO'] : [position, 'AUTO'];
    const docs = await AdRequestModel.find({
      status: 'APPROVED',
      start_at: { $lte: now },
      end_at: { $gt: now },
      position: { $in: positions },
    }).sort({ created_at: -1 });
    return docs.map((d) => ({
      id: String(d._id),
      ad_type: d.ad_type,
      media_url: d.media_url,
      redirect_url: d.redirect_url ?? null,
      ad_title: d.ad_title,
      position: d.position,
    }));
  },

  async submittedByName(userId: string): Promise<string> {
    const user = await UserModel.findById(userId).select('profile.first_name profile.last_name');
    if (!user) return '';
    const profile = (user as any).profile ?? {};
    return `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
  },
};
