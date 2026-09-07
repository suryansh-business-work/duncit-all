import { expenseOptionService } from './expenseOption.service';
import {
  EXPENSE_ENTITY_SOURCES,
  findEntity,
  searchEntities,
  type ExpenseRelatedEntity,
} from './expenseOption.sources';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

/** The company ledger's roles — this is the configuration behind that ledger. */
const FINANCE_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];

/**
 * How many entities one picker keystroke may pull back.
 *
 * The picker searches the server rather than filtering a downloaded list, so
 * this is a page size and not a limit on what is reachable: a name not in the
 * first twenty is found by typing more of it.
 */
const DEFAULT_ENTITY_LIMIT = 20;
const MAX_ENTITY_LIMIT = 50;

export const expenseOptionResolvers = {
  Query: {
    expenseOptions: async (_p: unknown, args: { kind: string }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_RW);
      return expenseOptionService.active(args.kind);
    },
    expenseOptionsTable: async (_p: unknown, args: { kind: string }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_RW);
      return expenseOptionService.all(args.kind);
    },
    expenseEntitySources: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_RW);
      return EXPENSE_ENTITY_SOURCES;
    },
    expenseRelatedEntities: async (
      _p: unknown,
      args: { type_key: string; search?: string | null; limit?: number | null },
      ctx: GraphQLContext
    ): Promise<ExpenseRelatedEntity[]> => {
      requireRole(ctx, FINANCE_RW);
      const source = await expenseOptionService.entitySource(args.type_key);
      if (!source) return [];
      const limit = Math.min(MAX_ENTITY_LIMIT, Math.max(1, args.limit ?? DEFAULT_ENTITY_LIMIT));
      return searchEntities(source, args.search ?? '', limit);
    },
    expenseRelatedEntity: async (
      _p: unknown,
      args: { type_key: string; entity_id: string },
      ctx: GraphQLContext
    ): Promise<ExpenseRelatedEntity | null> => {
      requireRole(ctx, FINANCE_RW);
      const source = await expenseOptionService.entitySource(args.type_key);
      if (!source) return null;
      return findEntity(source, args.entity_id);
    },
  },
  Mutation: {
    createExpenseOption: async (
      _p: unknown,
      args: { kind: string; input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_RW);
      return expenseOptionService.create({ ...args.input, kind: args.kind });
    },
    updateExpenseOption: async (
      _p: unknown,
      args: { option_id: string; input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_RW);
      return expenseOptionService.update(args.option_id, args.input);
    },
    deleteExpenseOption: async (
      _p: unknown,
      args: { option_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_RW);
      return expenseOptionService.remove(args.option_id);
    },
  },
};
