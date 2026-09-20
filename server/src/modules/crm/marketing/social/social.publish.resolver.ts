import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { socialPublishService, type ScheduledPostInput, type SocialQueueView } from './social.publish.service';
import { socialIdeasService, type SocialIdeasInput } from './social.ideas';
import type { SocialIdeaStatus } from './social.types';

/** Same gate as the rest of the marketing console. */
const ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER'];

type Ctx = GraphQLContext;
type IdArgs = { id: string };

export const socialPublishResolvers = {
  Query: {
    socialScheduledPosts: (_p: unknown, args: { view: SocialQueueView }, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialPublishService.list(args.view);
    },
    socialScheduledPost: (_p: unknown, args: IdArgs, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialPublishService.get(args.id);
    },
    socialCalendar: (_p: unknown, args: { from: string; to: string }, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialPublishService.calendar(args.from, args.to);
    },
    socialIdeas: (_p: unknown, args: { status?: SocialIdeaStatus | null }, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialIdeasService.list(args.status);
    },
  },
  Mutation: {
    createScheduledSocialPost: (_p: unknown, args: { input: ScheduledPostInput }, ctx: Ctx) => {
      const user = requireRole(ctx, ROLES);
      return socialPublishService.create(args.input, user.id);
    },
    updateScheduledSocialPost: (_p: unknown, args: IdArgs & { input: ScheduledPostInput }, ctx: Ctx) => {
      const user = requireRole(ctx, ROLES);
      return socialPublishService.update(args.id, args.input, user.id);
    },
    deleteScheduledSocialPost: (_p: unknown, args: IdArgs, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialPublishService.remove(args.id);
    },
    shareScheduledSocialPostNow: (_p: unknown, args: IdArgs, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialPublishService.shareNow(args.id);
    },
    retryScheduledSocialPost: (_p: unknown, args: IdArgs, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialPublishService.retry(args.id);
    },
    generateSocialIdeas: (_p: unknown, args: { input: SocialIdeasInput }, ctx: Ctx) => {
      const user = requireRole(ctx, ROLES);
      return socialIdeasService.generate(args.input, user.id);
    },
    setSocialIdeaStatus: (_p: unknown, args: IdArgs & { status: SocialIdeaStatus }, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialIdeasService.setStatus(args.id, args.status);
    },
    deleteSocialIdea: (_p: unknown, args: IdArgs, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return socialIdeasService.remove(args.id);
    },
  },
};
