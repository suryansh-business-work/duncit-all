import { podCalculatorService, type SavePodCalculatorInput } from './podCalculator.service';
import type { GraphQLContext } from '@context';
import { FINANCE_READER, requireRole } from '@middleware/rbac';

/** Same finance roles the rest of the portal's write surfaces use. */
const FINANCE_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];
// The Finance console's reads — the analyst seat reads them, never writes.
const FINANCE_READ = [...FINANCE_RW, FINANCE_READER];

export const podCalculatorResolvers = {
  Query: {
    podCalculators: async (_p: unknown, args: { kind: string }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_READ);
      return podCalculatorService.list(args.kind);
    },
    podCalculator: async (
      _p: unknown,
      args: { calculator_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_READ);
      return podCalculatorService.get(args.calculator_doc_id);
    },
    podCalculatorPdfBase64: async (
      _p: unknown,
      args: { calculator_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_READ);
      return podCalculatorService.pdfBase64(args.calculator_doc_id);
    },
  },
  Mutation: {
    createPodCalculator: async (
      _p: unknown,
      args: { input: SavePodCalculatorInput },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, FINANCE_RW);
      return podCalculatorService.create(args.input, user.id);
    },
    updatePodCalculator: async (
      _p: unknown,
      args: { calculator_doc_id: string; input: SavePodCalculatorInput },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_RW);
      return podCalculatorService.update(args.calculator_doc_id, args.input);
    },
    deletePodCalculator: async (
      _p: unknown,
      args: { calculator_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_RW);
      return podCalculatorService.remove(args.calculator_doc_id);
    },
    emailPodCalculator: async (
      _p: unknown,
      args: { calculator_doc_id: string; to: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, FINANCE_RW);
      return podCalculatorService.email(args.calculator_doc_id, args.to);
    },
  },
};
