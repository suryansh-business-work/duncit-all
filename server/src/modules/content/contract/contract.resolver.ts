import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { contractService } from './contract.service';

// Same roles the rest of the Legal portal uses.
const LEGAL_ROLES = ['SUPER_ADMIN', 'LEGAL_MANAGER'];

export const contractResolvers = {
  Query: {
    contractsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return contractService.table(args.query);
    },
    contract: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return contractService.getById(args.id);
    },
  },
  Mutation: {
    createContract: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return contractService.create(user.id, args.input);
    },
    updateContract: (_p: unknown, args: { id: string; input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return contractService.update(user.id, args.id, args.input);
    },
    archiveContract: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return contractService.archive(user.id, args.id);
    },
    deleteContract: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return contractService.remove(args.id);
    },
    backfillContractIds: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return contractService.backfillIds();
    },
  },
};
