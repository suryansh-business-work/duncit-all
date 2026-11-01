import type { AuthUser, GraphQLContext } from '@context';
import { hasRole, requireRole } from '@middleware/rbac';
import { socialPublishService, type ScheduledPostInput, type SocialQueueView } from './social.publish.service';
import { socialIdeasService, type SocialIdeasInput } from './social.ideas';
import type { SocialIdeaStatus } from './social.types';

/** Who may send a post out without anyone else's yes. */
const ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER'];
/** An editor writes, schedules and retries posts too — each send goes through approval. */
const EDITOR_ROLES = [...ROLES, 'MARKETING_EDITOR'];

/** An editor's post always waits for a manager; a manager's waits only when they asked. */
const asSubmitted = (user: AuthUser, input: ScheduledPostInput): ScheduledPostInput =>
  hasRole(user, ROLES) ? input : { ...input, needs_approval: true };

type Ctx = GraphQLContext;
type IdArgs = { id: string };

export const socialPublishResolvers = {
  Query: {
    socialScheduledPosts: (_p: unknown, args: { view: SocialQueueView }, ctx: Ctx) => {
      requireRole(ctx, EDITOR_ROLES);
      return socialPublishService.list(args.view);
    },
    socialScheduledPost: (_p: unknown, args: IdArgs, ctx: Ctx) => {
      requireRole(ctx, EDITOR_ROLES);
      return socialPublishService.get(args.id);
    },
    socialCalendar: (_p: unknown, args: { from: string; to: string }, ctx: Ctx) => {
      requireRole(ctx, EDITOR_ROLES);
      return socialPublishService.calendar(args.from, args.to);
    },
    socialIdeas: (_p: unknown, args: { status?: SocialIdeaStatus | null }, ctx: Ctx) => {
      requireRole(ctx, EDITOR_ROLES);
      return socialIdeasService.list(args.status);
    },
  },
  Mutation: {
    createScheduledSocialPost: (_p: unknown, args: { input: ScheduledPostInput }, ctx: Ctx) => {
      const user = requireRole(ctx, EDITOR_ROLES);
      return socialPublishService.create(asSubmitted(user, args.input), user.id);
    },
    updateScheduledSocialPost: (_p: unknown, args: IdArgs & { input: ScheduledPostInput }, ctx: Ctx) => {
      const user = requireRole(ctx, EDITOR_ROLES);
      return socialPublishService.update(args.id, asSubmitted(user, args.input), user.id);
    },
    deleteScheduledSocialPost: (_p: unknown, args: IdArgs, ctx: Ctx) => {
      requireRole(ctx, EDITOR_ROLES);
      return socialPublishService.remove(args.id);
    },
    shareScheduledSocialPostNow: (_p: unknown, args: IdArgs, ctx: Ctx) => {
      const user = requireRole(ctx, ROLES);
      return socialPublishService.shareNow(args.id, user.id);
    },
    retryScheduledSocialPost: (_p: unknown, args: IdArgs, ctx: Ctx) => {
      const user = requireRole(ctx, EDITOR_ROLES);
      return socialPublishService.retry(args.id, user.id);
    },
    generateSocialIdeas: (_p: unknown, args: { input: SocialIdeasInput }, ctx: Ctx) => {
      const user = requireRole(ctx, EDITOR_ROLES);
      return socialIdeasService.generate(args.input, user.id);
    },
    setSocialIdeaStatus: (_p: unknown, args: IdArgs & { status: SocialIdeaStatus }, ctx: Ctx) => {
      requireRole(ctx, EDITOR_ROLES);
      return socialIdeasService.setStatus(args.id, args.status);
    },
    deleteSocialIdea: (_p: unknown, args: IdArgs, ctx: Ctx) => {
      requireRole(ctx, EDITOR_ROLES);
      return socialIdeasService.remove(args.id);
    },
  },
};
