import {
  multiPodCalculatorService,
  type SaveMultiPodCalculatorInput,
} from './multiPodCalculator.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

/** Same finance roles the rest of the portal's write surfaces use. */
const FINANCE_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];

export const multiPodCalculatorResolvers = {
  Query: {
    multiPodCalculators: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_RW);
      return multiPodCalculatorService.list();
    },
    multiPodCalculator: async (
      _p: unknown,
      args: { calculator_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_RW);
      return multiPodCalculatorService.get(args.calculator_doc_id);
    },
  },
  Mutation: {
    createMultiPodCalculator: async (
      _p: unknown,
      args: { input: SaveMultiPodCalculatorInput },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, FINANCE_RW);
      return multiPodCalculatorService.create(args.input, user.id);
    },
    updateMultiPodCalculator: async (
      _p: unknown,
      args: { calculator_doc_id: string; input: SaveMultiPodCalculatorInput },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_RW);
      return multiPodCalculatorService.update(args.calculator_doc_id, args.input);
    },
    deleteMultiPodCalculator: async (
      _p: unknown,
      args: { calculator_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_RW);
      return multiPodCalculatorService.remove(args.calculator_doc_id);
    },
  },
};
