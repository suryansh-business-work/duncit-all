import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { productReviewService } from './productReview.service';

export const productReviewResolvers = {
  Query: {
    productReviews: (_p: unknown, args: { product_id: string }, ctx: GraphQLContext) =>
      productReviewService.listByProduct(args.product_id, ctx.user?.id ?? null),
    productReviewSummary: (_p: unknown, args: { product_id: string }) =>
      productReviewService.summary(args.product_id),
  },
  Mutation: {
    createProductReview: (
      _p: unknown,
      args: { input: { product_id: string; rating: number; comment?: string | null; images?: string[] | null } },
      ctx: GraphQLContext
    ) => productReviewService.create(requireAuth(ctx).id, args.input),
    voteProductReview: (_p: unknown, args: { review_id: string; vote: number }, ctx: GraphQLContext) =>
      productReviewService.vote(requireAuth(ctx).id, args.review_id, args.vote),
    replyToProductReview: (_p: unknown, args: { review_id: string; reply: string }, ctx: GraphQLContext) =>
      productReviewService.reply(requireAuth(ctx).id, args.review_id, args.reply),
  },
};
