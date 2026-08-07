import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { legalDocumentService } from './legalDocument.service';

const LEGAL_ROLES = ['SUPER_ADMIN', 'LEGAL_MANAGER'];

export const legalDocumentResolvers = {
  Query: {
    legalDocuments: (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.list(args.filter);
    },
    legalDocumentsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.table(args.query);
    },
    legalDocument: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.getById(args.id);
    },
    legalDocumentStats: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.stats();
    },
    legalDocumentStatsTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.statsTable(args.query);
    },
    legalDocumentPdfBase64: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      const pdf = await legalDocumentService.pdf(args.id);
      return pdf.toString('base64');
    },
    legalSignatureMethods: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.signatureMethods();
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
    signLegalDocument: (_p: unknown, args: { id: string; input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.sign(user.id, args.id, args.input);
    },
    shareLegalDocument: (
      _p: unknown,
      args: { id: string; to: string; message?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.share(user.id, args.id, args.to, args.message ?? '');
    },
  },
};
