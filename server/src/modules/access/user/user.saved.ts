/**
 * `userService` — saved pods: toggling a save and the saved-pods list with
 * its category/search/sort filters. Composed into `userService` in user.service.ts.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from './user.model';
import { UserSavedPodModel } from './relations';
import { podSeatsAvailable, podSeatsTaken } from '@modules/pods/pod/pod.seats';
import { CategoryModel } from '@modules/pods/category/category.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';

const idStrings = (values: unknown[] | undefined | null) =>
  (values ?? []).map(String);

const escapeSavedRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/** Walk the category tree downward so a SUPER/CATEGORY selection also matches its
 * descendant sub-categories (a club may be tagged at any level). */
async function expandSavedCategoryIds(rootIds: string[]): Promise<Set<string>> {
  const all = new Set(rootIds.filter((id) => Types.ObjectId.isValid(id)));
  let frontier = Array.from(all);
  while (frontier.length > 0) {
    const children = await CategoryModel.find({ parent_id: { $in: frontier } })
      .select("_id")
      .lean();
    const next: string[] = [];
    for (const child of children as any[]) {
      const id = String(child._id);
      if (!all.has(id)) {
        all.add(id);
        next.push(id);
      }
    }
    frontier = next;
  }
  return all;
}

type SavedPodSort =
  | "RECENT"
  | "DATE_ASC"
  | "DATE_DESC"
  | "PRICE_LOW"
  | "PRICE_HIGH"
  | "NAME_ASC"
  | "NAME_DESC";

/** Sort saved pods by the requested key (default: recently-saved order). Returns
 * a sorted copy — never mutates the input. */
function sortSavedPods(docs: any[], sort: string | null | undefined, savedOrder: Map<string, number>): any[] {
  const podTime = (d: any) => new Date(d.pod_date_time ?? 0).getTime();
  const amount = (d: any) => Number(d.pod_amount ?? 0);
  const title = (d: any) => String(d.pod_title ?? "");
  const savedRank = (d: any) => savedOrder.get(String(d._id)) ?? 0;
  const comparators: Record<SavedPodSort, (a: any, b: any) => number> = {
    RECENT: (a, b) => savedRank(a) - savedRank(b),
    DATE_ASC: (a, b) => podTime(a) - podTime(b),
    DATE_DESC: (a, b) => podTime(b) - podTime(a),
    PRICE_LOW: (a, b) => amount(a) - amount(b),
    PRICE_HIGH: (a, b) => amount(b) - amount(a),
    NAME_ASC: (a, b) => title(a).localeCompare(title(b)),
    NAME_DESC: (a, b) => title(b).localeCompare(title(a)),
  };
  const cmp = comparators[sort as SavedPodSort] ?? comparators.RECENT;
  return [...docs].sort(cmp);
}

const podToPublic = (d: any, clubSlug = '') => ({
  id: String(d._id),
  pod_id: d.pod_id,
  pod_title: d.pod_title,
  pod_hosts_id: idStrings(d.pod_hosts_id),
  location_id: d.location_id ? String(d.location_id) : null,
  venue_id: d.venue_id ? String(d.venue_id) : null,
  club_id: d.club_id ? String(d.club_id) : null,
  club_slug: clubSlug,
  zone_name: d.zone_name ?? null,
  pod_hashtag: d.pod_hashtag ?? [],
  pod_images_and_videos: (d.pod_images_and_videos ?? []).map((m: any) => ({
    url: m.url,
    type: m.type ?? 'IMAGE',
  })),
  pod_hits: d.pod_hits ?? 0,
  pod_attendees: idStrings(d.pod_attendees),
  // Occupancy is people PLUS the seats they bought beyond their own; the shape
  // in pod.service already emits both and this one silently returned neither,
  // so a pod read through a user rendered as emptier than it is.
  seats_taken: podSeatsTaken(d),
  seats_available: podSeatsAvailable(d),
  pod_description: d.pod_description ?? '',
  pod_date_time: d.pod_date_time?.toISOString?.() ?? null,
  pod_end_date_time: d.pod_end_date_time?.toISOString?.() ?? null,
  pod_type: d.pod_type,
  pod_amount: d.pod_amount ?? 0,
  pod_occurrence: d.pod_occurrence ?? 'ONE_TIME',
  no_of_spots: d.no_of_spots ?? 0,
  pod_info: d.pod_info ?? '',
  what_this_pod_offers: d.what_this_pod_offers ?? [],
  available_perks: d.available_perks ?? [],
  payment_terms: d.payment_terms ?? null,
  place_charges: (d.place_charges ?? []).map((c: any) => ({
    label: c.label,
    amount: c.amount ?? 0,
    note: c.note ?? null,
  })),
  products_enabled: !!d.products_enabled,
  product_requests: (d.product_requests ?? []).map((item: any) => ({
    product_id: String(item.product_id),
    product_name: item.product_name,
    unit_cost: item.unit_cost ?? 0,
    quantity: item.quantity ?? 0,
    total_cost: item.total_cost ?? 0,
  })),
  product_cost_total: d.product_cost_total ?? 0,
  // Non-null on `Pod` — the saved-pods read crashes without them.
  ticket_discount_enabled: !!d.ticket_discount_enabled,
  ticket_discount_tiers: (d.ticket_discount_tiers ?? []).map((tier: any) => ({
    min_tickets: tier.min_tickets,
    discount_pct: tier.discount_pct,
  })),
  like_count: (d.liked_user_ids ?? []).length,
  comment_count: (d.comments ?? []).length,
  liked_user_ids: idStrings(d.liked_user_ids),
  is_active: !!d.is_active,
  created_at: d.created_at?.toISOString?.() ?? '',
  updated_at: d.updated_at?.toISOString?.() ?? '',
});

export const userSavedPodMethods = {
  async toggleSavedPod(user_id: string, podId: string) {
    if (!Types.ObjectId.isValid(podId)) {
      throw new GraphQLError('Invalid pod', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const pod = await PodModel.findById(podId).select('_id');
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });

    const oid = new Types.ObjectId(user_id);
    const podOid = new Types.ObjectId(podId);

    const existing = await UserSavedPodModel.findOne({ user_id: oid, pod_id: podOid });
    let saved: boolean;
    if (existing) {
      await UserSavedPodModel.deleteOne({ _id: existing._id });
      await UserModel.updateOne({ _id: oid }, { $inc: { 'counters.saved_pods_count': -1 } });
      saved = false;
    } else {
      try {
        await UserSavedPodModel.create({ user_id: oid, pod_id: podOid });
        await UserModel.updateOne({ _id: oid }, { $inc: { 'counters.saved_pods_count': 1 } });
      } catch (e: any) {
        // Race: a concurrent toggle already inserted. Treat as already saved.
        if (e?.code !== 11000) throw e;
      }
      saved = true;
    }
    const ids = await UserSavedPodModel.find({ user_id: oid }).select('pod_id').lean();
    return { pod_id: podId, saved, saved_pod_ids: ids.map((d: any) => String(d.pod_id)) };
  },

  async listSavedPods(
    user_id: string,
    opts: { search?: string | null; categoryId?: string | null; sort?: string | null } = {}
  ) {
    const oid = new Types.ObjectId(user_id);
    const savedDocs = await UserSavedPodModel.find({ user_id: oid })
      .sort({ created_at: -1 })
      .select('pod_id')
      .lean();
    const ids = savedDocs.map((d: any) => String(d.pod_id));
    if (!ids.length) return [];
    // Rank each pod by how recently it was saved — the default sort order.
    const savedOrder = new Map(ids.map((id, index) => [id, index]));

    let docs: any[] = await PodModel.find({ _id: { $in: ids }, is_active: true });
    const clubIds = Array.from(
      new Set(docs.map((d: any) => d.club_id && String(d.club_id)).filter(Boolean))
    );
    const clubs = clubIds.length
      ? await ClubModel.find(
          { _id: { $in: clubIds } },
          { club_id: 1, category_id: 1, super_category_id: 1 }
        )
      : [];
    const clubById = new Map((clubs as any[]).map((c) => [String(c._id), c]));

    // Category filter — match the pod's club against the selected node and all of
    // its descendant sub-categories (a club is tagged at super + leaf level).
    if (opts.categoryId && Types.ObjectId.isValid(opts.categoryId)) {
      const catIds = await expandSavedCategoryIds([opts.categoryId]);
      docs = docs.filter((doc: any) => {
        const club = clubById.get(String(doc.club_id));
        if (!club) return false;
        return catIds.has(String(club.category_id)) || catIds.has(String(club.super_category_id));
      });
    }

    // Server-side search over the pod title/description.
    const term = opts.search?.trim();
    if (term) {
      const re = new RegExp(escapeSavedRegex(term), 'i');
      docs = docs.filter(
        (doc: any) => re.test(doc.pod_title ?? '') || re.test(doc.pod_description ?? '')
      );
    }

    return sortSavedPods(docs, opts.sort, savedOrder).map((doc: any) =>
      podToPublic(doc, clubById.get(String(doc.club_id))?.club_id ?? '')
    );
  },
};
