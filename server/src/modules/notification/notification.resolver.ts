import { notificationService } from './notification.service';
import type { GraphQLContext } from '../../context';
import { requireAuth, requireRole } from '../../middleware/rbac';

const ADMIN_WRITE = ['SUPER_ADMIN', 'CITY_ADMIN'];

export const notificationResolvers = {
  Query: {
    notifications: async (_p: unknown, args: { limit?: number }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return notificationService.list(args.limit ?? 100);
    },
    myNotifications: async (
      _p: unknown,
      args: { limit?: number; unreadOnly?: boolean },
      ctx: GraphQLContext
    ) => {
      const u = requireAuth(ctx);
      return notificationService.listForUser(u.id, args.limit ?? 50, !!args.unreadOnly);
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
