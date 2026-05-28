import type { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/rbac';
import { legalDocumentService } from './legalDocument.service';

const LEGAL_ROLES = ['SUPER_ADMIN', 'LEGAL_MANAGER'];

export const legalDocumentResolvers = {
  Query: {
    legalDocuments: (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.list(args.filter);
    },
    legalDocument: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.getById(args.id);
    },
    legalDocumentStats: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.stats();
    },
  },
  Mutation: {
    createLegalDocument: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.create(user.id, args.input);
    },
    updateLegalDocument: (_p: unknown, args: { id: string; input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.update(user.id, args.id, args.input);
    },
    deleteLegalDocument: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.remove(args.id);
    },
    cloneLegalDocument: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.clone(user.id, args.id);
    },
  },
};
