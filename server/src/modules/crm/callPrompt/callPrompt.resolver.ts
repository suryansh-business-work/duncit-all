import { callPromptService, type CallPromptInput } from './callPrompt.service';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const RW = [...CRM_RW];

export const callPromptResolvers = {
  Query: {
    crmCallPrompts: (
      _p: unknown,
      args: { filter?: { is_active?: boolean | null; search?: string | null } | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return callPromptService.list(args.filter ?? {});
    },
    crmCallPromptsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return callPromptService.table(args.query);
    },
    crmCallPrompt: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return callPromptService.get(args.id);
    },
  },
  Mutation: {
    createCrmCallPrompt: (_p: unknown, args: { input: CallPromptInput }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RW);
      return callPromptService.create(args.input, user.id);
    },
    updateCrmCallPrompt: (
      _p: unknown,
      args: { id: string; input: Partial<CallPromptInput> },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return callPromptService.update(args.id, args.input);
    },
    deleteCrmCallPrompt: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return callPromptService.remove(args.id);
    },
  },
};
