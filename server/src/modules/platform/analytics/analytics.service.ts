import { Types } from 'mongoose';
import { ActiveUserPingModel } from './activeUser.model';
import { AppEventModel, type IAppEvent } from './appEvent.model';
import type { RecordAppEventDTO } from './analytics.validator';
import { CategoryModel } from '@modules/pods/category/category.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/pods/club/club.model';
import { UserModel } from '@modules/access/user/user.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { HostModel } from '@modules/venues/host/host.model';
import { ContactSubmissionModel } from '@modules/crm/contact/contact.model';

type Granularity = 'DAY' | 'WEEK' | 'MONTH';

const ymd = (d: Date) => d.toISOString().slice(0, 10);

const bucketKey = (date: Date, g: Granularity): string => {
  if (g === 'DAY') return ymd(date);
  if (g === 'MONTH') return date.toISOString().slice(0, 7); // YYYY-MM
  // WEEK: ISO-ish year + week number
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
  const diff = (tmp.getTime() - firstThursday.getTime()) / 86400000;
  const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

const activityLevel = (count: number) => {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
};

const toEventPub = (event: IAppEvent) => ({
  id: String(event._id),
  user_id: String(event.user_id),
  device_id: event.device_id,
  event_type: event.event_type,
  client_event_id: event.client_event_id ?? '',
  path: event.path ?? '',
  route: event.route ?? '',
  title: event.title ?? '',
  target_tag: event.target_tag ?? '',
  target_text: event.target_text ?? '',
  target_label: event.target_label ?? '',
  target_role: event.target_role ?? '',
  target_href: event.target_href ?? '',
  super_category_slug: event.super_category_slug ?? null,
  pod_id: event.pod_id ? String(event.pod_id) : null,
  checkout_url: event.checkout_url ?? '',
  metadata_json: JSON.stringify(event.metadata ?? {}),
  occurred_at: event.occurred_at?.toISOString?.() ?? '',
});

function parseMetadata(value?: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function recordActiveDay(args: {
  device_id?: string | null;
  user_id?: string | null;
  super_category_slug?: string | null;
}) {
  const device_id = (args.device_id || '').trim();
  if (!device_id) return false;
  const date_ymd = ymd(new Date());
  const slug = args.super_category_slug ? String(args.super_category_slug).toLowerCase() : null;
  await ActiveUserPingModel.updateOne(
    { device_id, date_ymd, super_category_slug: slug },
    {
      $setOnInsert: { device_id, date_ymd, super_category_slug: slug },
      $set: args.user_id ? { user_id: new Types.ObjectId(args.user_id) } : {},
      $inc: { hits: 1 },
    },
    { upsert: true }
  );
  return true;
}

export const analyticsService = {
  async recordPing(args: {
    device_id?: string | null;
    user_id?: string | null;
    super_category_slug?: string | null;
  }) {
    return recordActiveDay(args);
  },

  async recordAppEvent(args: {
    input: RecordAppEventDTO;
    user_id: string;
    device_id?: string | null;
  }) {
    const occurredAt = args.input.occurred_at ? new Date(args.input.occurred_at) : new Date();
    const userId = new Types.ObjectId(args.user_id);
    const deviceId = (args.device_id || `user:${args.user_id}`).trim().slice(0, 100);
    const slug = args.input.super_category_slug
      ? String(args.input.super_category_slug).toLowerCase()
      : null;
    const podId = args.input.pod_id && Types.ObjectId.isValid(args.input.pod_id)
      ? new Types.ObjectId(args.input.pod_id)
      : null;

    await AppEventModel.create({
      user_id: userId,
      device_id: deviceId,
      event_type: args.input.event_type,
      client_event_id: args.input.client_event_id ?? '',
      path: args.input.path,
      route: args.input.route ?? '',
      title: args.input.title ?? '',
      target_tag: args.input.target_tag ?? '',
      target_text: args.input.target_text ?? '',
      target_label: args.input.target_label ?? '',
      target_role: args.input.target_role ?? '',
      target_href: args.input.target_href ?? '',
      super_category_slug: slug,
      pod_id: podId,
      checkout_url: args.input.checkout_url ?? '',
      metadata: parseMetadata(args.input.metadata_json),
      occurred_at: occurredAt,
    });
    await recordActiveDay({ device_id: deviceId, user_id: args.user_id, super_category_slug: slug });
    return true;
  },

  async stats(args: {
    from: string;
    to: string;
    granularity?: Granularity;
    super_category_slug?: string | null;
  }) {
    const granularity: Granularity = args.granularity || 'DAY';
    const fromYmd = ymd(new Date(args.from));
    const toYmd = ymd(new Date(args.to));
    const q: any = { date_ymd: { $gte: fromYmd, $lte: toYmd } };
    if (args.super_category_slug !== undefined && args.super_category_slug !== null) {
      q.super_category_slug = String(args.super_category_slug).toLowerCase();
    }
    const docs = await ActiveUserPingModel.find(q, {
      device_id: 1,
      user_id: 1,
      date_ymd: 1,
    }).lean();

    const buckets = new Map<string, { devices: Set<string>; users: Set<string> }>();
    const totalDevices = new Set<string>();
    const totalUsers = new Set<string>();

    for (const d of docs) {
      const key = bucketKey(new Date(d.date_ymd), granularity);
      let entry = buckets.get(key);
      if (!entry) {
        entry = { devices: new Set(), users: new Set() };
        buckets.set(key, entry);
      }
      entry.devices.add(d.device_id);
      totalDevices.add(d.device_id);
      if (d.user_id) {
        entry.users.add(String(d.user_id));
        totalUsers.add(String(d.user_id));
      }
    }

    const arr = Array.from(buckets.entries())
      .map(([bucket, v]) => ({
        bucket,
        unique_devices: v.devices.size,
        unique_users: v.users.size,
      }))
      .sort((a, b) => (a.bucket < b.bucket ? -1 : 1));

    return {
      granularity,
      from: fromYmd,
      to: toYmd,
      total_unique_devices: totalDevices.size,
      total_unique_users: totalUsers.size,
      buckets: arr,
    };
  },

  async dashboardTotals(super_category_slug?: string | null) {
    const supers = await CategoryModel.find({ level: 'SUPER', is_active: true })
      .sort({ sort_order: 1, name: 1 })
      .lean();

    const wantSlug = super_category_slug ? String(super_category_slug).toLowerCase() : null;
    const filteredSupers = wantSlug ? supers.filter((s) => s.slug === wantSlug) : supers;
    const superIds = filteredSupers.map((s) => s._id);
    const slugById = new Map(filteredSupers.map((s) => [String(s._id), s.slug]));
    const nameById = new Map(filteredSupers.map((s) => [String(s._id), s.name]));

    // Clubs grouped by super_category_id
    const clubAgg = await ClubModel.aggregate([
      ...(superIds.length ? [{ $match: { super_category_id: { $in: superIds } } }] : []),
      { $group: { _id: '$super_category_id', count: { $sum: 1 } } },
    ]);
    const clubCountById = new Map<string, number>(
      clubAgg.map((r: any) => [String(r._id), r.count])
    );

    // Pods grouped by club -> super_category_id
    const podAgg = await PodModel.aggregate([
      {
        $lookup: {
          from: 'clubs',
          localField: 'club_id',
          foreignField: '_id',
          as: 'club',
        },
      },
      { $unwind: '$club' },
      ...(superIds.length
        ? [{ $match: { 'club.super_category_id': { $in: superIds } } }]
        : []),
      { $group: { _id: '$club.super_category_id', count: { $sum: 1 } } },
    ]);
    const podCountById = new Map<string, number>(
      podAgg.map((r: any) => [String(r._id), r.count])
    );

    const buildBuckets = (counts: Map<string, number>) =>
      filteredSupers.map((s) => ({
        super_category_slug: slugById.get(String(s._id)) || null,
        super_category_name: nameById.get(String(s._id)) || null,
        count: counts.get(String(s._id)) || 0,
      }));

    const [users_total, pods_total, clubs_total, venues_total, hosts_total, support_tickets_open, support_tickets_total, support_status_agg] = await Promise.all([
      UserModel.countDocuments({}),
      PodModel.countDocuments({}),
      ClubModel.countDocuments({}),
      VenueModel.countDocuments({}),
      HostModel.countDocuments({}),
      ContactSubmissionModel.countDocuments({ status: { $in: ['NEW', 'IN_PROGRESS'] } }),
      ContactSubmissionModel.countDocuments({}),
      ContactSubmissionModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'];
    const statusMap = new Map<string, number>(
      (support_status_agg as any[]).map((r) => [String(r._id), r.count])
    );
    const support_tickets_by_status = STATUSES.map((s) => ({
      status: s,
      count: statusMap.get(s) || 0,
    }));

    return {
      pods: buildBuckets(podCountById),
      clubs: buildBuckets(clubCountById),
      users_total,
      pods_total,
      clubs_total,
      venues_total,
      hosts_total,
      support_tickets_open,
      support_tickets_total,
      support_tickets_by_status,
    };
  },

  async userActivityYear(args: { user_id: string; year?: number | null }) {
    const userId = new Types.ObjectId(args.user_id);
    const currentYear = new Date().getUTCFullYear();
    const year = args.year || currentYear;
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;

    const [yearsAgg, daysAgg] = await Promise.all([
      ActiveUserPingModel.aggregate([
        { $match: { user_id: userId } },
        { $group: { _id: { $substr: ['$date_ymd', 0, 4] } } },
        { $sort: { _id: 1 } },
      ]),
      ActiveUserPingModel.aggregate([
        { $match: { user_id: userId, date_ymd: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: '$date_ymd',
            count: { $sum: { $ifNull: ['$hits', 1] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const availableYears = yearsAgg.map((row: any) => Number(row._id)).filter(Boolean);
    if (!availableYears.includes(currentYear)) availableYears.push(currentYear);
    if (!availableYears.includes(year)) availableYears.push(year);
    availableYears.sort((left, right) => left - right);

    const days = daysAgg.map((row: any) => ({
      date: row._id,
      count: row.count,
      level: activityLevel(row.count),
    }));

    return {
      user_id: args.user_id,
      year,
      available_years: availableYears,
      total_visits: days.reduce((sum, day) => sum + day.count, 0),
      days,
    };
  },

  async userClickstream(args: { user_id: string; date: string; limit?: number | null }) {
    const from = new Date(`${args.date}T00:00:00.000Z`);
    const to = new Date(`${args.date}T23:59:59.999Z`);
    const limit = Math.max(1, Math.min(Number(args.limit) || 300, 1000));
    const docs = await AppEventModel.find({
      user_id: new Types.ObjectId(args.user_id),
      occurred_at: { $gte: from, $lte: to },
    })
      .sort({ occurred_at: 1 })
      .limit(limit);
    return docs.map(toEventPub);
  },

  async deleteUserActivityDay(args: { user_id: string; date: string }) {
    const userId = new Types.ObjectId(args.user_id);
    const [pings, events] = await Promise.all([
      ActiveUserPingModel.deleteMany({ user_id: userId, date_ymd: args.date }),
      AppEventModel.deleteMany({
        user_id: userId,
        occurred_at: { $gte: new Date(`${args.date}T00:00:00.000Z`), $lte: new Date(`${args.date}T23:59:59.999Z`) },
      }),
    ]);
    return pings.deletedCount > 0 || events.deletedCount > 0;
  },

  async deleteUserActivityYear(args: { user_id: string; year: number }) {
    const userId = new Types.ObjectId(args.user_id);
    const [pings, events] = await Promise.all([
      ActiveUserPingModel.deleteMany({
        user_id: userId,
        date_ymd: { $gte: `${args.year}-01-01`, $lte: `${args.year}-12-31` },
      }),
      AppEventModel.deleteMany({
        user_id: userId,
        occurred_at: {
          $gte: new Date(`${args.year}-01-01T00:00:00.000Z`),
          $lte: new Date(`${args.year}-12-31T23:59:59.999Z`),
        },
      }),
    ]);
    return pings.deletedCount > 0 || events.deletedCount > 0;
  },
};
