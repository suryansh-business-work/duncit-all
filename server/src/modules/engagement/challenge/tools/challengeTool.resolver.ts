import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { challengeToolService } from './challengeTool.service';
import { parseConfigJson } from './challengeTool.config';
import { challengeMappingService, type MappingInput } from '../mapping/challengeMapping.service';

/**
 * Tool Master, presets and category mappings. Challenge Portal staff manage
 * them; Admin > Categories edits the same mapping rows, so the platform's
 * category admins hold the mapping gates too.
 */
const RW = ['SUPER_ADMIN', 'CHALLENGE_MANAGER'];
const MAPPING_RW = ['SUPER_ADMIN', 'CHALLENGE_MANAGER', 'CITY_ADMIN'];

type ToolPub = NonNullable<Awaited<ReturnType<typeof challengeToolService.getById>>>;

export const challengeToolResolvers = {
  Query: {
    challengeTools: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, MAPPING_RW);
      // One mapping read for the whole list instead of one per tool.
      const [tools, byTool] = await Promise.all([challengeToolService.list(), challengeMappingService.categoriesByTool()]);
      return tools.map((t) => ({ ...t, mapped_category_ids: byTool.get(t.id) ?? [] }));
    },
    challengeTool: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return challengeToolService.getById(args.id);
    },
    challengeToolPresets: (_p: unknown, args: { tool_id?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, MAPPING_RW);
      return challengeToolService.presets(args.tool_id);
    },
    challengeCategoryMappings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, MAPPING_RW);
      return challengeMappingService.list();
    },
    challengeCategoryMapping: (_p: unknown, args: { category_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, MAPPING_RW);
      return challengeMappingService.effective(args.category_id);
    },
  },
  Mutation: {
    updateChallengeTool: (
      _p: unknown,
      args: { id: string; input: { name?: string; description?: string; default_config_json?: string; status?: string } },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      const { default_config_json, status, ...rest } = args.input;
      if (status && status !== 'ACTIVE' && status !== 'INACTIVE') {
        throw new GraphQLError('Unknown status', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      return challengeToolService.update(args.id, {
        ...rest,
        status: status as 'ACTIVE' | 'INACTIVE' | undefined,
        default_config: parseConfigJson(default_config_json),
      });
    },
    setChallengeToolCategories: async (
      _p: unknown,
      args: { tool_id: string; category_ids: string[] },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      await challengeMappingService.setToolCategories(args.tool_id, args.category_ids, user.id);
      return challengeToolService.getById(args.tool_id);
    },
    createChallengeToolPreset: (
      _p: unknown,
      args: { input: { tool_id: string; name: string; config_json?: string | null } },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return challengeToolService.createPreset({ ...args.input, config: parseConfigJson(args.input.config_json) });
    },
    updateChallengeToolPreset: (
      _p: unknown,
      args: { id: string; input: { name?: string | null; config_json?: string | null; is_active?: boolean | null } },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return challengeToolService.updatePreset(args.id, { ...args.input, config: parseConfigJson(args.input.config_json) });
    },
    duplicateChallengeToolPreset: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return challengeToolService.duplicatePreset(args.id);
    },
    upsertChallengeCategoryMapping: (
      _p: unknown,
      args: { category_id: string; input: MappingInput },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, MAPPING_RW);
      return challengeMappingService.upsert(args.category_id, args.input, user.id);
    },
    clearChallengeCategoryMapping: (_p: unknown, args: { category_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, MAPPING_RW);
      return challengeMappingService.clear(args.category_id);
    },
  },
  ChallengeTool: {
    mapped_category_ids: (tool: ToolPub & { mapped_category_ids?: string[] }) =>
      tool.mapped_category_ids ?? challengeMappingService.categoriesForTool(tool.id),
  },
};
