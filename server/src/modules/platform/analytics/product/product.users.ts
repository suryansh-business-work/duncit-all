import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { ShortLinkClickModel } from '@modules/crm/marketing/shortLinkClick.model';
import { ShortLinkModel } from '@modules/crm/marketing/shortLink.model';
import { AppEventModel } from '../appEvent.model';
import { AppSessionModel } from '../appSession.model';
import { locationNames, userNames } from '../entity/lookups';
import { topCounts } from './product.counts';

/**
 * Analytics > Product > Users — one member as the app saw them: when they
 * joined and were first and last seen, where they came from, how much they
 * use it, and what they actually did (pods, payments — from the records).
 * Never a chat message, a password or a payment credential.
 */

const badUser = () => new GraphQLError('That member does not exist.', { extensions: { code: 'BAD_USER_INPUT' } });

export function memberId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw badUser();
  return new Types.ObjectId(id);
}

/** Everything the app recorded as this member: their signed-in events, and signed-out ones on their devices. */
export async function memberEventMatch(id: Types.ObjectId): Promise<Record<string, unknown>> {
  const devices = await AppEventModel.distinct('device_id', { user_id: id });
  return devices.length ? { $or: [{ user_id: id }, { device_id: { $in: devices }, user_id: null }] } : { user_id: id };
}

interface UsageRow {
  first: Date | null;
  last: Date | null;
  events: number;
  screen_views: number;
}

async function usage(match: Record<string, unknown>) {
  const [totals, screens] = await Promise.all([
    AppEventModel.aggregate<UsageRow>([
      { $match: match },
      {
        $group: {
          _id: null,
          first: { $min: '$occurred_at' },
          last: { $max: '$occurred_at' },
          events: { $sum: 1 },
          screen_views: { $sum: { $cond: [{ $eq: ['$event_name', 'screen_view'] }, 1, 0] } },
        },
      },
    ]),
    AppEventModel.aggregate<{ _id: string; count: number }>([
      { $match: { ...match, event_name: 'screen_view', screen_name: { $ne: '' } } },
      { $group: { _id: '$screen_name', count: { $sum: 1 } } },
    ]),
  ]);
  return { totals: totals[0] ?? null, screens };
}

/** First and last touch: the earliest and latest short-link click bound to the member. */
async function touches(id: Types.ObjectId) {
  const [first, last] = await Promise.all([
    ShortLinkClickModel.findOne({ user_id: id }).sort({ clicked_at: 1 }).select('short_link_id country').lean(),
    ShortLinkClickModel.findOne({ user_id: id }).sort({ clicked_at: -1 }).select('short_link_id country').lean(),
  ]);
  const ids = [first?.short_link_id, last?.short_link_id].filter((value): value is Types.ObjectId => Boolean(value));
  const links = await ShortLinkModel.find({ _id: { $in: ids } })
    .select('utm_source utm_campaign')
    .lean<Array<{ _id: Types.ObjectId; utm_source: string; utm_campaign?: string | null }>>();
  const label = (linkId: Types.ObjectId | undefined) => {
    const link = links.find((row) => linkId && row._id.equals(linkId));
    return link ? [link.utm_source, link.utm_campaign].filter(Boolean).join(' / ') : null;
  };
  return {
    first_touch: label(first?.short_link_id),
    last_touch: label(last?.short_link_id),
    country: last?.country ?? first?.country ?? null,
  };
}

export async function productUser(userIdText: string) {
  const id = memberId(userIdText);
  const user = await UserModel.findById(id)
    .select('metadata.created_at profile.selected_location_id')
    .lean<{ metadata?: { created_at?: Date }; profile?: { selected_location_id?: Types.ObjectId | null } }>();
  if (!user) throw badUser();
  const match = await memberEventMatch(id);
  const cityId = user.profile?.selected_location_id ? String(user.profile.selected_location_id) : null;
  const [names, cities, used, attribution, sessions, latest, podsCreated, podsJoined, payments] = await Promise.all([
    userNames([String(id)]),
    cityId ? locationNames([cityId]) : new Map<string, string>(),
    usage(match),
    touches(id),
    AppSessionModel.countDocuments({ user_id: id }),
    AppSessionModel.findOne({ user_id: id }).sort({ started_at: -1 }).select('platform app_version').lean(),
    PodModel.countDocuments({ pod_hosts_id: id }),
    PodMemberModel.countDocuments({ user_id: id }),
    PaymentModel.countDocuments({ user_id: id, paid_at: { $ne: null } }),
  ]);
  return {
    user_id: String(id),
    name: names.get(String(id)) ?? '',
    registered_at: user.metadata?.created_at?.toISOString() ?? null,
    first_seen_at: used.totals?.first?.toISOString() ?? null,
    last_seen_at: used.totals?.last?.toISOString() ?? null,
    platform: latest?.platform || null,
    app_version: latest?.app_version || null,
    city: cityId ? (cities.get(cityId) ?? null) : null,
    ...attribution,
    sessions,
    screen_views: used.totals?.screen_views ?? 0,
    events: used.totals?.events ?? 0,
    features_used: used.screens.length,
    top_features: topCounts(used.screens),
    pods_created: podsCreated,
    pods_joined: podsJoined,
    payments_completed: payments,
  };
}
