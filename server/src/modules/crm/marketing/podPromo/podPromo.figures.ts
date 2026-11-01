import { Types } from 'mongoose';
import { ShortLinkClickModel } from '../shortLinkClick.model';
import { SocialPostModel } from '../social/social.model';
import { SocialScheduledPostModel } from '../social/social.publish.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import type { PromoFigures } from './podPromo.types';

/**
 * What a promotion brought in, read from data that already exists — nothing
 * here records anything new.
 *
 * - Clicks, visitors and journey steps: the tracking link's own clicks.
 * - Bookings: people who clicked the link and THEN joined this pod (paid or
 *   free). A click is bound to an account when the visitor signs in, so a
 *   member who clicked, signed in and booked is counted; a booking made
 *   before the click is not.
 * - Payments and revenue: the purchases the payment pipeline credited to this
 *   link's clicks (last touch within 30 days — shortLinkJourney.attributePayment,
 *   called for every confirmed payment from payment.finalize.ts).
 * - Likes, comments and engagement: the published post as the network sync
 *   last read it.
 */
interface ClickRow {
  click_id: string;
  ip_hash?: string | null;
  user_id?: Types.ObjectId | null;
  clicked_at: Date;
  journey: { step: string }[];
  conversions: { amount: number }[];
}

export interface FigureSource {
  pod_id: Types.ObjectId | string;
  short_link_id?: Types.ObjectId | string | null;
  scheduled_post_id?: Types.ObjectId | string | null;
}

const reached = (rows: readonly ClickRow[], step: string) => rows.filter((row) => row.journey.some((entry) => entry.step === step)).length;

/** Each signed-in clicker and the first time they clicked. */
function firstClickByUser(rows: readonly ClickRow[]): Map<string, Date> {
  const first = new Map<string, Date>();
  for (const row of rows) {
    if (!row.user_id) continue;
    const key = String(row.user_id);
    const seen = first.get(key);
    if (!seen || row.clicked_at < seen) first.set(key, row.clicked_at);
  }
  return first;
}

async function bookingsOf(podId: FigureSource['pod_id'], firstClick: Map<string, Date>) {
  if (firstClick.size === 0) return { bookings: 0, paid_bookings: 0 };
  const members = await PodMemberModel.find({
    pod_id: new Types.ObjectId(String(podId)),
    user_id: { $in: [...firstClick.keys()].map((id) => new Types.ObjectId(id)) },
    status: { $ne: 'BACKED_OUT' },
  })
    .select('user_id joined_at payment_id')
    .lean<{ user_id: Types.ObjectId; joined_at: Date; payment_id?: Types.ObjectId | null }[]>();
  const after = members.filter((member) => {
    const clicked = firstClick.get(String(member.user_id));
    return !!clicked && member.joined_at >= clicked;
  });
  return { bookings: after.length, paid_bookings: after.filter((member) => !!member.payment_id).length };
}

interface Engagement {
  likes: number;
  comments: number;
  engagement: number;
}

async function engagementOf(postId: FigureSource['scheduled_post_id']): Promise<Engagement> {
  const none: Engagement = { likes: 0, comments: 0, engagement: 0 };
  if (!postId) return none;
  const post = await SocialScheduledPostModel.findById(postId).select('targets').lean<{ targets: { account_id: string; external_id?: string; status: string }[] }>();
  const keys = (post?.targets ?? []).filter((t) => t.status === 'PUBLISHED' && t.external_id).map((t) => ({ account_id: t.account_id, external_id: t.external_id }));
  if (keys.length === 0) return none;
  const synced = await SocialPostModel.find({ $or: keys }).select('likes comments engagement').lean<{ likes?: number; comments?: number; engagement?: number }[]>();
  return synced.reduce<Engagement>(
    (sum, row) => ({ likes: sum.likes + (row.likes ?? 0), comments: sum.comments + (row.comments ?? 0), engagement: sum.engagement + (row.engagement ?? 0) }),
    none
  );
}

export async function figuresFor(source: FigureSource, now = new Date()): Promise<PromoFigures> {
  const rows = source.short_link_id
    ? await ShortLinkClickModel.find({ short_link_id: new Types.ObjectId(String(source.short_link_id)) })
        .select('click_id ip_hash user_id clicked_at journey.step conversions.amount')
        .lean<ClickRow[]>()
    : [];
  const [booked, social] = await Promise.all([bookingsOf(source.pod_id, firstClickByUser(rows)), engagementOf(source.scheduled_post_id)]);
  const conversions = rows.flatMap((row) => row.conversions ?? []);
  return {
    clicks: rows.length,
    unique_visitors: new Set(rows.map((row) => row.ip_hash || row.click_id)).size,
    signups: reached(rows, 'SIGNED_UP'),
    pod_views: reached(rows, 'VIEWED_POD'),
    checkouts: reached(rows, 'CHECKOUT_STARTED'),
    ...booked,
    payments: conversions.length,
    revenue: Math.round(conversions.reduce((sum, entry) => sum + (entry.amount ?? 0), 0) * 100) / 100,
    ...social,
    updated_at: now,
  };
}
