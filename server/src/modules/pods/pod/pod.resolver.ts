import { podService, mapPodToPublic, loadPodClubSlugMap } from './pod.service';
import { coHostService } from './coHost.service';
import { clubService } from '@modules/pods/club/club.service';
import type { GraphQLContext } from '@context';
import { requireRole, requireAuth } from '@middleware/rbac';
import { UserModel } from '@modules/access/user/user.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];
// Roles allowed to see pods still awaiting a venue's slot approval (admin +
// onboarding review consoles). Everyone else — including the public discovery
// feed — never receives a PENDING pod, so it stays offline until approved.
const POD_REVIEW_ROLES = new Set(['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'ONBOARDING_MANAGER']);

const isAdminCtx = (ctx: GraphQLContext) =>
  !!ctx.user?.roles?.some((r) => ADMIN_WRITE.includes(r));

const canReviewPendingPods = (ctx: GraphQLContext) =>
  !!ctx.user?.roles?.some((r) => POD_REVIEW_ROLES.has(r));

const cleanParts = (parts: Array<string | null | undefined>) =>
  parts.map((part) => part?.trim()).filter(Boolean) as string[];

const joinParts = (parts: Array<string | null | undefined>) => cleanParts(parts).join(', ');

const getPlaceCache = (ctx: GraphQLContext) => {
  const bag = ctx as GraphQLContext & {
    __podPlaceCache?: {
      venues: Map<string, Promise<any>>;
      locations: Map<string, Promise<any>>;
    };
  };
  bag.__podPlaceCache ??= { venues: new Map(), locations: new Map() };
  return bag.__podPlaceCache;
};

async function resolvePodPlace(parent: any, ctx: GraphQLContext) {
  if (parent.__podPlace) return parent.__podPlace;
  const cache = getPlaceCache(ctx);

  if ((parent.pod_mode ?? 'PHYSICAL') === 'VIRTUAL') {
    parent.__podPlace = {
      label: 'Virtual pod',
      detail: parent.meeting_platform || 'Online',
    };
    return parent.__podPlace;
  }

  if (parent.venue_id) {
    const key = String(parent.venue_id);
    if (!cache.venues.has(key)) {
      cache.venues.set(
        key,
        VenueModel.findById(key)
          .select('venue_name address_line1 address_line2 locality city state country postal_code')
          .lean()
          .exec()
      );
    }
    const venue = await cache.venues.get(key);
    if (venue) {
      parent.__podPlace = {
        label: venue.venue_name || joinParts([venue.locality, venue.city]) || 'Venue',
        detail: joinParts([
          venue.address_line1,
          venue.address_line2,
          venue.locality,
          venue.city,
          venue.state,
          venue.postal_code,
          venue.country,
        ]),
      };
      return parent.__podPlace;
    }
  }

  const zoneName = parent.zone_name?.trim() || '';
  if (parent.location_id) {
    const key = String(parent.location_id);
    if (!cache.locations.has(key)) {
      cache.locations.set(
        key,
        LocationModel.findById(key)
          .select('location_name city state country location_pincode location_zones')
          .lean()
          .exec()
      );
    }
    const location = await cache.locations.get(key);
    if (location) {
      const zone = (location.location_zones ?? []).find((item: any) => item.zone_name === zoneName);
      const city = location.city || location.location_name;
      parent.__podPlace = {
        label: joinParts([zoneName, city]) || city || location.location_name,
        detail: joinParts([location.state, zone?.pincode || location.location_pincode, location.country]),
      };
      return parent.__podPlace;
    }
  }

  parent.__podPlace = zoneName ? { label: zoneName, detail: '' } : { label: null, detail: null };
  return parent.__podPlace;
}

async function canViewMeeting(parent: any, ctx: GraphQLContext) {
  if ((parent.pod_mode ?? 'PHYSICAL') !== 'VIRTUAL') return false;
  if (isAdminCtx(ctx)) return true;
  const userId = ctx.user?.id;
  if (!userId) return false;
  const podId = parent.id ?? parent._id;
  if ((parent.pod_hosts_id ?? []).some((id: string) => String(id) === userId)) return true;
  if ((parent.pod_attendees ?? []).some((id: string) => String(id) === userId)) return true;
  return !!(await PodMemberModel.exists({ pod_id: podId, user_id: userId, status: 'JOINED' }));
}

export const podResolvers = {
  Pod: {
    pod_mode: (parent: any): string => parent.pod_mode ?? 'PHYSICAL',
    club: async (parent: any) => {
      if (!parent.club_id) return null;
      try {
        return await clubService.getById(String(parent.club_id));
      } catch {
        return null;
      }
    },
    meeting_url: async (parent: any, _a: unknown, ctx: GraphQLContext): Promise<string | null> => {
      return (await canViewMeeting(parent, ctx)) ? parent.meeting_url ?? null : null;
    },
    meeting_notes: async (parent: any, _a: unknown, ctx: GraphQLContext): Promise<string | null> => {
      return (await canViewMeeting(parent, ctx)) ? parent.meeting_notes ?? null : null;
    },
    place_label: async (parent: any, _a: unknown, ctx: GraphQLContext): Promise<string | null> => {
      const place = await resolvePodPlace(parent, ctx);
      return place.label || null;
    },
    place_detail: async (parent: any, _a: unknown, ctx: GraphQLContext): Promise<string | null> => {
      const place = await resolvePodPlace(parent, ctx);
      return place.detail || null;
    },
    host_names: async (parent: any): Promise<string[]> => {
      const ids: string[] = (parent.pod_hosts_id ?? []).filter(Boolean).map(String);
      if (ids.length === 0) return [];
      const users = await UserModel.find({ _id: { $in: ids } }).select(
        'profile.first_name profile.last_name'
      );
      const byId = new Map<string, string>();
      users.forEach((u: any) => {
        const name = `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim();
        if (name) byId.set(String(u._id), name);
      });
      return ids.map((id) => byId.get(id)).filter(Boolean) as string[];
    },
    liked_by_me: (parent: any, _a: unknown, ctx: GraphQLContext) => {
      const uid = ctx.user?.id;
      if (!uid) return false;
      return (parent.liked_user_ids ?? []).some((x: string) => String(x) === uid);
    },
    co_hosts: async (parent: any): Promise<any[]> => {
      const entries = parent.co_hosts ?? [];
      if (entries.length === 0) return [];
      const ids = entries.map((c: any) => String(c.user_id));
      const users = await UserModel.find({ _id: { $in: ids } }).select(
        'profile.first_name profile.last_name profile.profile_photo'
      );
      const byId = new Map<string, any>(users.map((u: any) => [String(u._id), u]));
      return entries.map((c: any) => {
        const u = byId.get(String(c.user_id));
        const name = `${u?.profile?.first_name ?? ''} ${u?.profile?.last_name ?? ''}`.trim();
        return {
          user_id: String(c.user_id),
          name,
          profile_photo: u?.profile?.profile_photo ?? null,
          status: c.status ?? 'PENDING',
          invited_at: c.invited_at ?? '',
          responded_at: c.responded_at ?? null,
        };
      });
    },
  },
  PodComment: {
    like_count: (parent: any): number => (parent.likes ?? []).length,
    liked_by_me: (parent: any, _a: unknown, ctx: GraphQLContext): boolean => {
      const uid = ctx.user?.id;
      if (!uid) return false;
      return (parent.likes ?? []).some((x: string) => String(x) === uid);
    },
  },
  Query: {
    pods: async (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) =>
      podService.list(args.filter, { includePendingApproval: canReviewPendingPods(ctx) }),
    podsTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) =>
      podService.table(args.query, { includePendingApproval: canReviewPendingPods(ctx) }),
    myHostPods: async (_p: unknown, args: { from?: string | null; to?: string | null }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return podService.listMyHostPods(user.id, { from: args.from, to: args.to });
    },
    myHostPodsTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return podService.tableMine(user.id, args.query);
    },
    pod: async (_p: unknown, args: { pod_doc_id: string }) => podService.getById(args.pod_doc_id),
    podBySlugs: async (
      _p: unknown,
      args: { club_slug: string; pod_slug: string }
    ) => podService.getBySlugs(args.club_slug, args.pod_slug),
    podComments: async (_p: unknown, args: { pod_doc_id: string }) =>
      podService.listComments(args.pod_doc_id),
    activePodLocationIds: async () => podService.activeLocationIds(),
    coHostCandidates: async (
      _p: unknown,
      args: { sub_category_id: string; search?: string | null; pod_doc_id?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return coHostService.candidates(user.id, args);
    },
    myCoHostedPods: async (
      _p: unknown,
      args: { status?: 'PENDING' | 'ACCEPTED' | 'DECLINED' },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      const docs = await coHostService.myCoHostedPods(user.id, args.status ?? 'ACCEPTED');
      const slugMap = await loadPodClubSlugMap(docs);
      return docs.map((d) => mapPodToPublic(d, slugMap));
    },
    myPodsWithCoHosts: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const docs = await coHostService.myPodsWithCoHosts(user.id);
      const slugMap = await loadPodClubSlugMap(docs);
      return docs.map((d) => mapPodToPublic(d, slugMap));
    },
    hostPodDeleteImpact: async (
      _p: unknown,
      args: { pod_doc_id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return podService.hostDeleteImpact(args.pod_doc_id, user.id);
    },
  },
  Mutation: {
    createPod: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return podService.create(args.input);
    },
    createPartnerPod: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return podService.createForPartner(user.id, args.input);
    },
    updatePod: async (
      _p: unknown,
      args: { pod_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return podService.update(args.pod_doc_id, args.input);
    },
    inviteCoHost: async (
      _p: unknown,
      args: { pod_doc_id: string; user_id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      const doc = await coHostService.invite(args.pod_doc_id, user.id, args.user_id);
      const slugMap = await loadPodClubSlugMap([doc]);
      return mapPodToPublic(doc, slugMap);
    },
    removeCoHost: async (
      _p: unknown,
      args: { pod_doc_id: string; user_id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      const doc = await coHostService.remove(args.pod_doc_id, user.id, args.user_id);
      const slugMap = await loadPodClubSlugMap([doc]);
      return mapPodToPublic(doc, slugMap);
    },
    respondToCoHostInvite: async (
      _p: unknown,
      args: { pod_doc_id: string; accept: boolean },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      const doc = await coHostService.respond(args.pod_doc_id, user.id, args.accept);
      const slugMap = await loadPodClubSlugMap([doc]);
      return mapPodToPublic(doc, slugMap);
    },
    hostUpdatePod: async (
      _p: unknown,
      args: { pod_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return podService.hostUpdate(args.pod_doc_id, user.id, args.input);
    },
    hostDeletePod: async (
      _p: unknown,
      args: { pod_doc_id: string; reason_subject: string; reason_note?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return podService.hostRemove(args.pod_doc_id, user.id, args.reason_subject, args.reason_note);
    },
    addPodStatus: async (
      _p: unknown,
      args: { pod_doc_id: string; media: any },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return podService.addStatus(args.pod_doc_id, user.id, args.media, isAdminCtx(ctx));
    },
    deletePod: async (_p: unknown, args: { pod_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return podService.remove(args.pod_doc_id);
    },
    incrementPodHits: async (_p: unknown, args: { pod_doc_id: string }) =>
      podService.incrementHits(args.pod_doc_id),
    togglePodLike: async (
      _p: unknown,
      args: { pod_doc_id: string },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      return podService.toggleLike(args.pod_doc_id, u.id);
    },
    addPodComment: async (
      _p: unknown,
      args: { pod_doc_id: string; text: string },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      return podService.addComment(args.pod_doc_id, u.id, args.text);
    },
    togglePodCommentLike: async (
      _p: unknown,
      args: { pod_doc_id: string; comment_id: string },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      return podService.toggleCommentLike(args.pod_doc_id, args.comment_id, u.id);
    },
    deletePodComment: async (
      _p: unknown,
      args: { pod_doc_id: string; comment_id: string },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      return podService.deleteComment(
        args.pod_doc_id,
        args.comment_id,
        u.id,
        isAdminCtx(ctx)
      );
    },
    generateMeetingLink: async (
      _p: unknown,
      args: { platform: string; title: string; start: string; end?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return podService.generateMeetingLink(args);
    },
  },
};
