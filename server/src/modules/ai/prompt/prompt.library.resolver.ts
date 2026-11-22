import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { promptAnalytics, recordPromptEvent } from './prompt.analytics';
import type { PromptEventType } from './prompt.analytics.model';
import { promptDetail, setArchived } from './prompt.detail';
import { restoreVersion } from './prompt.history';
import { scorePrompt } from './prompt.quality';
import { disableShare, enableShare } from './prompt.share';

// Same audience as the rest of the AI Library.
const AI_RW = ['SUPER_ADMIN', 'AI_MANAGER'];

/** Interactions the portal itself reports. Public views and feed hits come from their own routes. */
const PORTAL_EVENTS: ReadonlySet<PromptEventType> = new Set<PromptEventType>([
  'DETAIL_VIEW',
  'QUICK_VIEW',
  'COPY_PROMPT',
  'COPY_LINK',
  'OPEN_IN_PLATFORM',
  'COPY_SCRIPT',
]);

type IdArgs = { id: string };

export const aiPromptLibraryResolvers = {
  Query: {
    aiPromptDetail: (_p: unknown, args: IdArgs, ctx: GraphQLContext) => {
      requireRole(ctx, AI_RW);
      return promptDetail(args.id);
    },
    aiPromptAnalytics: (_p: unknown, args: IdArgs & { range_days?: number | null }, ctx: GraphQLContext) => {
      requireRole(ctx, AI_RW);
      return promptAnalytics(args.id, args.range_days);
    },
  },
  Mutation: {
    scoreAiPrompt: (_p: unknown, args: IdArgs & { force?: boolean | null }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, AI_RW);
      return scorePrompt(args.id, args.force === true, user.id);
    },
    archiveAiPrompt: (_p: unknown, args: IdArgs, ctx: GraphQLContext) => {
      const user = requireRole(ctx, AI_RW);
      return setArchived(args.id, true, user.id);
    },
    unarchiveAiPrompt: (_p: unknown, args: IdArgs, ctx: GraphQLContext) => {
      const user = requireRole(ctx, AI_RW);
      return setArchived(args.id, false, user.id);
    },
    enableAiPromptPublicShare: (_p: unknown, args: IdArgs & { regenerate?: boolean | null }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, AI_RW);
      return enableShare(args.id, args.regenerate === true, user.id);
    },
    disableAiPromptPublicShare: (_p: unknown, args: IdArgs, ctx: GraphQLContext) => {
      requireRole(ctx, AI_RW);
      return disableShare(args.id);
    },
    restoreAiPromptVersion: (_p: unknown, args: IdArgs & { version: number }, ctx: GraphQLContext) => {
      requireRole(ctx, AI_RW);
      return restoreVersion(args.id, args.version);
    },
    recordAiPromptEvent: (
      _p: unknown,
      args: IdArgs & { type: PromptEventType; platform?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, AI_RW);
      if (!PORTAL_EVENTS.has(args.type)) {
        throw new GraphQLError(`${args.type} is recorded by its own route, not from the portal`, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      return recordPromptEvent({
        promptId: args.id,
        type: args.type,
        surface: 'PORTAL',
        platform: args.platform ?? null,
        userId: user.id,
      });
    },
  },
};
