import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { TECH_MANAGE } from '../tech/tech.resolver';
import { sslService } from './ssl.service';

export const sslResolvers = {
  Query: {
    sslCertificates: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return sslService.certificates();
    },
    sslLiveCheck: (_p: unknown, args: { name: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_MANAGE);
      return sslService.liveCheck(args.name);
    },
  },
};
