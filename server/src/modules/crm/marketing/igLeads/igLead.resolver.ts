import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { igLeadService } from './igLead.service';
import type { StartSearchInput } from './igLead.search';
import type { IgLeadSettingsInput } from './igLead.outreach';
import type { IgLeadStatus } from './igLead.types';

/** Same gate as the rest of the marketing console. */
const ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER'];

type Ctx = GraphQLContext;

export const igLeadResolvers = {
  Query: {
    igLeadsTable: (_p: unknown, args: { query?: TableQueryInput | null; due?: boolean | null }, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return igLeadService.table(args.query, args.due);
    },
    igLeadSearches: (_p: unknown, _a: unknown, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return igLeadService.searches();
    },
    igLeadSettings: (_p: unknown, _a: unknown, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return igLeadService.settings();
    },
  },
  Mutation: {
    startIgLeadSearch: (_p: unknown, args: { input: StartSearchInput }, ctx: Ctx) => {
      const user = requireRole(ctx, ROLES);
      return igLeadService.start(args.input, user.id);
    },
    draftIgLeadMessage: (_p: unknown, args: { id: string }, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return igLeadService.draft(args.id);
    },
    markIgLeadSent: (_p: unknown, args: { id: string; text: string }, ctx: Ctx) => {
      const user = requireRole(ctx, ROLES);
      return igLeadService.markSent(args.id, args.text, user.id);
    },
    setIgLeadStatus: (_p: unknown, args: { id: string; status: IgLeadStatus }, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return igLeadService.setStatus(args.id, args.status);
    },
    deleteIgLead: (_p: unknown, args: { id: string }, ctx: Ctx) => {
      requireRole(ctx, ROLES);
      return igLeadService.remove(args.id);
    },
    updateIgLeadSettings: (_p: unknown, args: { input: IgLeadSettingsInput }, ctx: Ctx) => {
      const user = requireRole(ctx, ROLES);
      return igLeadService.saveSettings(args.input, user.id);
    },
  },
};
