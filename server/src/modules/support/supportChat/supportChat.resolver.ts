import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole, hasRole } from '@middleware/rbac';
import { supportChatService } from './supportChat.service';
import { listMyUnifiedSupportTickets } from './unifiedTickets.service';
import { userService } from '@modules/access/user/user.service';
import { registerSchema } from '@modules/access/user/user.validator';
import { validate } from '@utils/validate';

const SUPPORT_ROLES = ['SUPER_ADMIN', 'SUPPORT_MANAGER', 'SUPPORT_USER'];

export const supportChatResolvers = {
  Query: {
    supportChatSessions: (_p: unknown, args: { status?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, SUPPORT_ROLES);
      return supportChatService.listSessions(args.status);
    },
    supportChatMessages: async (
      _p: unknown,
      args: { session_id: string; limit?: number; before?: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      const isAgent = hasRole(user, SUPPORT_ROLES);
      const ok = await supportChatService.canAccessSession(args.session_id, user.id, isAgent);
      if (!ok) return [];
      return supportChatService.listMessages(args.session_id, args.limit, args.before);
    },
    mySupportChat: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return supportChatService.getMine(user.id);
    },
    myUnifiedSupportTickets: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return listMyUnifiedSupportTickets(user.id);
    },
    supportChatTranscript: async (
      _p: unknown,
      args: { session_id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      const isAgent = hasRole(user, SUPPORT_ROLES);
      const ok = await supportChatService.canAccessSession(args.session_id, user.id, isAgent);
      if (!ok) throw new GraphQLError('Chat session not found', { extensions: { code: 'NOT_FOUND' } });
      return supportChatService.transcript(args.session_id);
    },
  },
  Mutation: {
    startSupportChat: (_p: unknown, args: { text?: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return supportChatService.start(user.id, args.text);
    },
    sendSupportChatMessage: (
      _p: unknown,
      args: { session_id: string; text?: string; attachments?: string[] },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      const isAgent = hasRole(user, SUPPORT_ROLES);
      return supportChatService.sendMessage(user.id, isAgent, {
        sessionId: args.session_id,
        text: args.text,
        attachments: args.attachments,
      });
    },
    closeSupportChat: (_p: unknown, args: { session_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, SUPPORT_ROLES);
      return supportChatService.close(args.session_id);
    },
    resolveSupportChat: async (
      _p: unknown,
      args: { session_id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      const isAgent = hasRole(user, SUPPORT_ROLES);
      const ok = await supportChatService.canAccessSession(args.session_id, user.id, isAgent);
      if (!ok) throw new GraphQLError('Chat session not found', { extensions: { code: 'NOT_FOUND' } });
      return supportChatService.resolve(args.session_id, isAgent ? 'support' : 'the user');
    },
    reopenSupportChat: async (
      _p: unknown,
      args: { session_id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      const isAgent = hasRole(user, SUPPORT_ROLES);
      const ok = await supportChatService.canAccessSession(args.session_id, user.id, isAgent);
      if (!ok) throw new GraphQLError('Chat session not found', { extensions: { code: 'NOT_FOUND' } });
      return supportChatService.reopen(args.session_id, isAgent ? 'support' : 'the user');
    },
    submitSupportChatFeedback: (
      _p: unknown,
      args: { session_id: string; rating: number; comment?: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return supportChatService.submitFeedback(args.session_id, user.id, {
        rating: args.rating,
        comment: args.comment,
      });
    },
    emailSupportChatTranscript: async (
      _p: unknown,
      args: { session_id: string; email: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      const isAgent = hasRole(user, SUPPORT_ROLES);
      const ok = await supportChatService.canAccessSession(args.session_id, user.id, isAgent);
      if (!ok) throw new GraphQLError('Chat session not found', { extensions: { code: 'NOT_FOUND' } });
      return supportChatService.emailTranscript(args.session_id, args.email);
    },
    markSupportChatRead: (_p: unknown, args: { session_id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const isAgent = hasRole(user, SUPPORT_ROLES);
      return supportChatService.markRead(args.session_id, isAgent);
    },
    claimSupportChat: (_p: unknown, args: { session_id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, SUPPORT_ROLES);
      return supportChatService.claim(args.session_id, user.id);
    },
    supportCreateUser: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, SUPPORT_ROLES);
      // Reuses the public signup path (validation, USER role, welcome email);
      // the agent never receives the session token — only the created profile.
      const data = await validate(registerSchema, {
        first_name: args.input.first_name,
        last_name: args.input.last_name || undefined,
        email: args.input.email,
        phone_number: args.input.phone_number || undefined,
        phone_extension: args.input.phone_extension || undefined,
        password: args.input.password,
      });
      const payload = await userService.register(data);
      return (payload as any).user;
    },
  },
};
