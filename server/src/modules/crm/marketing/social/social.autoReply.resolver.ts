import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { autoReplyRules } from './social.autoReply.rules';
import { DM_ROLES, SETTINGS_MANAGE_ROLES } from './social.conversation.resolver';

/**
 * Auto-reply rules: everyone who works the Inbox may read them; changing them
 * is for those who change Social Settings, since a rule writes to people on
 * the team's behalf. Checked here, on the server.
 */
type Ctx = GraphQLContext;

export const autoReplyQueries = {
  socialAutoReplyRulesTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: Ctx) => {
    requireRole(ctx, DM_ROLES);
    return autoReplyRules.table(args.query);
  },
};

export const autoReplyMutations = {
  createSocialAutoReplyRule: (_p: unknown, args: { input: unknown }, ctx: Ctx) => {
    const user = requireRole(ctx, SETTINGS_MANAGE_ROLES);
    return autoReplyRules.create(args.input, user.id);
  },
  updateSocialAutoReplyRule: (_p: unknown, args: { id: string; input: unknown }, ctx: Ctx) => {
    const user = requireRole(ctx, SETTINGS_MANAGE_ROLES);
    return autoReplyRules.update(args.id, args.input, user.id);
  },
  deleteSocialAutoReplyRule: (_p: unknown, args: { id: string }, ctx: Ctx) => {
    requireRole(ctx, SETTINGS_MANAGE_ROLES);
    return autoReplyRules.remove(args.id);
  },
};
