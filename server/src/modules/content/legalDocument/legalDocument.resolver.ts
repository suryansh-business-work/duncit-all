import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { userDisplayOf } from '@modules/access/user/user.display';
import { legalDocumentService } from './legalDocument.service';

const LEGAL_ROLES = ['SUPER_ADMIN', 'LEGAL_MANAGER'];

export const legalDocumentResolvers = {
  LegalDocument: {
    // Actor labels, resolved from the stored ids. They run only when selected,
    // and the shaper is a sync arrow the table engine reuses.
    created_by_name: async (parent: { created_by?: unknown }) =>
      parent.created_by ? (await userDisplayOf(String(parent.created_by))).name : '',
    updated_by_name: async (parent: { updated_by?: unknown }) =>
      parent.updated_by ? (await userDisplayOf(String(parent.updated_by))).name : '',
  },
  LegalDocumentVersion: {
    updated_by_name: async (parent: { updated_by?: unknown }) =>
      parent.updated_by ? (await userDisplayOf(String(parent.updated_by))).name : '',
  },
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
    setLegalDocumentActive: (
      _p: unknown,
      args: { id: string; is_active: boolean },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.setActive(user.id, args.id, args.is_active);
    },
    deleteLegalDocument: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.remove(args.id);
    },
    cloneLegalDocument: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.clone(user.id, args.id);
    },
    backfillLegalDocumentIds: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, LEGAL_ROLES);
      return legalDocumentService.backfillIds();
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
