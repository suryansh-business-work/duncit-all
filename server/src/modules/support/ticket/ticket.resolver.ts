import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole, hasRole } from '@middleware/rbac';
import { ticketService } from './ticket.service';
import type { TranscriptFormat } from '@modules/support/transcript';

const SUPPORT_ROLES = ['SUPER_ADMIN', 'SUPPORT_MANAGER', 'SUPPORT_USER'];

/** Throws NOT_FOUND unless the caller owns the ticket or is a support agent. */
async function requireTicketAccess(ctx: GraphQLContext, ticketId: string) {
  const user = requireAuth(ctx);
  const isAgent = hasRole(user, SUPPORT_ROLES);
  if (isAgent) return;
  const ticket = await ticketService.getById(ticketId);
  if (!ticket || ticket.user.id !== user.id) {
    throw new GraphQLError('Ticket not found', { extensions: { code: 'NOT_FOUND' } });
  }
}

export const ticketResolvers = {
  Query: {
    tickets: (
      _p: unknown,
      args: {
        status?: any;
        assignee_id?: string;
        search?: string;
        page?: number;
        page_size?: number;
        sort_by?: string;
        sort_dir?: string;
      },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, SUPPORT_ROLES);
      return ticketService.list({
        status: args.status,
        assigneeId: args.assignee_id,
        search: args.search,
        page: args.page,
        page_size: args.page_size,
        sort_by: args.sort_by,
        sort_dir: args.sort_dir,
      });
    },
    ticket: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const ticket = await ticketService.getById(args.id);
      if (!ticket) return null;
      // Agents see any ticket; a regular user only their own.
      if (!hasRole(user, SUPPORT_ROLES) && ticket.user.id !== user.id) {
        return null;
      }
      return ticket;
    },
    myTickets: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return ticketService.listMine(user.id);
    },
    ticketTranscript: async (
      _p: unknown,
      args: { ticket_id: string; format?: TranscriptFormat },
      ctx: GraphQLContext
    ) => {
      await requireTicketAccess(ctx, args.ticket_id);
      return ticketService.transcript(args.ticket_id, args.format ?? 'TXT');
    },
  },
  Mutation: {
    createTicket: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return ticketService.createTicket(user.id, args.input);
    },
    replyToTicket: (
      _p: unknown,
      args: { ticket_id: string; body_html?: string; body_text: string; attachments?: string[] },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      const isAgent = hasRole(user, SUPPORT_ROLES);
      return ticketService.replyToTicket(user.id, isAgent, args);
    },
    updateTicketStatus: (
      _p: unknown,
      args: { ticket_id: string; status: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, SUPPORT_ROLES);
      return ticketService.updateStatus(args.ticket_id, args.status);
    },
    updateTicketPriority: (
      _p: unknown,
      args: { ticket_id: string; priority: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, SUPPORT_ROLES);
      return ticketService.updatePriority(args.ticket_id, args.priority);
    },
    markTicketRead: async (_p: unknown, args: { ticket_id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      await requireTicketAccess(ctx, args.ticket_id);
      return ticketService.markRead(user.id, hasRole(user, SUPPORT_ROLES), args.ticket_id);
    },
    reopenTicket: (_p: unknown, args: { ticket_id: string; reason?: string | null }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const isAgent = hasRole(user, SUPPORT_ROLES);
      return ticketService.reopen(user.id, isAgent, args.ticket_id, args.reason ?? null);
    },
    resolveTicket: (_p: unknown, args: { ticket_id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      const isAgent = hasRole(user, SUPPORT_ROLES);
      return ticketService.resolve(user.id, isAgent, args.ticket_id);
    },
    submitTicketFeedback: (
      _p: unknown,
      args: { ticket_id: string; rating: number; comment?: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return ticketService.submitFeedback(user.id, args.ticket_id, {
        rating: args.rating,
        comment: args.comment,
      });
    },
    assignTicket: (
      _p: unknown,
      args: { ticket_id: string; assignee_id?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, SUPPORT_ROLES);
      return ticketService.assign(args.ticket_id, args.assignee_id ?? null);
    },
    emailTicketTranscript: async (
      _p: unknown,
      args: { ticket_id: string; email: string; format?: TranscriptFormat },
      ctx: GraphQLContext
    ) => {
      await requireTicketAccess(ctx, args.ticket_id);
      return ticketService.emailTranscript(args.ticket_id, args.email, args.format ?? 'DOCX');
    },
  },
};
