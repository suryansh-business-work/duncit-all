import { GraphQLError } from 'graphql';
import { Types, isValidObjectId } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { destinationFor, userNameFor } from '@modules/crm/marketing/waCampaign.recipients';
import {
  LocationModel,
  resolveLaunchMedia,
  type ILocation,
} from '@modules/platform/location/location.model';
import { locationService } from '@modules/platform/location/location.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import {
  escapedSearchRegex,
  runTableQuery,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';
import { validate } from '@utils/validate';
import { LocationSubscriptionModel, type ILocationSubscription } from './locationSubscription.model';
import { locationDocIdSchema, type LocationDocIdInput } from './locationSubscription.validator';

/**
 * Who the next Send reaches: everyone not yet messaged. SKIPPED is included on
 * purpose — the global WhatsApp switch ships off, and a Send pressed before it
 * is turned on skips every row; those people must still be reachable later. An
 * opted-out number is simply skipped again, at no cost.
 */
export const SENDABLE_STATUSES = ['PENDING', 'FAILED', 'SKIPPED'] as const;

/** The name a city goes by in copy — the same choice `pod.place.ts` makes. */
export const cityOf = (location: Pick<ILocation, 'city' | 'location_name'>) =>
  location.city || location.location_name;

/** Allowlists for the shared table engine (DUNCIT TABLE CONTRACT v1). Search is
 * assembled by `table()` itself, because the city name lives on the Location. */
const SUBSCRIPTION_TABLE_CONFIG: TableEntityConfig = {
  searchFields: [],
  sortFields: {
    name: 'name',
    whatsapp: 'whatsapp',
    location_shared: 'location_shared',
    status: 'status',
    created_at: 'created_at',
    notified_at: 'notified_at',
  },
  filterFields: {
    location_doc_id: { path: 'location_id', type: 'enum' },
    status: { type: 'enum' },
    location_shared: { type: 'boolean' },
    created_at: { type: 'date' },
    notified_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const iso = (date: Date | null | undefined) => (date ? date.toISOString() : null);

const subscriptionPub = (d: ILocationSubscription, cityById: ReadonlyMap<string, string>) => ({
  id: d._id.toHexString(),
  location_doc_id: d.location_id.toHexString(),
  city: cityById.get(d.location_id.toHexString()) ?? '',
  user_id: d.user_id.toHexString(),
  name: d.name ?? '',
  whatsapp: d.whatsapp ?? '',
  location_shared: d.location_shared ?? false,
  status: d.status,
  reason: d.reason ?? '',
  notified_at: iso(d.notified_at),
  created_at: iso(d.created_at) ?? '',
});

/** The city a mutation names (by slug or id, as the page's link carries it),
 * with its doc id — or NOT_FOUND. */
export async function findCity(input: unknown) {
  const { location_doc_id } = await validate<LocationDocIdInput>(locationDocIdSchema, input);
  const location = await locationService.getBySlugOrId(location_doc_id);
  if (!location) {
    throw new GraphQLError('Location not found', { extensions: { code: 'NOT_FOUND' } });
  }
  return { id: new Types.ObjectId(location.id), location };
}

/** Search spans the subscriber's name and number, and the city they chose. */
async function searchFilter(search: string | null | undefined): Promise<Record<string, unknown>> {
  const term = search?.trim();
  if (!term) return {};
  const rx = escapedSearchRegex(term);
  const cities = await LocationModel.find({ $or: [{ location_name: rx }, { city: rx }] })
    .select('_id')
    .lean();
  return {
    $or: [{ name: rx }, { whatsapp: rx }, { location_id: { $in: cities.map((city) => city._id) } }],
  };
}

export const locationSubscriptionService = {
  /** Subscribers per city, keyed by location id — one aggregate for a whole list. */
  async countsByLocation(): Promise<Record<string, number>> {
    const rows: { _id: Types.ObjectId; count: number }[] = await LocationSubscriptionModel.aggregate([
      { $group: { _id: '$location_id', count: { $sum: 1 } } },
    ]);
    const map: Record<string, number> = {};
    for (const row of rows) map[row._id.toHexString()] = row.count;
    return map;
  },

  /** What the subscribe page reads, by the city's slug or id. Null for a city that does not exist. */
  async launchStatus(locationKey: string, userId: string | null) {
    const location = await locationService.getBySlugOrId(locationKey);
    if (!location) return null;
    const locationId = new Types.ObjectId(location.id);
    const [subscriber_count, mine, branding] = await Promise.all([
      LocationSubscriptionModel.countDocuments({ location_id: locationId }),
      userId && isValidObjectId(userId)
        ? LocationSubscriptionModel.exists({ user_id: new Types.ObjectId(userId), location_id: locationId })
        : null,
      settingsService.getBranding(),
    ]);
    return {
      location,
      subscriber_count,
      launch_target: location.launch_target,
      is_subscribed: !!mine,
      // The city's own backdrop where it set one, else the global one — decided
      // here so both apps draw the same picture without knowing the rule.
      launch_media: resolveLaunchMedia(location.launch_media, branding.launch_media),
    };
  },

  /**
   * Put the signed-in member on a city's waitlist.
   *
   * The number is READ FROM THE PROFILE, never taken from the request, so an
   * account can only ever sign up its own WhatsApp. A repeat tap refreshes the
   * name and number and leaves the send status alone.
   */
  async subscribe(userId: string, locationDocId: string, locationShared: boolean) {
    const { id, location } = await findCity({ location_doc_id: locationDocId });
    if (location.is_launched ?? true) {
      throw new GraphQLError(`${cityOf(location)} is already live on Duncit.`, {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const user = await UserModel.findById(userId)
      .select('profile.first_name profile.last_name communication.whatsapp auth.phone')
      .lean();
    const whatsapp = destinationFor(user ?? {});
    if (!whatsapp) {
      throw new GraphQLError('Add your WhatsApp number to your profile first.', {
        extensions: { code: 'WHATSAPP_REQUIRED' },
      });
    }
    await LocationSubscriptionModel.updateOne(
      { user_id: new Types.ObjectId(userId), location_id: id },
      {
        $set: { name: userNameFor(user ?? {}), whatsapp, location_shared: locationShared },
        $setOnInsert: { status: 'PENDING', reason: '', notified_at: null },
      },
      { upsert: true }
    );
    return this.launchStatus(id.toHexString(), userId);
  },

  async table(input?: TableQueryInput | null) {
    const base = await searchFilter(input?.search);
    const { docs, total, page, page_size } = await runTableQuery<ILocationSubscription>(
      LocationSubscriptionModel,
      base,
      { ...input, search: null },
      SUBSCRIPTION_TABLE_CONFIG
    );
    const ids = [...new Set(docs.map((doc) => doc.location_id.toHexString()))];
    const cities = await locationService.listByIds(ids);
    const cityById = new Map(cities.map((city) => [city!.id, cityOf(city!)]));
    return { rows: docs.map((doc) => subscriptionPub(doc, cityById)), total, page, page_size };
  },

  /** One row per city with a subscriber, busiest first — a single aggregate. */
  async cities() {
    const rows: { _id: Types.ObjectId; total: number; sent: number; sendable: number }[] =
      await LocationSubscriptionModel.aggregate([
        {
          $group: {
            _id: '$location_id',
            total: { $sum: 1 },
            sent: { $sum: { $cond: [{ $eq: ['$status', 'SENT'] }, 1, 0] } },
            sendable: { $sum: { $cond: [{ $in: ['$status', [...SENDABLE_STATUSES]] }, 1, 0] } },
          },
        },
        { $sort: { total: -1 } },
      ]);
    const locations = await locationService.listByIds(rows.map((row) => row._id.toHexString()));
    const byId = new Map(locations.map((location) => [location!.id, location]));
    // A city deleted since people subscribed has no Location to show; skip it.
    return rows.flatMap((row) => {
      const location = byId.get(row._id.toHexString());
      if (!location) return [];
      return [
        {
          location,
          subscriber_count: row.total,
          notified_count: row.sent,
          pending_count: row.sendable,
        },
      ];
    });
  },
};
