import { crmService } from './crm.service';
import { CRM_RW } from './crm.constants';
import type { GraphQLContext } from '../../context';
import { requireRole } from '../../middleware/rbac';

const RW = [...CRM_RW];

export const crmResolvers = {
  Query: {
    crmLeadConfig: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.config();
    },
    venueLeads: (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.listVenueLeads(args.filter);
    },
    venueLead: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.getVenueLead(args.id);
    },
    hostLeads: (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.listHostLeads(args.filter);
    },
    hostLead: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.getHostLead(args.id);
    },
  },
  Mutation: {
    createVenueLead: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.createVenueLead(args.input);
    },
    updateVenueLead: (_p: unknown, args: { id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.updateVenueLead(args.id, args.input);
    },
    deleteVenueLead: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.deleteVenueLead(args.id);
    },
    createHostLead: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.createHostLead(args.input);
    },
    updateHostLead: (_p: unknown, args: { id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.updateHostLead(args.id, args.input);
    },
    deleteHostLead: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.deleteHostLead(args.id);
    },
    emailVenueLeadContact: (
      _p: unknown,
      args: { id: string; contact_email: string; subject: string; body: string },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      return crmService.emailVenueLeadContact(args.id, args.contact_email, args.subject, args.body, user.id);
    },
    callVenueLeadContact: (
      _p: unknown,
      args: { id: string; contact_number: string },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      return crmService.callVenueLeadContact(args.id, args.contact_number, user.id);
    },
  },
};
