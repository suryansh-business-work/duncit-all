import { Types } from 'mongoose';
import { podService, mapPodToPublic, loadPodClubSlugMap } from './pod.service';
import type { PodLifecycle } from './pod.lifecycle';
import { podDashboardService } from './pod.dashboard';
import { coHostService } from './coHost.service';
import { podMediaService } from './podMedia.service';
import { loadClub } from '@modules/clubs/club/club.loaders';
import type { GraphQLContext } from '@context';
import { requireRole, requireAuth } from '@middleware/rbac';
import { loadUserActors } from '@modules/access/user/user.loaders';
import { resolvePodPlace } from './pod.place';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { primePodRelations } from './pod.loaders';
import { throwIfClientGone } from '@utils/clientPresence';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];
// Roles allowed to see pods still awaiting a venue's slot approval (admin +
// onboarding review consoles). Everyone else — including the public discovery
// feed — never receives a PENDING pod, so it stays offline until approved.
const POD_REVIEW_ROLES = new Set(['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'ONBOARDING_MANAGER']);

const isAdminCtx = (ctx: GraphQLContext) =>
  !!ctx.user?.roles?.some((r) => ADMIN_WRITE.includes(r));

const canReviewPendingPods = (ctx: GraphQLContext) =>
  !!ctx.user?.roles?.some((r) => POD_REVIEW_ROLES.has(r));

/** Per-request cache of live product free-delivery thresholds (one lookup per
 * product across every pod's product_requests in the operation). */
const getProductThresholdCache = (ctx: GraphQLContext) => {
  const bag = ctx as GraphQLContext & { __podProductThresholdCache?: Map<string, Promise<any>> };
  bag.__podProductThresholdCache ??= new Map();
  return bag.__podProductThresholdCache;
};

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
    /**
     * Resolved from the SAME roster the settlement is computed from, so a pod's
     * detail view and the payout can never quote different attendance. Live,
     * not stored: a scan after this read changes the answer, which is exactly
     * why the completed release freezes its own copy.
     */
    attendance: async (parent: any) => {
      const id = parent?.id ?? parent?._id;
      if (!id) return { attended_seats: 0, booked_seats: 0, recorded: false };
      const { podAttendanceRoster } = await import(
        '@modules/finance/finance/settlement.service'
      );
      const roster = await podAttendanceRoster(String(id));
      return {
        attended_seats: roster.attended_seats,
        booked_seats: roster.booked_seats,
        // "Nobody scanned" is not "nobody came" — a virtual pod, or a host who
        // never opened the scanner, must not read as total absence.
        recorded: roster.attended_seats > 0,
      };
    },
    club: async (parent: any, _a: unknown, ctx: GraphQLContext) => {
      if (!parent.club_id) return null;
      try {
        // Batched per request: a feed's pods mostly share a handful of clubs,
        // and the list resolver has already primed every one of them.
        return await loadClub(ctx, String(parent.club_id));
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
    host_names: async (parent: any, _a: unknown, ctx: GraphQLContext): Promise<string[]> => {
      const ids: string[] = (parent.pod_hosts_id ?? []).filter(Boolean).map(String);
      if (ids.length === 0) return [];
      // One `$in` for the WHOLE page, not one per pod: this used to be the
      // single biggest source of round trips on the home feed.
      const actors = await loadUserActors(ctx, ids);
      return ids.map((id) => actors.get(id)?.name).filter(Boolean) as string[];
    },
    liked_by_me: (parent: any, _a: unknown, ctx: GraphQLContext) => {
      const uid = ctx.user?.id;
      if (!uid) return false;
      return (parent.liked_user_ids ?? []).some((x: string) => String(x) === uid);
    },
    co_hosts: async (parent: any, _a: unknown, ctx: GraphQLContext): Promise<any[]> => {
      const entries = parent.co_hosts ?? [];
      if (entries.length === 0) return [];
      const ids = entries.map((c: any) => String(c.user_id));
      const actors = await loadUserActors(ctx, ids);
      return entries.map((c: any) => {
        const actor = actors.get(String(c.user_id));
        return {
          user_id: String(c.user_id),
          name: actor?.name ?? '',
          profile_photo: actor?.avatar_url ?? null,
          status: c.status ?? 'PENDING',
          invited_at: c.invited_at ?? '',
          responded_at: c.responded_at ?? null,
        };
      });
    },
  },
  PodProductRequest: {
    // The pod snapshot predates the threshold field, so it is always resolved
    // from the LIVE product — the same source the checkout quote reads.
    free_delivery_above: async (parent: any, _a: unknown, ctx: GraphQLContext): Promise<number | null> => {
      const id = String(parent.product_id ?? '');
      if (!Types.ObjectId.isValid(id)) return null;
      const cache = getProductThresholdCache(ctx);
      if (!cache.has(id)) {
        cache.set(id, InventoryProductModel.findById(id).select('free_delivery_above').lean().exec());
      }
      const product = await cache.get(id);
      return product?.free_delivery_above ?? null;
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
    podDashboard: (_p: unknown, args: { days?: number | null }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return podDashboardService.load(args.days ?? 30);
    },
    pods: async (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      const rows = await podService.list(args.filter, {
        includePendingApproval: canReviewPendingPods(ctx),
      });
      // The feed is the slowest read there is, so it is also the one most likely
      // to outlive its caller. Stop here rather than resolving a field per row
      // for a socket that has already closed.
      throwIfClientGone(ctx);
      // Every club and every host for the whole page, in one read each. Without
      // this the Pod field resolvers below run once per row and the feed costs
      // hundreds of round trips.
      await primePodRelations(ctx, rows);
      return rows;
    },
    podsTable: async (
      _p: unknown,
      args: { query?: any; include_deleted?: boolean | null; lifecycle?: PodLifecycle | null },
      ctx: GraphQLContext
    ) => {
      const canReview = canReviewPendingPods(ctx);
      const page = await podService.table(args.query, {
        includePendingApproval: canReview,
        // Cancelled pods stay editable, so reviewers must be able to find them.
        // Filtering TO the cancelled bucket is that same request spelled out, so
        // it carries the same opt-in rather than quietly returning nothing.
        includeDeleted:
          canReview && (args.include_deleted === true || args.lifecycle === 'CANCELLED'),
        lifecycle: args.lifecycle ?? null,
      });
      throwIfClientGone(ctx);
      await primePodRelations(ctx, page.rows);
      return page;
    },
    myHostPods: async (_p: unknown, args: { from?: string | null; to?: string | null }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const rows = await podService.listMyHostPods(user.id, { from: args.from, to: args.to });
      throwIfClientGone(ctx);
      await primePodRelations(ctx, rows);
      return rows;
    },
    myHostPodsTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const page = await podService.tableMine(user.id, args.query);
      throwIfClientGone(ctx);
      await primePodRelations(ctx, page.rows);
      return page;
    },
    pod: async (
      _p: unknown,
      args: { pod_doc_id: string; include_deleted?: boolean | null },
      ctx: GraphQLContext
    ) =>
      // Admin reviewers may open a cancelled pod's detail page (timeline shows
      // the Cancelled stage); everyone else keeps the soft-delete guarantee.
      podService.getById(args.pod_doc_id, {
        includeDeleted: args.include_deleted === true && canReviewPendingPods(ctx),
      }),
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
    podMediaBoard: async (_p: unknown, args: { pod_doc_id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return podMediaService.board(args.pod_doc_id, { id: user.id, isAdmin: isAdminCtx(ctx) });
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
      const user = requireRole(ctx, ADMIN_WRITE);
      return podService.create(args.input, { actorUserId: user.id, source: 'ADMIN' });
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
      const user = requireRole(ctx, ADMIN_WRITE);
      // Admins edit a pod at any stage — including a cancelled (soft-deleted)
      // one, which every other caller cannot even read.
      return podService.update(args.pod_doc_id, args.input, {
        actorUserId: user.id,
        source: 'ADMIN',
        includeDeleted: true,
      });
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
    hostResubmitPod: async (
      _p: unknown,
      args: { pod_doc_id: string; input: any },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return podService.hostResubmit(args.pod_doc_id, user.id, args.input);
    },
    hostDeletePod: async (
      _p: unknown,
      args: { pod_doc_id: string; reason_subject: string; reason_note?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return podService.hostRemove(args.pod_doc_id, user.id, args.reason_subject, args.reason_note);
    },
    addPodPartyMedia: async (
      _p: unknown,
      args: { pod_doc_id: string; media: any[] },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return podMediaService.add(args.pod_doc_id, { id: user.id, isAdmin: isAdminCtx(ctx) }, args.media);
    },
    removePodPartyMedia: async (
      _p: unknown,
      args: { pod_doc_id: string; url: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return podMediaService.remove(args.pod_doc_id, { id: user.id, isAdmin: isAdminCtx(ctx) }, args.url);
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
      const user = requireRole(ctx, ADMIN_WRITE);
      return podService.remove(args.pod_doc_id, { actorUserId: user.id, source: 'ADMIN' });
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
