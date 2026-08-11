import { mailAutomationService, type MailAutomationRuleInput } from './mailAutomation.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

/**
 * Two audiences, two gates — this is rule 1 of the feature, not an accident.
 *
 * Connecting and disconnecting a mailbox is handing Duncit a Google grant, so
 * it is Tech's. Writing the reply and choosing the queue is a promise made to
 * whoever wrote in, so it is Support's. Both can READ the list, because Support
 * has to pick a mailbox and Tech has to see what its grant is being used for.
 */
const CONNECT_ROLES = ['SUPER_ADMIN', 'TECH_MANAGER'];
const RULE_ROLES = ['SUPER_ADMIN', 'SUPPORT_MANAGER'];
const READ_ROLES = [...CONNECT_ROLES, ...RULE_ROLES];

export const mailAutomationResolvers = {
  Query: {
    mailAutomationConfigured: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, READ_ROLES);
      return mailAutomationService.configured();
    },
    mailAutomationAccounts: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, READ_ROLES);
      return mailAutomationService.listAccounts();
    },
    mailAutomationThreads: (
      _p: unknown,
      args: { account_id: string; limit?: number | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, READ_ROLES);
      return mailAutomationService.recentThreads(args.account_id, args.limit ?? 20);
    },
    mailAutomationPreview: (
      _p: unknown,
      args: { input: MailAutomationRuleInput },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RULE_ROLES);
      return mailAutomationService.preview(args.input);
    },
  },
  Mutation: {
    mailAutomationConnectUrl: (
      _p: unknown,
      args: { login_hint?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, CONNECT_ROLES);
      return mailAutomationService.connectUrl(user.id, args.login_hint);
    },
    disconnectMailAutomationAccount: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, CONNECT_ROLES);
      return mailAutomationService.disconnect(args.id);
    },
    updateMailAutomationRule: (
      _p: unknown,
      args: { input: MailAutomationRuleInput },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RULE_ROLES);
      return mailAutomationService.updateRule(args.input);
    },
  },
};
