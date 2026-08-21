import { Types } from 'mongoose';
import { GraphQLError } from 'graphql';
import {
  JOURNEY_STEPS,
  ShortLinkClickModel,
  type IShortLinkClick,
  type JourneyStep,
} from './shortLinkClick.model';
import { UserModel } from '@modules/access/user/user.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

/**
 * How long after a click a payment is still credited to it.
 *
 * Last touch within the window: the click a buyer most recently followed is
 * the one that gets the sale. Longer than a session because a pod is rarely
 * bought the minute it is discovered, and short enough that a purchase months
 * later is not credited to a poster from another campaign.
 */
const ATTRIBUTION_WINDOW_MS = 30 * 86_400_000;

const JOURNEY_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['platform', 'country', 'city'],
  sortFields: {
    clicked_at: 'clicked_at',
    platform: 'platform',
    converted_amount: 'converted_amount',
  },
  filterFields: {
    platform: { type: 'string' },
    country: { type: 'string' },
    clicked_at: { type: 'date' },
  },
  defaultSort: { clicked_at: -1 },
};

/** The furthest step a click reached, by the canonical order. */
export function furthestStep(journey: { step: JourneyStep }[]): JourneyStep {
  const reached = new Set(journey.map((entry) => entry.step));
  // Walked backwards so the first hit is the deepest.
  return [...JOURNEY_STEPS].reverse().find((step) => reached.has(step)) ?? 'CLICKED';
}

async function toJourneyRow(doc: IShortLinkClick) {
  const user = doc.user_id
    ? ((await UserModel.findById(doc.user_id).select('profile auth').lean().exec()) as any)
    : null;
  // first_name is required on the model and last_name is not, so a name is
  // always present but may be one word. Email is optional — phone signups
  // have none.
  const name = user
    ? [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(' ')
    : null;
  return {
    id: doc._id.toHexString(),
    click_id: doc.click_id,
    clicked_at: doc.clicked_at.toISOString(),
    platform: doc.platform,
    country: doc.country ?? null,
    city: doc.city ?? null,
    device_type: doc.device_type,
    furthest_step: furthestStep(doc.journey),
    converted_amount: doc.converted_amount ?? null,
    user_id: doc.user_id ? doc.user_id.toHexString() : null,
    user_name: name,
    user_email: user?.auth?.email ?? null,
    steps: doc.journey.map((entry) => ({ step: entry.step, at: entry.at.toISOString() })),
    conversions: doc.conversions.map((entry) => ({
      payment_id: entry.payment_id.toHexString(),
      amount: entry.amount,
      at: entry.at.toISOString(),
    })),
  };
}

export const shortLinkJourneyService = {
  /**
   * Stamp a step on a click. Idempotent — a step that already happened keeps
   * its original time, so a reloaded page cannot rewrite when someone signed
   * up. Unknown click ids are ignored rather than raised (the id comes from a
   * URL a visitor can edit), but the return says whether the click EXISTS —
   * the landing endpoint uses that to fall back to minting a fresh click from
   * the code when a stored id no longer resolves.
   */
  async recordStep(clickId: string, step: JourneyStep, userId?: string | null): Promise<boolean> {
    const set = userId ? { user_id: new Types.ObjectId(userId) } : null;
    const result = await ShortLinkClickModel.updateOne(
      { click_id: clickId, 'journey.step': { $ne: step } },
      {
        $push: { journey: { step, at: new Date() } },
        ...(set ? { $set: set } : {}),
      },
    ).exec();
    if (result.matchedCount > 0) return true;

    // Either the step was already there — bind the account, which may be new
    // since the anonymous visit — or the click does not exist at all.
    if (set) {
      const rebind = await ShortLinkClickModel.updateOne({ click_id: clickId }, { $set: set }).exec();
      return rebind.matchedCount > 0;
    }
    return (await ShortLinkClickModel.exists({ click_id: clickId })) !== null;
  },

  /**
   * Credit a successful payment to the buyer's most recent click.
   *
   * Called from the one place every paid checkout funnels through, so dummy,
   * coupon-free and Razorpay payments are all attributed the same way. Silent
   * when the buyer never came through a link — most will not have.
   */
  async attributePayment(input: {
    userId: string;
    paymentId: string;
    amount: number;
    at?: Date;
  }) {
    const at = input.at ?? new Date();
    const click = await ShortLinkClickModel.findOne({
      user_id: new Types.ObjectId(input.userId),
      clicked_at: { $gte: new Date(at.getTime() - ATTRIBUTION_WINDOW_MS) },
    })
      .sort({ clicked_at: -1 })
      .exec();
    if (!click) return false;

    // A row written before `conversions` existed carries its one payment in
    // the retired slot. Fold it in before appending, or the total would count
    // a payment the list does not show.
    if (click.conversions.length === 0 && click.converted_payment_id) {
      click.conversions.push({
        payment_id: click.converted_payment_id,
        amount: click.converted_amount ?? 0,
        at: click.journey.find((entry) => entry.step === 'PAID')?.at ?? click.updated_at,
      });
    }

    // The finalize pipeline retries a step that failed half-way, so the same
    // payment must never be counted twice.
    const paymentId = new Types.ObjectId(input.paymentId);
    if (click.conversions.some((entry) => entry.payment_id.equals(paymentId))) return true;

    if (!click.journey.some((entry) => entry.step === 'PAID')) {
      click.journey.push({ step: 'PAID', at });
    }
    // Appended and accumulated, never replaced: a buyer's second purchase adds
    // to what this click earned instead of erasing the first one's record.
    click.conversions.push({ payment_id: paymentId, amount: input.amount, at });
    click.converted_amount = (click.converted_amount ?? 0) + input.amount;
    await click.save();
    return true;
  },

  /** How many clicks reached each step, plus the revenue behind them. */
  async funnel(shortLinkId: string) {
    const id = new Types.ObjectId(shortLinkId);
    const docs = await ShortLinkClickModel.find({ short_link_id: id })
      .select('journey converted_amount')
      .lean()
      .exec();

    // A record seeded with every step, so a step nobody reached still reports
    // zero rather than going missing — and every read below is total.
    const counts = Object.fromEntries(JOURNEY_STEPS.map((step) => [step, 0])) as Record<
      JourneyStep,
      number
    >;
    for (const doc of docs) {
      // Every recorded click counts as CLICKED whether or not the landing
      // page ever reported back — the redirect is proof enough.
      counts.CLICKED += 1;
      for (const step of new Set(doc.journey.map((entry) => entry.step))) {
        if (step !== 'CLICKED') counts[step] += 1;
      }
    }

    const revenue = docs.reduce((sum, doc) => sum + (doc.converted_amount ?? 0), 0);
    const clicked = counts.CLICKED;
    const paid = counts.PAID;
    return {
      steps: JOURNEY_STEPS.map((step) => ({ step, count: counts[step] })),
      revenue,
      // Rounded to a tenth of a percent: more precision than that is noise at
      // the volumes a single link sees.
      conversion_rate: clicked === 0 ? 0 : Math.round((paid / clicked) * 1000) / 10,
    };
  },

  /** One row per click, with who it turned into and how far it got. */
  async journeys(shortLinkId: string, input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IShortLinkClick>(
      ShortLinkClickModel,
      { short_link_id: new Types.ObjectId(shortLinkId) },
      input,
      JOURNEY_TABLE_CONFIG
    );
    return { rows: await Promise.all(docs.map(toJourneyRow)), total, page, page_size };
  },

  /** The full step trail of one click, for the timeline view. */
  async journey(clickId: string) {
    const doc = await ShortLinkClickModel.findOne({ click_id: clickId }).exec();
    if (!doc) {
      throw new GraphQLError('Click not found', { extensions: { code: 'NOT_FOUND' } });
    }
    return toJourneyRow(doc);
  },
};
