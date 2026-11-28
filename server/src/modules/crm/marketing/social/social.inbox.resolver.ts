import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { autoReplyMutations, autoReplyQueries } from './social.autoReply.resolver';
import { socialConversationMutations, socialConversationQueries, socialConversationTypes } from './social.conversation.resolver';
import { socialInbox, type SocialInboxChannel } from './social.inbox';
import { inboxItemsTable } from './social.inbox.items';
import { suggestDirectMessage, suggestReply } from './social.inbox.ai';
import { replyCapabilities, replyToComment } from './social.replies';
import { socialWebhookMutations, socialWebhookQueries } from './social.webhook.resolver';
import type { SocialInboxStatus, SocialInboxView } from './social.types';

/** Everyone who works the social comments reads and works the Inbox — the same gate as the Monitoring tab. */
const INBOX_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER', 'MARKETING_EDITOR'];

type Ctx = GraphQLContext;

export const socialInboxResolvers = {
  ...socialConversationTypes,
  Query: {
    socialInboxTable: (
      _p: unknown,
      args: { query?: TableQueryInput | null; view?: SocialInboxView | null; channel?: SocialInboxChannel | null },
      ctx: Ctx
    ) => {
      const user = requireRole(ctx, INBOX_ROLES);
      return socialInbox.table(args.query, args.view, user.id, args.channel);
    },
    socialInboxItemsTable: (_p: unknown, args: { query?: TableQueryInput | null; view?: SocialInboxView | null }, ctx: Ctx) => {
      const user = requireRole(ctx, INBOX_ROLES);
      return inboxItemsTable(args.query, args.view, user.id);
    },
    socialInboxSummary: (_p: unknown, _a: unknown, ctx: Ctx) => {
      const user = requireRole(ctx, INBOX_ROLES);
      return socialInbox.summary(user.id);
    },
    socialReplyCapabilities: (_p: unknown, _a: unknown, ctx: Ctx) => {
      requireRole(ctx, INBOX_ROLES);
      return replyCapabilities();
    },
    // Direct messages and Social Settings (social.conversation.resolver.ts).
    ...socialConversationQueries,
    ...autoReplyQueries,
    // Meta webhook deliveries and registration (social.webhook.resolver.ts).
    ...socialWebhookQueries,
  },
  Mutation: {
    assignSocialComment: (_p: unknown, args: { id: string; user_id?: string | null }, ctx: Ctx) => {
      const user = requireRole(ctx, INBOX_ROLES);
      return socialInbox.assign(args.id, args.user_id, user.id);
    },
    setSocialCommentStatus: (_p: unknown, args: { id: string; status: SocialInboxStatus }, ctx: Ctx) => {
      const user = requireRole(ctx, INBOX_ROLES);
      return socialInbox.setStatus(args.id, args.status, user.id);
    },
    suggestSocialReply: (_p: unknown, args: { id: string }, ctx: Ctx) => {
      const user = requireRole(ctx, INBOX_ROLES);
      return suggestReply(args.id, user);
    },
    replyToSocialComment: (_p: unknown, args: { id: string; text: string }, ctx: Ctx) => {
      const user = requireRole(ctx, INBOX_ROLES);
      return replyToComment(args.id, args.text, user);
    },
    suggestSocialMessage: (_p: unknown, args: { id: string }, ctx: Ctx) => {
      const user = requireRole(ctx, INBOX_ROLES);
      return suggestDirectMessage(args.id, user);
    },
    ...socialConversationMutations,
    ...autoReplyMutations,
    ...socialWebhookMutations,
  },
};
