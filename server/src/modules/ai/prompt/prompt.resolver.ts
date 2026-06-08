import { aiPromptService, type AiPromptInput } from './prompt.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

// AI Prompt Library is managed from the AI portal (AI_MANAGER) + platform admins.
const AI_RW = ['SUPER_ADMIN', 'AI_MANAGER'];

export const aiPromptResolvers = {
  Query: {
    aiPrompts: (
      _p: unknown,
      args: { filter?: { is_active?: boolean | null; category?: string | null; search?: string | null } | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, AI_RW);
      return aiPromptService.list(args.filter ?? {});
    },
    aiPrompt: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, AI_RW);
      return aiPromptService.get(args.id);
    },
  },
  Mutation: {
    createAiPrompt: (_p: unknown, args: { input: AiPromptInput }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, AI_RW);
      return aiPromptService.create(args.input, user.id);
    },
    updateAiPrompt: (
      _p: unknown,
      args: { id: string; input: Partial<AiPromptInput> },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, AI_RW);
      return aiPromptService.update(args.id, args.input);
    },
    deleteAiPrompt: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, AI_RW);
      return aiPromptService.remove(args.id);
    },
  },
};
