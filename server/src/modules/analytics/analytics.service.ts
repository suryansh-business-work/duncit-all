import { Types } from 'mongoose';
import { ActiveUserPingModel } from './activeUser.model';
import { CategoryModel } from '../category/category.model';
import { PodModel } from '../pod/pod.model';
import { ClubModel } from '../club/club.model';
import { UserModel } from '../user/user.model';
import { VenueModel } from '../venue/venue.model';
import { HostModel } from '../host/host.model';
import { ContactSubmissionModel } from '../contact/contact.model';

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

export const analyticsService = {
  async recordPing(args: {
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
        $setOnInsert: {
          device_id,
          date_ymd,
          super_category_slug: slug,
          user_id: args.user_id ? new Types.ObjectId(args.user_id) : null,
        },
        $set: args.user_id ? { user_id: new Types.ObjectId(args.user_id) } : {},
      },
      { upsert: true }
    );
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
};
