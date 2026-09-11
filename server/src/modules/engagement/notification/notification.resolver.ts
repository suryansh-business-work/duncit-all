import { notificationService } from './notification.service';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER'];

/**
 * The FollowRequest behind an actionable row. Three fields need it, so it is
 * memoised onto the parent: a 50-row inbox must not issue three reads per row.
 * A non-actionable row resolves to null without touching the database.
 */
async function loadRequest(parent: any): Promise<any> {
  if (parent?.action_type !== 'FOLLOW_REQUEST' || !parent?.action_ref_id) return null;
  if (parent.__followRequest !== undefined) return parent.__followRequest;
  const { FollowRequestModel } = await import(
    '@modules/access/user/relations/followRequest.model'
  );
  const request = await FollowRequestModel.findById(parent.action_ref_id)
    .select('status requester_id')
    .lean();
  parent.__followRequest = request ?? null;
  return parent.__followRequest;
}

/** The actor a Follow Back would act on: the column when the row has one, else
 * the requester behind action_ref_id so rows written before the column existed
 * still resolve one. */
async function actorIdOf(parent: any): Promise<string | null> {
  const stored = parent?.action_actor_id;
  if (stored) return String(stored);
  const requester = (await loadRequest(parent))?.requester_id;
  return requester ? String(requester) : null;
}

/** What `follow_back_status` answers for one row, given the viewer's edges
 * towards the page's actors — the same rule the per-row path below applies. */
function followBackOf(actorId: string | null, viewerId: string, statuses: Map<string, string>) {
  if (!actorId || actorId === viewerId) return 'NONE';
  return statuses.get(actorId) ?? 'NONE';
}

/**
 * The follow facts a page of inbox rows reads, in one query per collection
 * instead of up to three per row. The inbox is polled every 30s by every
 * signed-in header, so those per-row reads were a steady share of all database
 * traffic. An optimisation, not a prerequisite: a field resolver still loads
 * whatever was not primed (a row reached through another query).
 */
async function primeInbox(rows: readonly any[], viewerId: string): Promise<void> {
  const notifs = rows.map((row) => row?.notification).filter(Boolean);
  const asks = notifs.filter(
    (n) => n.action_type === 'FOLLOW_REQUEST' && n.action_ref_id && n.__followRequest === undefined
  );
  if (asks.length > 0) {
    const { FollowRequestModel } = await import(
      '@modules/access/user/relations/followRequest.model'
    );
    const found = await FollowRequestModel.find({ _id: { $in: asks.map((n) => n.action_ref_id) } })
      .select('status requester_id')
      .lean();
    const byId = new Map(found.map((request: any) => [String(request._id), request]));
    for (const n of asks) n.__followRequest = byId.get(String(n.action_ref_id)) ?? null;
  }
  const actors = await Promise.all(notifs.map((n) => actorIdOf(n)));
  const { userService } = await import('@modules/access/user/user.service');
  const statuses = await userService.followStatuses(
    viewerId,
    actors.filter((id): id is string => !!id && id !== viewerId)
  );
  notifs.forEach((n, index) => {
    n.__followBackStatus = followBackOf(actors[index], viewerId, statuses);
  });
}

export const notificationResolvers = {
  /**
   * An actionable row's buttons must disappear once the request behind it is
   * answered — including when it was answered from another device, or by the
   * requester withdrawing it. Reading the status live off the referenced
   * document is what keeps the inbox honest; the notification row itself is
   * never rewritten.
   */
  Notification: {
    action_status: async (parent: any) => (await loadRequest(parent))?.status ?? null,

    /** Who the row is about — what the recipient's Follow Back targets. */
    action_actor_id: (parent: any) => actorIdOf(parent),

    /**
     * The viewer's own follow state towards that actor, which is what decides
     * whether Follow Back is offered. Resolved live rather than frozen onto the
     * row: the viewer may have followed them from their profile since, and
     * offering Follow Back to somebody they already follow is the exact bug
     * this field exists to prevent.
     */
    follow_back_status: async (parent: any, _a: unknown, ctx: GraphQLContext) => {
      if (parent.__followBackStatus !== undefined) return parent.__followBackStatus;
      const viewerId = ctx.user?.id;
      if (!viewerId) return 'NONE';
      const actorId = await actorIdOf(parent);
      if (!actorId || actorId === String(viewerId)) return 'NONE';
      const { userService } = await import('@modules/access/user/user.service');
      return userService.followStatus(viewerId, actorId);
    },
  },
  Query: {
    notifications: async (_p: unknown, args: { limit?: number }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return notificationService.list(args.limit ?? 100);
    },
    notificationsTable: async (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return notificationService.table(args.query);
    },
    myNotifications: async (
      _p: unknown,
      args: { limit?: number; unreadOnly?: boolean },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      const rows = await notificationService.listForUser(u.id, args.limit ?? 50, !!args.unreadOnly);
      await primeInbox(rows, String(u.id));
      return rows;
    },
    myUnreadNotificationCount: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return notificationService.unreadCountForUser(u.id);
    },
    pushConfig: async () => {
      const publicKey = await notificationService.getPublicKey();
      return { publicKey };
    },
  },
  Mutation: {
    createNotification: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const u = requireRole(ctx, ADMIN_WRITE);
      return notificationService.create(args.input, u.id);
    },
    deleteNotification: async (_p: unknown, args: { notification_doc_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return notificationService.remove(args.notification_doc_id);
    },
    savePushSubscription: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return notificationService.savePushSubscription(u.id, args.input);
    },
    deletePushSubscription: async (_p: unknown, args: { endpoint: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return notificationService.deletePushSubscription(args.endpoint);
    },
    saveExpoPushToken: async (_p: unknown, args: { token: string; platform?: string | null }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return notificationService.saveExpoPushToken(u.id, args.token, args.platform ?? null);
    },
    deleteExpoPushToken: async (_p: unknown, args: { token: string }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return notificationService.deleteExpoPushToken(args.token);
    },
    markNotificationRead: async (
      _p: unknown,
      args: { user_notification_doc_id: string },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      return notificationService.markRead(u.id, args.user_notification_doc_id);
    },
    markAllNotificationsRead: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return notificationService.markAllRead(u.id);
    },
  },
};
