import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  AD_KINDS,
  AD_MAX_DAYS_DEFAULT,
  AD_MIN_DAYS_DEFAULT,
  AD_POSITIONS,
  AdRequestModel,
  getAdPricing,
  nextAdTraceId,
  type AdKind,
  type AdPosition,
  type IAdPricing,
  type IAdRequest,
} from './ads.model';
import { logs } from '@observability/log';
import { sendEmail } from '@services/email/email.service';
import { getUrlConfigs } from '@config/url-configs';
import { trimTrailingSlash } from '@utils/url';

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

/**
 * Placement names for the PUBLIC rate card.
 *
 * Deliberately not the portal's labels (`@duncit/ad-request-form`), and not
 * importable from them either — `server/src` depends on no `@duncit/*` package
 * by design. The portal names a field an advertiser is filling in; this names a
 * thing someone is deciding whether to buy, so it says where the ad appears.
 */
const POSITION_COPY: Record<AdPosition, { label: string; note: string }> = {
  AUTO: {
    label: 'Everywhere (all placements)',
    note: 'One booking, every surface below — the widest reach we sell.',
  },
  HOME_BOTTOM: { label: 'Home feed', note: 'A banner under the feed everyone lands on.' },
  SIDEBAR: { label: 'Sidebar', note: 'Beside the content, on every screen that has one.' },
  EXPLORE_SCROLL: {
    label: 'Explore scroll',
    note: 'In the browse stream, while people are still deciding.',
  },
  STATUS: {
    label: 'Stories',
    note: 'Full screen, between the stories people are already watching.',
  },
  VENUE_LIST: { label: 'Venue listings', note: 'Against the venues in someone’s own city.' },
  CLUB_LIST: { label: 'Club listings', note: 'Against the clubs someone is choosing between.' },
  POD_LIST: { label: 'Pod listings', note: 'Against the pods someone is scrolling through.' },
  POD_DETAILS: { label: 'Pod detail pages', note: 'On the page someone reads before they book.' },
};

/**
 * The live copy for one placement: Marketing's words if they wrote any, ours
 * otherwise. A blank override is treated as "not set" rather than as an empty
 * label, so clearing a field restores the default instead of emptying the card.
 */
function placementCopy(pricing: IAdPricing, position: AdPosition) {
  const override = (pricing.placements ?? []).find((row) => row.position === position);
  const fallback = POSITION_COPY[position];
  return {
    label: override?.label?.trim() || fallback.label,
    note: override?.note?.trim() || fallback.note,
  };
}

/**
 * The booking window in force right now.
 *
 * Clamped rather than trusted: a row saved with max below min would make every
 * submission impossible and every slider empty, and the setting is a text box.
 */
export function adDayWindow(pricing: IAdPricing): { min: number; max: number } {
  const min = Math.max(1, Math.round(Number(pricing.min_days) || AD_MIN_DAYS_DEFAULT));
  const max = Math.max(min, Math.round(Number(pricing.max_days) || AD_MAX_DAYS_DEFAULT));
  return { min, max };
}

/**
 * The rate card as the marketing site reads it: every placement, what a day
 * costs, and the booking window. Public on purpose — a price quoted on a public
 * page has to come from the same row Marketing edits, or the page will one day
 * be advertising a price nobody honours.
 */
export async function buildPublicRateCard() {
  const pricing = await getAdPricing();
  const entries = AD_POSITIONS.map((position) => ({
    position,
    ...placementCopy(pricing, position),
    price_per_day: pricePerDayFor(pricing, position),
  }));
  const prices = entries.map((entry) => entry.price_per_day);
  const window = adDayWindow(pricing);

  return {
    currency_symbol: pricing.currency_symbol || '₹',
    entries,
    min_days: window.min,
    max_days: window.max,
    from_per_day: Math.min(...prices),
    to_per_day: Math.max(...prices),
  };
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
    ad_kind: doc.ad_kind ?? 'PLACEMENT',
    brand_id: doc.brand_id ? String(doc.brand_id) : null,
    product_id: doc.product_id ? String(doc.product_id) : null,
    brand_name: doc.brand_name ?? null,
    product_name: doc.product_name ?? null,
    product_image: doc.product_image ?? null,
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
  const window = adDayWindow(p);
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
    min_days: window.min,
    max_days: window.max,
    // Resolved, never raw: the form edits what the public page shows, so an
    // untouched placement must arrive carrying the default rather than blank.
    placements: AD_POSITIONS.map((position) => ({ position, ...placementCopy(p, position) })),
  };
}

/**
 * The booking window, if the caller sent one.
 *
 * Rejected rather than clamped on the way IN: silently widening what somebody
 * typed is how a setting stops meaning what the page says it means. The reader
 * still clamps, for rows written before this validation existed.
 */
function applyDayWindow(pricing: IAdPricing, input: Record<string, unknown>) {
  const asDays = (value: unknown, name: string) => {
    const days = Number(value);
    if (!Number.isInteger(days) || days < 1) fail(`${name} must be a whole number of days`);
    return days;
  };
  const min = input.min_days == null ? pricing.min_days : asDays(input.min_days, 'Minimum days');
  const max = input.max_days == null ? pricing.max_days : asDays(input.max_days, 'Maximum days');
  if (max < min) fail('Maximum days cannot be shorter than minimum days');
  pricing.min_days = min;
  pricing.max_days = max;
}

/**
 * The names and descriptions, if the caller sent any.
 *
 * Only the placements actually named are touched, and a blank field clears the
 * override rather than storing an empty label — which is what makes "clear it
 * to get ours back" work.
 */
function applyPlacementCopy(pricing: IAdPricing, input: Record<string, unknown>) {
  const rows = input.placements as { position?: string; label?: string; note?: string }[] | undefined;
  if (!Array.isArray(rows)) return;
  const kept = new Map((pricing.placements ?? []).map((row) => [row.position, row]));
  for (const row of rows) {
    const position = row.position as AdPosition;
    if (!AD_POSITIONS.includes(position)) fail('Unknown ad position');
    kept.set(position, {
      position,
      label: String(row.label ?? '').trim(),
      note: String(row.note ?? '').trim(),
    });
  }
  pricing.placements = [...kept.values()].filter((row) => row.label || row.note);
}

const AD_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['trace_id', 'ad_title'],
  sortFields: {
    trace_id: 'trace_id',
    ad_kind: 'ad_kind',
    ad_title: 'ad_title',
    position: 'position',
    status: 'status',
    start_at: 'start_at',
    duration_days: 'duration_days',
    estimated_cost: 'estimated_cost',
    created_at: 'created_at',
  },
  filterFields: {
    ad_kind: { type: 'enum' },
    status: { type: 'enum' },
    position: { type: 'enum' },
    ad_type: { type: 'enum' },
    created_at: { type: 'date' },
    start_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const HTTPS_URL = /^https?:\/\//i;

function validateSubmission(
  input: any,
  window: { min: number; max: number }
): { startAt: Date; endAt: Date } {
  if (!AD_POSITIONS.includes(input.position)) fail('Unknown ad position');
  if (!HTTPS_URL.test(String(input.media_url ?? ''))) {
    fail('Ad media must be uploaded before submitting');
  }
  if (input.redirect_url && !HTTPS_URL.test(String(input.redirect_url))) {
    fail('Redirect URL must start with http(s)://');
  }
  const days = Number(input.duration_days);
  // The window Marketing set, not a constant: the slider on the public page is
  // drawn from the same two numbers, so a campaign length the site offered can
  // never be one the server rejects.
  if (!Number.isInteger(days) || days < window.min || days > window.max) {
    fail(`Duration must be between ${window.min} and ${window.max} days`);
  }
  const startAt = new Date(input.start_at);
  if (Number.isNaN(startAt.getTime())) fail('Invalid start date');
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (startAt < startOfToday) fail('Start date cannot be in the past');
  return { startAt, endAt: new Date(startAt.getTime() + days * DAY_MS) };
}

type AdProductContext = {
  brand_id: Types.ObjectId | null;
  product_id: Types.ObjectId | null;
  brand_name: string | null;
  product_name: string | null;
  product_image: string | null;
};

const EMPTY_CONTEXT: AdProductContext = {
  brand_id: null,
  product_id: null,
  brand_name: null,
  product_name: null,
  product_image: null,
};

/** For a PRODUCT_AD / BRAND_AD the submitter must own the product; brand + names
 * + image are derived server-side so the request carries display context. */
async function resolveAdProductContext(adKind: AdKind, productId: string | null | undefined, userId: string): Promise<AdProductContext> {
  if (adKind === 'PLACEMENT') return EMPTY_CONTEXT;
  if (!productId || !Types.ObjectId.isValid(String(productId))) {
    fail('A product is required for a product or brand ad');
  }
  const product = await InventoryProductModel.findById(String(productId));
  if (!product || String(product.listing_submitted_by_id ?? '') !== userId) {
    fail('You can only run ads for your own products', 'FORBIDDEN');
  }
  const brand = product.brand_id ? await EcommBrandModel.findById(product.brand_id).select('brand_name') : null;
  return {
    brand_id: product.brand_id ?? null,
    product_id: product._id,
    brand_name: (brand as any)?.brand_name ?? product.brand_name ?? null,
    product_name: product.product_name ?? null,
    product_image: product.image_url || product.images?.[0] || null,
  };
}

/**
 * Tell the advertiser where their ad stands.
 *
 * Three moments, one function: submitted and waiting, approved and running,
 * or turned down with a reason. An ad is money somebody has committed to a
 * date window, so "we have it", "it is live" and "it is not" are each worth an
 * email — and until now the advertiser found out only by opening the console.
 *
 * Best-effort: a review decision is already saved by the time this runs, and a
 * mailbox outage must not undo it.
 */
async function mailAdvertiser(doc: IAdRequest, template: string, subject: string) {
  try {
    const owner = await UserModel.findById(doc.submitted_by)
      .select('profile.first_name auth.email')
      .lean();
    const to = (owner as any)?.auth?.email ?? '';
    if (!to) return;
    const { adsUrl } = await getUrlConfigs();
    const base = trimTrailingSlash(adsUrl);
    const runWindow = `${dayLabel(doc.start_at)} – ${dayLabel(doc.end_at)}`;
    await sendEmail({
      to,
      subject,
      template,
      category: 'notification',
      vars: {
        name: (owner as any)?.profile?.first_name ?? 'there',
        ad_title: doc.ad_title,
        campaign: doc.position,
        when: template === 'ad-in-review' ? dayLabel(doc.start_at) : runWindow,
        reason: doc.marketing_remarks ?? '',
        ad_url: `${base}/ads/${doc.trace_id}`,
      },
    });
  } catch (error) {
    logs.server.warn('ads', 'mailAdvertiser', { error, template, trace_id: doc.trace_id });
  }
}

/** A date as the advertiser reads it, not as Mongo stores it. */
const dayLabel = (value?: Date | null) =>
  value ? new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '';

export const adsService = {
  async pricing() {
    return pricingToPub(await getAdPricing());
  },

  publicRateCard: buildPublicRateCard,

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
    applyDayWindow(pricing, input);
    applyPlacementCopy(pricing, input);
    await pricing.save();
    return pricingToPub(pricing);
  },

  async submit(userId: string, input: any) {
    const pricing = await getAdPricing();
    const { startAt, endAt } = validateSubmission(input, adDayWindow(pricing));
    const adKind: AdKind = AD_KINDS.includes(input.ad_kind) ? input.ad_kind : 'PLACEMENT';
    const context = await resolveAdProductContext(adKind, input.product_id, userId);
    const estimated = pricePerDayFor(pricing, input.position) * Number(input.duration_days);
    const doc = await AdRequestModel.create({
      trace_id: await nextAdTraceId(),
      ad_kind: adKind,
      brand_id: context.brand_id,
      product_id: context.product_id,
      brand_name: context.brand_name,
      product_name: context.product_name,
      product_image: context.product_image,
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
    await mailAdvertiser(doc, 'ad-in-review', 'Your Duncit ad is in review');
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
    await mailAdvertiser(
      doc,
      approve ? 'ad-live' : 'ad-rejected',
      approve ? 'Your Duncit ad is live 🎉' : 'About your Duncit ad'
    );
    return toPub(doc, pricing.currency_symbol);
  },

  /**
   * Stop a running ad early.
   *
   * LIVE and EXPIRED are derived from the date window, never stored, so
   * stopping is closing the window — not writing a status. That is also what
   * actually removes it from the slots, because activeAds filters on the same
   * window. The record stays for the billing trail.
   */
  async stop(id: string) {
    if (!Types.ObjectId.isValid(id)) fail('Ad request not found', 'NOT_FOUND');
    const doc = await AdRequestModel.findById(id);
    if (!doc) fail('Ad request not found', 'NOT_FOUND');
    if (doc.status !== 'APPROVED') fail('Only an approved ad can be stopped');
    const now = new Date();
    if (deriveAdStatus(doc, now) === 'EXPIRED') fail('That ad has already ended');
    doc.end_at = now;
    // A stop before the start would derive as LIVE (now >= start_at is false,
    // now >= end_at is true → EXPIRED wins), but keep the pair coherent.
    if (doc.start_at > now) doc.start_at = now;
    await doc.save();
    const pricing = await getAdPricing();
    return toPub(doc, pricing.currency_symbol);
  },

  /** Permanently remove an ad request. */
  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) fail('Ad request not found', 'NOT_FOUND');
    const deleted = await AdRequestModel.findByIdAndDelete(id);
    if (!deleted) fail('Ad request not found', 'NOT_FOUND');
    return true;
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

  /**
   * Ads showing right now.
   *
   * LIVE is not a stored value — it is APPROVED plus today falling inside the
   * date window — so this cannot be expressed as a status filter. The window
   * goes in as a base filter instead, which keeps paging and totals correct;
   * filtering the page client-side would not.
   */
  async liveTable(input?: TableQueryInput) {
    const now = new Date();
    const pricing = await getAdPricing();
    const { docs, total, page, page_size } = await runTableQuery<IAdRequest>(
      AdRequestModel,
      { status: 'APPROVED', start_at: { $lte: now }, end_at: { $gt: now } },
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
