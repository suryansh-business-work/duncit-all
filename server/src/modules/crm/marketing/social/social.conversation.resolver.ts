import type { GraphQLContext } from '@context';
import { getUrlConfigs } from '@config/url-configs';
import { requireRole } from '@middleware/rbac';
import { trimTrailingSlash } from '@utils/url';
import type { TableQueryInput } from '@utils/table-query';
import { conversationThread, socialConversations } from './social.conversations';
import { sendDirectMessage } from './social.dm.send';
import { loadSocialSettings, saveSocialSettings } from './social.settings';
import type { SocialInboxStatus, SocialInboxView } from './social.types';

/**
 * The Inbox's DMs and Social Settings. Everyone who works the comment Inbox
 * works DMs; changing Settings is for those who run the team (the same split
 * as Integrations). Every check is here, on the server.
 */
export const DM_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER', 'MARKETING_EDITOR'];
export const SETTINGS_MANAGE_ROLES = ['SUPER_ADMIN', 'MARKETING_MANAGER'];

type Ctx = GraphQLContext;

export const socialConversationQueries = {
  socialConversationsTable: (_p: unknown, args: { query?: TableQueryInput | null; view?: SocialInboxView | null }, ctx: Ctx) => {
    const user = requireRole(ctx, DM_ROLES);
    return socialConversations.table(args.query, args.view, user.id);
  },
  socialConversation: (_p: unknown, args: { id: string }, ctx: Ctx) => {
    requireRole(ctx, DM_ROLES);
    return conversationThread(args.id);
  },
  socialDmSummary: (_p: unknown, _a: unknown, ctx: Ctx) => {
    const user = requireRole(ctx, DM_ROLES);
    return socialConversations.summary(user.id);
  },
  socialSettings: (_p: unknown, _a: unknown, ctx: Ctx) => {
    requireRole(ctx, DM_ROLES);
    return loadSocialSettings();
  },
  socialWebhookUrl: async (_p: unknown, _a: unknown, ctx: Ctx) => {
    requireRole(ctx, DM_ROLES);
    const { serverUrl } = await getUrlConfigs();
    return `${trimTrailingSlash(serverUrl)}/social/webhooks/meta`;
  },
};

export const socialConversationMutations = {
  sendSocialMessage: async (_p: unknown, args: { id: string; text: string }, ctx: Ctx) => {
    const user = requireRole(ctx, DM_ROLES);
    await sendDirectMessage(args.id, args.text, { user });
    return conversationThread(args.id);
  },
  assignSocialConversation: (_p: unknown, args: { id: string; user_id?: string | null }, ctx: Ctx) => {
    const user = requireRole(ctx, DM_ROLES);
    return socialConversations.assign(args.id, args.user_id, user.id);
  },
  setSocialConversationStatus: (_p: unknown, args: { id: string; status: SocialInboxStatus }, ctx: Ctx) => {
    const user = requireRole(ctx, DM_ROLES);
    return socialConversations.setStatus(args.id, args.status, user.id);
  },
  markSocialConversationRead: (_p: unknown, args: { id: string }, ctx: Ctx) => {
    requireRole(ctx, DM_ROLES);
    return socialConversations.markRead(args.id);
  },
  updateSocialSettings: (_p: unknown, args: { input: unknown }, ctx: Ctx) => {
    const user = requireRole(ctx, SETTINGS_MANAGE_ROLES);
    return saveSocialSettings(args.input, user.id);
  },
};
