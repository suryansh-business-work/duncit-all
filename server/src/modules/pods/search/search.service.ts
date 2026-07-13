import { Types } from 'mongoose';
import { ClubModel } from '@modules/pods/club/club.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { ClubFollowerModel } from '@modules/access/user/relations';
import { mapClubToPublic } from '@modules/pods/club/club.service';
import { mapPodToPublic, loadPodClubSlugMap } from '@modules/pods/pod/pod.service';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SUGGESTION_CAP = 20;

export interface DiscoveryInput {
  query?: string | null;
  category_id?: string | null;
}

interface ClubResult {
  club: ReturnType<typeof mapClubToPublic>;
  upcoming_pods: any[];
  next_pod_date: string | null;
  participant_count: number;
  is_following: boolean;
  /** Internal-only — drives "Most Popular" ordering; not exposed in the schema. */
  followers: number;
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
const toMs = (iso: string | null) => (iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY);
const toObjectIds = (ids: string[]) => ids.map((id) => new Types.ObjectId(id));

/** Walk the category tree downward so a SUPER/CATEGORY match also covers its
 * descendant sub-categories (a club may be tagged at any level). */
async function expandCategoryIds(rootIds: string[]): Promise<string[]> {
  const all = new Set(rootIds.filter((id) => Types.ObjectId.isValid(id)));
  let frontier = Array.from(all);
  while (frontier.length > 0) {
    const children = await CategoryModel.find({ parent_id: { $in: frontier } })
      .select('_id')
      .lean();
    const next: string[] = [];
    for (const child of children) {
      const id = String(child._id);
      if (!all.has(id)) {
        all.add(id);
        next.push(id);
      }
    }
    frontier = next;
  }
  return Array.from(all);
}

async function categoryIdsMatchingName(query: string): Promise<string[]> {
  const cats = await CategoryModel.find({ name: new RegExp(escapeRegex(query), 'i'), is_active: true })
    .select('_id')
    .lean();
  return cats.length ? expandCategoryIds(cats.map((c) => String(c._id))) : [];
}

async function clubIdsWithMatchingPods(query: string): Promise<string[]> {
  const rx = new RegExp(escapeRegex(query), 'i');
  const pods = await PodModel.find({ is_active: true, $or: [{ pod_title: rx }, { pod_hashtag: rx }] })
    .select('club_id')
    .lean();
  return Array.from(new Set(pods.map((p: any) => p.club_id && String(p.club_id)).filter(Boolean)));
}

async function queryClause(query: string): Promise<Record<string, unknown>> {
  const rx = new RegExp(escapeRegex(query), 'i');
  const or: Record<string, unknown>[] = [{ club_name: rx }, { club_id: rx }, { club_description: rx }];
  const [catIds, podClubIds] = await Promise.all([
    categoryIdsMatchingName(query),
    clubIdsWithMatchingPods(query),
  ]);
  if (catIds.length) {
    or.push({ category_id: { $in: catIds } }, { super_category_id: { $in: catIds } });
  }
  if (podClubIds.length) {
    or.push({ _id: { $in: podClubIds } });
  }
  return { $or: or };
}

async function findCandidateClubs(input: DiscoveryInput): Promise<any[]> {
  const query = (input.query ?? '').trim();
  const and: Record<string, unknown>[] = [];
  if (query) {
    and.push(await queryClause(query));
  }
  if (input.category_id && Types.ObjectId.isValid(input.category_id)) {
    const ids = await expandCategoryIds([input.category_id]);
    and.push({ $or: [{ category_id: { $in: ids } }, { super_category_id: { $in: ids } }] });
  }
  if (and.length === 0) {
    return [];
  }
  return ClubModel.find({ is_active: true, $and: and }).lean();
}

async function upcomingPodsByClub(clubIds: string[]): Promise<Map<string, any[]>> {
  const map = new Map<string, any[]>();
  if (clubIds.length === 0) {
    return map;
  }
  const now = new Date();
  const until = new Date(now.getTime() + WEEK_MS);
  const docs = await PodModel.find({
    is_active: true,
    club_id: { $in: clubIds },
    pod_date_time: { $gte: now, $lte: until },
  }).sort({ pod_date_time: 1 });
  const slugMap = await loadPodClubSlugMap(docs);
  for (const doc of docs) {
    const key = String(doc.club_id);
    const bucket = map.get(key) ?? [];
    bucket.push(mapPodToPublic(doc, slugMap));
    map.set(key, bucket);
  }
  return map;
}

async function followerCounts(clubIds: string[]): Promise<Map<string, number>> {
  if (clubIds.length === 0) {
    return new Map();
  }
  const rows = await ClubFollowerModel.aggregate([
    { $match: { club_id: { $in: toObjectIds(clubIds) } } },
    { $group: { _id: '$club_id', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row: any) => [String(row._id), row.n as number]));
}

async function followedClubIds(viewerId: string | null): Promise<Set<string>> {
  if (!viewerId || !Types.ObjectId.isValid(viewerId)) {
    return new Set();
  }
  const rows = await ClubFollowerModel.find({ user_id: new Types.ObjectId(viewerId) })
    .select('club_id')
    .lean();
  return new Set(rows.map((row: any) => String(row.club_id)));
}

const sumAttendees = (pods: any[]) =>
  pods.reduce((sum, pod) => sum + (pod.pod_attendees?.length ?? 0), 0);

const compareHappening = (a: ClubResult, b: ClubResult) =>
  b.followers - a.followers ||
  toMs(a.next_pod_date) - toMs(b.next_pod_date) ||
  b.club!.updated_at.localeCompare(a.club!.updated_at);

const compareMore = (a: ClubResult, b: ClubResult) =>
  b.followers - a.followers || b.club!.updated_at.localeCompare(a.club!.updated_at);

const stripInternal = ({ followers, ...rest }: ClubResult) => rest;

function rankSuggestions(
  raw: Array<{ text: string; kind: string }>,
  query: string,
  limit: number,
) {
  const lower = query.toLowerCase();
  const score = (text: string) => {
    const value = text.toLowerCase();
    if (value === lower) return 0;
    if (value.startsWith(lower)) return 1;
    return 2;
  };
  const seen = new Set<string>();
  const deduped = raw.filter((item) => {
    const key = item.text.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const sorted = [...deduped].sort(
    (a, b) => score(a.text) - score(b.text) || a.text.localeCompare(b.text),
  );
  return sorted.slice(0, limit);
}

export const searchService = {
  async discovery(input: DiscoveryInput, viewerId: string | null) {
    const query = (input.query ?? '').trim();
    const candidates = await findCandidateClubs(input);
    if (candidates.length === 0) {
      return { query, happening: [], more_clubs: [] };
    }
    const clubIds = candidates.map((doc: any) => String(doc._id));
    const [podsByClub, followers, following] = await Promise.all([
      upcomingPodsByClub(clubIds),
      followerCounts(clubIds),
      followedClubIds(viewerId),
    ]);

    const results: ClubResult[] = candidates.map((doc: any) => {
      const id = String(doc._id);
      const pods = podsByClub.get(id) ?? [];
      return {
        club: mapClubToPublic(doc),
        upcoming_pods: pods,
        next_pod_date: pods[0]?.pod_date_time ?? null,
        participant_count: sumAttendees(pods),
        is_following: following.has(id),
        followers: followers.get(id) ?? 0,
      };
    });

    const withPods = results.filter((result) => result.upcoming_pods.length > 0);
    const withoutPods = results.filter((result) => result.upcoming_pods.length === 0);
    const happening = [...withPods].sort(compareHappening).map(stripInternal);
    const more = [...withoutPods].sort(compareMore).map(stripInternal);
    return { query, happening, more_clubs: more };
  },

  async suggestions(query: string, limit: number) {
    const trimmed = (query ?? '').trim();
    if (!trimmed) {
      return [];
    }
    const cap = Math.max(1, Math.min(limit, SUGGESTION_CAP));
    const rx = new RegExp(escapeRegex(trimmed), 'i');
    const [clubs, cats, pods] = await Promise.all([
      ClubModel.find({ is_active: true, club_name: rx }).select('club_name').limit(25).lean(),
      CategoryModel.find({ is_active: true, name: rx }).select('name').limit(25).lean(),
      PodModel.find({ is_active: true, $or: [{ pod_title: rx }, { pod_hashtag: rx }] })
        .select('pod_title pod_hashtag')
        .limit(40)
        .lean(),
    ]);
    const raw: Array<{ text: string; kind: string }> = [];
    clubs.forEach((club: any) => raw.push({ text: club.club_name, kind: 'CLUB' }));
    cats.forEach((cat: any) => raw.push({ text: cat.name, kind: 'CATEGORY' }));
    pods.forEach((pod: any) => {
      if (pod.pod_title) raw.push({ text: pod.pod_title, kind: 'POD' });
      (pod.pod_hashtag ?? []).forEach((tag: string) => {
        if (rx.test(tag)) raw.push({ text: tag, kind: 'ACTIVITY' });
      });
    });
    return rankSuggestions(raw, trimmed, cap);
  },
};
