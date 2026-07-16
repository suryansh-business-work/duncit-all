import type { GraphQLContext } from '@context';
import { hasRole, requireAuth, requireRole } from '@middleware/rbac';
import { adsService } from './ads.service';
import type { AdPosition } from './ads.model';

/** Advertisers submit from ads.duncit.com. */
const ADS_SUBMIT = ['SUPER_ADMIN', 'ADS_MANAGER'];
/** Marketing reviews, prices and approves — requests go to Marketing, not Admin. */
const MARKETING_REVIEW = ['SUPER_ADMIN', 'MARKETING_MANAGER'];

export const adsResolvers = {
  Query: {
    adPricing: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return adsService.pricing();
    },
    myAdRequestsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ADS_SUBMIT);
      return adsService.myTable(user.id, args.query);
    },
    adRequestsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, MARKETING_REVIEW);
      return adsService.table(args.query);
    },
    adRequest: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return adsService.byId(args.id, { id: user.id, canReview: hasRole(user, MARKETING_REVIEW) });
    },
    activeAds: (_p: unknown, args: { position: AdPosition }) => adsService.activeAds(args.position),
  },
  Mutation: {
    submitAdRequest: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ADS_SUBMIT);
      return adsService.submit(user.id, args.input);
    },
    reviewAdRequest: (
      _p: unknown,
      args: { id: string; approve: boolean; remarks?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, MARKETING_REVIEW);
      return adsService.review(user.id, args.id, args.approve, args.remarks);
    },
    updateAdPricing: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, MARKETING_REVIEW);
      return adsService.updatePricing(args.input);
    },
  },
  AdRequest: {
    submitted_by_name: (parent: { submitted_by: string }) =>
      adsService.submittedByName(parent.submitted_by),
  },
};
