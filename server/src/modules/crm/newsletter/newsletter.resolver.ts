import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { newsletterService } from './newsletter.service';

const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'WEBSITE_MANAGER'];

export const newsletterResolvers = {
  Query: {
    newsletterSubscribers: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return newsletterService.list();
    },
  },
  Mutation: {
    subscribeNewsletter: (_p: unknown, args: { input: { email: string; source?: string } }) =>
      newsletterService.subscribe(args.input),
    unsubscribeNewsletter: (_p: unknown, args: { email: string }) =>
      newsletterService.unsubscribe(args.email),
  },
};
