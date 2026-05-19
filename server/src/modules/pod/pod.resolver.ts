import { podService } from './pod.service';
import type { GraphQLContext } from '../../context';
import { requireRole, requireAuth } from '../../middleware/rbac';
import { UserModel } from '../user/user.model';
import { LocationModel } from '../location/location.model';
import { VenueModel } from '../venue/venue.model';
import { PodMemberModel } from '../podMember/podMember.model';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN'];

const isAdminCtx = (ctx: GraphQLContext) =>
  !!ctx.user?.roles?.some((r) => ADMIN_WRITE.includes(r));

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
  if (!bag.__podPlaceCache) {
    bag.__podPlaceCache = { venues: new Map(), locations: new Map() };
  }
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
        'first_name last_name'
      );
      const byId = new Map<string, string>();
      users.forEach((u: any) => {
        const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
        if (name) byId.set(String(u._id), name);
      });
      return ids.map((id) => byId.get(id)).filter(Boolean) as string[];
    },
    liked_by_me: (parent: any, _a: unknown, ctx: GraphQLContext) => {
      const uid = ctx.user?.id;
      if (!uid) return false;
      return (parent.liked_user_ids ?? []).some((x: string) => String(x) === uid);
    },
  },
  Query: {
    pods: async (_p: unknown, args: { filter?: any }) => podService.list(args.filter),
    myHostPods: async (_p: unknown, args: { from?: string | null; to?: string | null }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return podService.listMyHostPods(user.id, { from: args.from, to: args.to });
    },
    pod: async (_p: unknown, args: { pod_doc_id: string }) => podService.getById(args.pod_doc_id),
    podBySlugs: async (
      _p: unknown,
      args: { club_slug: string; pod_slug: string }
    ) => podService.getBySlugs(args.club_slug, args.pod_slug),
    podComments: async (_p: unknown, args: { pod_doc_id: string }) =>
      podService.listComments(args.pod_doc_id),
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
