import { ticketService } from './ticket.service';
import type { GraphQLContext } from '@context';
import { hasRole, requireAuth, requireRole } from '@middleware/rbac';

const ADMIN_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'FINANCE_MANAGER'];

export const eventTicketResolvers = {
  Query: {
    myEventTickets: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return ticketService.listForUser(u.id);
    },
    myEventTicketForPod: (_p: unknown, args: { pod_doc_id: string }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return ticketService.forPodAndUser(args.pod_doc_id, u.id);
    },
    eventTicketPdfBase64: (_p: unknown, args: { ticket_doc_id: string }, ctx: GraphQLContext) => {
      const u = requireAuth(ctx);
      return ticketService.pdfBase64(args.ticket_doc_id, u.id, hasRole(u, ADMIN_RW));
    },
    eventTickets: (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return ticketService.listAdmin(args.filter);
    },
    eventTicket: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return ticketService.getById(args.id);
    },
  },
  Mutation: {
    verifyEventTicketQr: (_p: unknown, args: { token: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_RW);
      return ticketService.verify(args.token);
    },
    checkInEventTicket: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const u = requireRole(ctx, ADMIN_RW);
      return ticketService.checkIn(args.input, u.id);
    },
  },
};
