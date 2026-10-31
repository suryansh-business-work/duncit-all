import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { marketingLeadService } from './marketingLead.service';
import { importLeads, type ImportMapping } from './marketingLead.import';
import { promoteToCrm } from './marketingLead.promote';
import type { LeadInput, MarketingLeadCrmKind, MarketingLeadStage } from './marketingLead.types';

/** The marketing console works its leads; an editor too. */
const WORK = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER', 'MARKETING_EDITOR'];
/** Handing a lead to sales is a manager's call. */
const PROMOTE = ['SUPER_ADMIN', 'MARKETING_MANAGER'];

type Ctx = GraphQLContext;

export const marketingLeadResolvers = {
  Query: {
    marketingLeadsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: Ctx) => {
      requireRole(ctx, WORK);
      return marketingLeadService.table(args.query);
    },
    marketingLead: (_p: unknown, args: { id: string }, ctx: Ctx) => {
      requireRole(ctx, WORK);
      return marketingLeadService.get(args.id);
    },
    marketingLeadSummary: (_p: unknown, _a: unknown, ctx: Ctx) => {
      requireRole(ctx, WORK);
      return marketingLeadService.summary();
    },
  },
  Mutation: {
    createMarketingLead: (_p: unknown, args: { input: LeadInput }, ctx: Ctx) => {
      const user = requireRole(ctx, WORK);
      return marketingLeadService.create(args.input, user);
    },
    updateMarketingLead: (_p: unknown, args: { id: string; input: LeadInput }, ctx: Ctx) => {
      requireRole(ctx, WORK);
      return marketingLeadService.update(args.id, args.input);
    },
    setMarketingLeadStage: (_p: unknown, args: { id: string; stage: MarketingLeadStage; note?: string | null }, ctx: Ctx) => {
      const user = requireRole(ctx, WORK);
      return marketingLeadService.setStage(args.id, args.stage, user, args.note);
    },
    assignMarketingLeadOwner: (_p: unknown, args: { id: string; owner_user_id?: string | null }, ctx: Ctx) => {
      const user = requireRole(ctx, WORK);
      return marketingLeadService.assignOwner(args.id, args.owner_user_id, user);
    },
    addMarketingLeadNote: (_p: unknown, args: { id: string; text: string }, ctx: Ctx) => {
      const user = requireRole(ctx, WORK);
      return marketingLeadService.addNote(args.id, args.text, user);
    },
    importMarketingLeads: (_p: unknown, args: { rows: string[][]; mapping: ImportMapping }, ctx: Ctx) => {
      const user = requireRole(ctx, WORK);
      return importLeads(args.rows, args.mapping, user);
    },
    promoteMarketingLeadToCrm: (_p: unknown, args: { id: string; kind: MarketingLeadCrmKind }, ctx: Ctx) => {
      const user = requireRole(ctx, PROMOTE);
      return promoteToCrm(args.id, args.kind, user);
    },
  },
};
