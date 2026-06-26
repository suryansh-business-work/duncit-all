import { Types } from 'mongoose';
import { ticketService } from '../../ticket.service';
import { ticketResolvers } from '../../ticket.resolver';
import { makeContext } from '@test/harness';

const uid = new Types.ObjectId().toString();

describe('ticket unit', () => {
  it('createTicket requires a subject', async () => {
    await expect(
      ticketService.createTicket(uid, { subject: '   ', body_text: 'hi' } as any)
    ).rejects.toThrow(/subject is required/i);
  });

  it('createTicket requires a message body', async () => {
    await expect(
      ticketService.createTicket(uid, { subject: 'Hi', body_text: '  ' } as any)
    ).rejects.toThrow(/message is required/i);
  });

  it('tickets query is gated to support roles', () => {
    expect(() =>
      (ticketResolvers.Query as any).tickets({}, {}, makeContext({ roles: ['USER'] }))
    ).toThrow(/access denied/i);
  });

  it('updateTicketStatus requires authentication', () => {
    expect(() =>
      (ticketResolvers.Mutation as any).updateTicketStatus(
        {},
        { ticket_id: 'x', status: 'CLOSED' },
        makeContext(null)
      )
    ).toThrow(/not authenticated/i);
  });

  it('resolveTicket requires authentication', () => {
    expect(() =>
      (ticketResolvers.Mutation as any).resolveTicket({}, { ticket_id: 'x' }, makeContext(null))
    ).toThrow(/not authenticated/i);
  });

  it('submitTicketFeedback requires authentication', () => {
    expect(() =>
      (ticketResolvers.Mutation as any).submitTicketFeedback(
        {},
        { ticket_id: 'x', rating: 5 },
        makeContext(null)
      )
    ).toThrow(/not authenticated/i);
  });

  it('ticketTranscript requires authentication', async () => {
    await expect(
      (ticketResolvers.Query as any).ticketTranscript({}, { ticket_id: 'x' }, makeContext(null))
    ).rejects.toThrow(/not authenticated/i);
  });

  it('emailTicketTranscript requires authentication', async () => {
    await expect(
      (ticketResolvers.Mutation as any).emailTicketTranscript(
        {},
        { ticket_id: 'x', email: 'a@b.com' },
        makeContext(null)
      )
    ).rejects.toThrow(/not authenticated/i);
  });
});
