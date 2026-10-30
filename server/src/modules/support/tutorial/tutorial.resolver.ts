import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import { validate } from '@utils/validate';
import type { TableQueryInput } from '@utils/table-query';
import type { IdLike } from '@utils/request-cache';
import { loadPublicUser } from '@modules/access/user/user.loaders';
import { tutorialService } from './tutorial.service';
import { tutorialEngagementService, type TutorialFeedArgs } from './tutorialEngagement.service';
import { tutorialInputSchema, tutorialTopicInputSchema } from './tutorial.validator';

// Tutorials are authored in the Support portal by the same seats that write
// its FAQs (see faq.resolver FAQ_RW) — the server is the gate, not the nav.
const TUTORIAL_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'SUPPORT_MANAGER'];

export const tutorialResolvers = {
  TutorialComment: {
    // Every comment of a page asks in the same tick: one batched user read.
    author: (parent: { author_id?: IdLike }, _a: unknown, ctx: GraphQLContext) =>
      parent.author_id ? loadPublicUser(ctx, String(parent.author_id)) : null,
  },
  Query: {
    tutorials: (_p: unknown, args: TutorialFeedArgs, ctx: GraphQLContext) =>
      tutorialEngagementService.feed(requireAuth(ctx).id, args),
    tutorialTopics: (_p: unknown, args: { include_inactive?: boolean | null }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      if (args.include_inactive) requireRole(ctx, TUTORIAL_RW);
      return tutorialService.topics(!!args.include_inactive);
    },
    tutorialComments: (
      _p: unknown,
      args: { tutorial_id: string; page?: number | null; page_size?: number | null },
      ctx: GraphQLContext
    ) => tutorialEngagementService.comments(requireAuth(ctx).id, args.tutorial_id, args.page, args.page_size),
    tutorialsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, TUTORIAL_RW);
      return tutorialService.table(args.query);
    },
    tutorialTopicsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, TUTORIAL_RW);
      return tutorialService.topicsTable(args.query);
    },
    tutorialStats: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TUTORIAL_RW);
      return tutorialService.stats();
    },
  },
  Mutation: {
    createTutorial: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      const actor = requireRole(ctx, TUTORIAL_RW);
      return tutorialService.create(await validate(tutorialInputSchema, args.input), actor.id);
    },
    updateTutorial: async (_p: unknown, args: { tutorial_id: string; input: unknown }, ctx: GraphQLContext) => {
      requireRole(ctx, TUTORIAL_RW);
      return tutorialService.update(args.tutorial_id, await validate(tutorialInputSchema, args.input));
    },
    deleteTutorial: (_p: unknown, args: { tutorial_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TUTORIAL_RW);
      return tutorialService.remove(args.tutorial_id);
    },
    createTutorialTopic: async (_p: unknown, args: { input: unknown }, ctx: GraphQLContext) => {
      requireRole(ctx, TUTORIAL_RW);
      return tutorialService.createTopic(await validate(tutorialTopicInputSchema, args.input));
    },
    updateTutorialTopic: async (_p: unknown, args: { topic_id: string; input: unknown }, ctx: GraphQLContext) => {
      requireRole(ctx, TUTORIAL_RW);
      return tutorialService.updateTopic(args.topic_id, await validate(tutorialTopicInputSchema, args.input));
    },
    deleteTutorialTopic: (_p: unknown, args: { topic_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, TUTORIAL_RW);
      return tutorialService.removeTopic(args.topic_id);
    },
    toggleTutorialLike: (_p: unknown, args: { tutorial_id: string }, ctx: GraphQLContext) =>
      tutorialEngagementService.toggleLike(requireAuth(ctx).id, args.tutorial_id),
    addTutorialComment: (_p: unknown, args: { tutorial_id: string; text: string }, ctx: GraphQLContext) =>
      tutorialEngagementService.addComment(requireAuth(ctx).id, args.tutorial_id, args.text),
    deleteMyTutorialComment: (_p: unknown, args: { comment_id: string }, ctx: GraphQLContext) =>
      tutorialEngagementService.deleteMyComment(requireAuth(ctx).id, args.comment_id),
    markTutorialWatched: (_p: unknown, args: { tutorial_id: string }, ctx: GraphQLContext) =>
      tutorialEngagementService.markWatched(requireAuth(ctx).id, args.tutorial_id),
  },
};
