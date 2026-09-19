import { Schema, model, type Document, type Types } from 'mongoose';
import type { DeviceType } from './shortLink.analytics';

/**
 * How far a click got. Ordered: the funnel is drawn in this sequence, and a
 * later step always implies the earlier ones were reached.
 */
export const JOURNEY_STEPS = [
  'CLICKED',
  'LANDED',
  'SIGNED_UP',
  'SURVEY_DONE',
  'VIEWED_POD',
  'CHECKOUT_STARTED',
  'PAID',
] as const;

export type JourneyStep = (typeof JOURNEY_STEPS)[number];

/**
 * The privacy signal a visitor's browser sent, when it sent one.
 *
 * GPC is `Sec-GPC: 1` (Global Privacy Control), DNT the older Do-Not-Track
 * header. Stored so the console can say how much of its data was minimised,
 * rather than leaving the gap in a breakdown unexplained.
 */
export const CONSENT_SIGNALS = ['GPC', 'DNT'] as const;

export type ConsentSignal = (typeof CONSENT_SIGNALS)[number];

export interface IJourneyEntry {
  step: JourneyStep;
  at: Date;
}

/** One payment credited to a click. */
export interface IClickConversion {
  payment_id: Types.ObjectId;
  amount: number;
  at: Date;
}

/**
 * One row per click on a short link.
 *
 * Kept separate from the counter on ShortLink on purpose: the counter answers
 * "how many" in one indexed read for the table, and this answers "who, from
 * where, on what" without making every list query pay for it.
 */
export interface IShortLinkClick extends Document {
  _id: Types.ObjectId;
  /** Stable id handed to the destination as `dlc`, so a later signup or
   * payment can be traced back to this exact click. */
  click_id: string;
  code: string;
  short_link_id: Types.ObjectId;
  clicked_at: Date;
  /** Where the visitor came from, resolved to a product name. */
  platform: string;
  referrer_host?: string | null;
  referrer_url?: string | null;
  device_type: DeviceType;
  os: string;
  browser: string;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  /**
   * SHA-256 of the SALTED address, never the address itself. Enough to count a
   * returning visitor, useless for identifying a person — and, unlike a bare
   * hash of an IPv4 address, not reversible by walking the address space. The
   * salt lives on ShortLinkPolicy, and rotating it unlinks every hash written
   * before it.
   *
   * Null when the visitor asked not to be tracked.
   */
  ip_hash?: string | null;
  user_agent?: string | null;
  /**
   * Set when the visitor's browser asked not to be tracked and we obeyed. The
   * click is still counted — how many people opened a link is not personal
   * data — but the address hash, the city and the user agent are never written.
   */
  consent_signal?: ConsentSignal | null;
  /** Filled in later, when the visit is tied to an account. */
  user_id?: Types.ObjectId | null;
  /**
   * The steps this click reached, each stamped once. Append-only: a step that
   * has already happened is never re-dated, so "when did they sign up" stays
   * the first time rather than the last page they reloaded.
   */
  journey: IJourneyEntry[];
  /**
   * Every payment credited to this click, oldest first.
   *
   * A visitor who followed a link once can buy more than once — a pod today, a
   * product next week — and each sale is its own entry, so a later payment
   * never overwrites the record of an earlier one.
   */
  conversions: IClickConversion[];
  /** What this visitor has spent in total: the sum of `conversions`. */
  converted_amount?: number | null;
  /**
   * LEGACY. The single payment a click could carry before `conversions`
   * existed. Never written any more; still read when tracing a payment made
   * before this field was superseded back to the link that earned it.
   */
  converted_payment_id?: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const shortLinkClickSchema = new Schema<IShortLinkClick>(
  {
    click_id: { type: String, required: true, unique: true },
    code: { type: String, required: true, index: true },
    short_link_id: { type: Schema.Types.ObjectId, required: true, index: true },
    clicked_at: { type: Date, required: true, index: true },
    platform: { type: String, required: true, index: true },
    referrer_host: { type: String, default: null },
    referrer_url: { type: String, default: null },
    device_type: { type: String, required: true, index: true },
    os: { type: String, required: true },
    browser: { type: String, required: true },
    country: { type: String, default: null, index: true },
    region: { type: String, default: null },
    city: { type: String, default: null },
    ip_hash: { type: String, default: null, index: true },
    user_agent: { type: String, default: null },
    consent_signal: { type: String, enum: [...CONSENT_SIGNALS, null], default: null },
    user_id: { type: Schema.Types.ObjectId, default: null, index: true },
    journey: {
      type: [
        {
          _id: false,
          step: { type: String, enum: JOURNEY_STEPS, required: true },
          at: { type: Date, required: true },
        },
      ],
      default: [],
    },
    conversions: {
      type: [
        {
          _id: false,
          payment_id: { type: Schema.Types.ObjectId, required: true },
          amount: { type: Number, required: true },
          at: { type: Date, required: true },
        },
      ],
      default: [],
    },
    converted_amount: { type: Number, default: null },
    converted_payment_id: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// The detail page always reads one link's clicks newest-first.
shortLinkClickSchema.index({ short_link_id: 1, clicked_at: -1 });
// The retention sweep deletes by age across every link at once.
shortLinkClickSchema.index({ clicked_at: 1 });
// Partial, because the privacy console counts the minimised clicks and almost
// none of them are: an index over the whole collection would be nearly all
// nulls, and a count without one scans every click ever recorded.
shortLinkClickSchema.index(
  { consent_signal: 1 },
  { partialFilterExpression: { consent_signal: { $type: 'string' } } },
);
// The payment detail page asks the reverse question — which link earned THIS
// payment — once per view, so the lookup must not scan every click ever made.
shortLinkClickSchema.index({ 'conversions.payment_id': 1 });

export const ShortLinkClickModel = model<IShortLinkClick>('ShortLinkClick', shortLinkClickSchema);
