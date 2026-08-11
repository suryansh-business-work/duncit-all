import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import { UserModel } from '@modules/access/user/user.model';
import type { TableQueryInput } from '@utils/table-query';
import { mailPreferenceAnalytics } from './mailPreference.analytics';
import { mailPreferenceService } from './mailPreference.service';
import { verifyMailPreferenceToken } from './mailPreference.token';

/**
 * Who reads the analytics. Marketing owns the consequence of an opt-out, so
 * MARKETING_MANAGER is the point of it; the two admin roles are here because
 * they answer for the platform's reach when marketing asks why it dropped.
 */
const ANALYTICS_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER'];

/**
 * The address the signed-in person's preferences belong to.
 *
 * Read from the account rather than from the token: a token is issued once and
 * carried for weeks, so somebody who changed their email would otherwise edit
 * the preferences of an address they no longer own.
 */
async function myEmail(ctx: GraphQLContext): Promise<string> {
  const actor = requireAuth(ctx);
  const user = await UserModel.findById(actor.id).select('auth.email').lean();
  const email = user?.auth?.email ?? '';
  if (!email) {
    throw new GraphQLError('Your account has no email address', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return email;
}

/** The address an unsubscribe link is for, or a refusal. */
function tokenEmail(args: { e: string; t: string }): string {
  const email = verifyMailPreferenceToken(args.e, args.t);
  if (!email) {
    throw new GraphQLError('This unsubscribe link is not valid any more', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  return email;
}

export const mailPreferenceResolvers = {
  Query: {
    myMailPreferences: async (_p: unknown, _a: unknown, ctx: GraphQLContext) =>
      mailPreferenceService.forEmail(await myEmail(ctx)),

    mailPreferencesByToken: (_p: unknown, args: { e: string; t: string }) =>
      mailPreferenceService.forEmail(tokenEmail(args)),

    mailPreferenceAnalytics: (
      _p: unknown,
      args: { range_days?: number | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ANALYTICS_ROLES);
      return mailPreferenceAnalytics.summary(args.range_days);
    },

    mailPreferenceLogsTable: (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ANALYTICS_ROLES);
      return mailPreferenceAnalytics.logsTable(args.query);
    },
  },

  Mutation: {
    setMyMailPreference: async (
      _p: unknown,
      args: { category: string; enabled: boolean },
      ctx: GraphQLContext
    ) =>
      mailPreferenceService.set({
        email: await myEmail(ctx),
        category: args.category,
        enabled: args.enabled,
      }),

    setAllMyMailPreferences: async (
      _p: unknown,
      args: { enabled: boolean },
      ctx: GraphQLContext
    ) => mailPreferenceService.setAll({ email: await myEmail(ctx), enabled: args.enabled }),

    setMailPreferenceByToken: (
      _p: unknown,
      args: { e: string; t: string; category: string; enabled: boolean }
    ) =>
      mailPreferenceService.set({
        email: tokenEmail(args),
        category: args.category,
        enabled: args.enabled,
      }),

    unsubscribeAllByToken: (_p: unknown, args: { e: string; t: string }) =>
      mailPreferenceService.setAll({ email: tokenEmail(args), enabled: false }),
  },
};
