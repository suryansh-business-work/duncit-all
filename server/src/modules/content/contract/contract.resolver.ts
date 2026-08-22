import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { userDisplayOf } from '@modules/access/user/user.display';
import { contractService } from './contract.service';

// Same roles the rest of the Legal portal uses.
const LEGAL_ROLES = ['SUPER_ADMIN', 'LEGAL_MANAGER'];

export const contractResolvers = {
  Contract: {
    created_by_name: async (parent: { created_by?: unknown }) =>
      parent.created_by ? (await userDisplayOf(String(parent.created_by))).name : '',
    updated_by_name: async (parent: { updated_by?: unknown }) =>
      parent.updated_by ? (await userDisplayOf(String(parent.updated_by))).name : '',
  },
  Query: {
    contractsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return contractService.table(args.query);
    },
    contract: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return contractService.getById(args.id);
    },
    contractPdfBase64: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      const pdf = await contractService.pdf(args.id);
      return pdf.toString('base64');
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
    signContract: (_p: unknown, args: { id: string; input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return contractService.sign(user.id, args.id, args.input);
    },
    shareContract: (
      _p: unknown,
      args: { id: string; to: string; message?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return contractService.share(user.id, args.id, args.to, args.message ?? '');
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
