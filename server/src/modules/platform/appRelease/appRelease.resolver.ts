import { requireRole } from '@middleware/rbac';
import type { GraphQLContext } from '@context';
import { sendAppReleaseEmail, type SendAppReleaseEmailInput } from './appRelease.service';

const TECH_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const appReleaseResolvers = {
  Mutation: {
    sendAppReleaseEmail: async (
      _p: unknown,
      args: { input: SendAppReleaseEmailInput },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, TECH_MANAGE);
      return sendAppReleaseEmail(args.input);
    },
  },
};
