import { Types } from 'mongoose';
import { ticketService } from '../../ticket.service';
import { TicketModel } from '../../ticket.model';

const userId = new Types.ObjectId().toString();

describe('ticketService integration', () => {
  it('creates a ticket with an initial message', async () => {
    const t = await ticketService.createTicket(userId, {
      subject: 'Need help',
      body_text: 'My booking failed',
      category: 'PAYMENT',
    });
    expect(t.subject).toBe('Need help');
    expect(t.status).toBe('OPEN');
    expect(t.category).toBe('PAYMENT');
    expect(t.message_count).toBe(1);
  });

  it('moves OPEN -> PENDING on agent reply and back to OPEN on user reply', async () => {
    const t = await ticketService.createTicket(userId, { subject: 'S', body_text: 'B' });
    const agentId = new Types.ObjectId().toString();

    const afterAgent = await ticketService.replyToTicket(agentId, true, {
      ticket_id: t.id,
      body_text: 'Looking into it',
    });
    expect(afterAgent.status).toBe('PENDING');
    expect(afterAgent.message_count).toBe(2);

    const afterUser = await ticketService.replyToTicket(userId, false, {
      ticket_id: t.id,
      body_text: 'Thanks',
    });
    expect(afterUser.status).toBe('OPEN');
  });

  it('forbids a user replying to another user’s ticket', async () => {
    const t = await ticketService.createTicket(userId, { subject: 'S', body_text: 'B' });
    await expect(
      ticketService.replyToTicket(new Types.ObjectId().toString(), false, {
        ticket_id: t.id,
        body_text: 'intruder',
      })
    ).rejects.toThrow(/another user/i);
  });

  it('updates status and assigns an agent', async () => {
    const t = await ticketService.createTicket(userId, { subject: 'S', body_text: 'B' });
    const resolved = await ticketService.updateStatus(t.id, 'RESOLVED');
    expect(resolved.status).toBe('RESOLVED');

    const agentId = new Types.ObjectId().toString();
    const assigned = await ticketService.assign(t.id, agentId);
    expect(assigned.assignee_id).toBe(agentId);
  });

  it('lists my tickets and filters by status', async () => {
    await ticketService.createTicket(userId, { subject: 'Mine', body_text: 'B' });
    await ticketService.createTicket(new Types.ObjectId().toString(), { subject: 'Other', body_text: 'B' });

    const mine = await ticketService.listMine(userId);
    expect(mine).toHaveLength(1);
    expect(mine[0].subject).toBe('Mine');

    const open = await ticketService.list({ status: 'OPEN' });
    expect(open).toHaveLength(2);
    expect(await TicketModel.countDocuments()).toBe(2);
  });

  it('throws NOT_FOUND when updating a missing ticket', async () => {
    await expect(
      ticketService.updateStatus(new Types.ObjectId().toString(), 'CLOSED')
    ).rejects.toThrow(/not found/i);
  });
});
