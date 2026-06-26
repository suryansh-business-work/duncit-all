const sendHtmlEmailMock = jest.fn().mockResolvedValue({ messageId: 'test' });
jest.mock('@services/email/email.service', () => ({
  sendHtmlEmail: (...args: unknown[]) => sendHtmlEmailMock(...args),
}));

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

  it('re-opens a resolved/closed ticket when the user replies (Bug 3)', async () => {
    const t = await ticketService.createTicket(userId, { subject: 'S', body_text: 'B' });
    await ticketService.updateStatus(t.id, 'RESOLVED');

    const afterUser = await ticketService.replyToTicket(userId, false, {
      ticket_id: t.id,
      body_text: 'It is still broken',
    });
    expect(afterUser.status).toBe('OPEN');
  });

  it('lets the owner reopen a closed ticket but forbids another user', async () => {
    const t = await ticketService.createTicket(userId, { subject: 'S', body_text: 'B' });
    await ticketService.updateStatus(t.id, 'CLOSED');

    const reopened = await ticketService.reopen(userId, false, t.id);
    expect(reopened.status).toBe('OPEN');

    await ticketService.updateStatus(t.id, 'CLOSED');
    await expect(
      ticketService.reopen(new Types.ObjectId().toString(), false, t.id)
    ).rejects.toThrow(/another user/i);

    // An agent may reopen any ticket.
    const byAgent = await ticketService.reopen(new Types.ObjectId().toString(), true, t.id);
    expect(byAgent.status).toBe('OPEN');
  });

  it('captures the reopen reason and exposes the reopen deadline within the window', async () => {
    const t = await ticketService.createTicket(userId, { subject: 'S', body_text: 'B' });
    const resolved = await ticketService.updateStatus(t.id, 'RESOLVED');
    expect(resolved.resolved_at).toBeTruthy();
    expect(resolved.reopen_deadline).toBeTruthy();

    const reopened = await ticketService.reopen(userId, false, t.id, 'Issue persists');
    expect(reopened.status).toBe('OPEN');
    expect(reopened.resolved_at).toBeNull();
    expect(reopened.messages.some((m) => m.body_text.includes('Issue persists'))).toBe(true);
  });

  it('blocks a user reopen / reply after the 3-day window, but an agent can still reopen', async () => {
    const t = await ticketService.createTicket(userId, { subject: 'S', body_text: 'B' });
    await ticketService.updateStatus(t.id, 'RESOLVED');
    // Backdate the resolution to 4 days ago — past the 3-day reopen window.
    await TicketModel.updateOne({ _id: t.id }, { $set: { resolved_at: new Date(Date.now() - 4 * 86_400_000) } });

    await expect(ticketService.reopen(userId, false, t.id, 'still broken')).rejects.toThrow(/window/i);
    await expect(
      ticketService.replyToTicket(userId, false, { ticket_id: t.id, body_text: 'hi' })
    ).rejects.toThrow(/window/i);
    const byAgent = await ticketService.reopen(new Types.ObjectId().toString(), true, t.id);
    expect(byAgent.status).toBe('OPEN');
  });
});

describe('ticket resolve (B7)', () => {
  it('lets the owner resolve a ticket and appends a SYSTEM timeline bubble', async () => {
    const t = await ticketService.createTicket(userId, { subject: 'S', body_text: 'B' });
    const resolved = await ticketService.resolve(userId, false, t.id);
    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.resolved_at).toBeTruthy();
    const sys = resolved.messages.filter((m) => m.author_role === 'SYSTEM');
    expect(sys).toHaveLength(1);
    expect(sys[0].body_text).toMatch(/marked resolved by/i);
  });

  it('lets an agent resolve any ticket but forbids another user', async () => {
    const t = await ticketService.createTicket(userId, { subject: 'S', body_text: 'B' });
    await expect(
      ticketService.resolve(new Types.ObjectId().toString(), false, t.id)
    ).rejects.toThrow(/another user/i);

    const byAgent = await ticketService.resolve(new Types.ObjectId().toString(), true, t.id);
    expect(byAgent.status).toBe('RESOLVED');
  });

  it('throws on a bad id / missing ticket', async () => {
    await expect(ticketService.resolve(userId, true, 'not-an-id')).rejects.toThrow(/invalid ticket_id/i);
    await expect(
      ticketService.resolve(userId, true, new Types.ObjectId().toString())
    ).rejects.toThrow(/not found/i);
  });
});

describe('ticket feedback (B8)', () => {
  it('stores feedback on a resolved ticket and enforces every guard', async () => {
    const t = await ticketService.createTicket(userId, { subject: 'S', body_text: 'B' });

    // bad rating rejected first.
    await expect(
      ticketService.submitFeedback(userId, t.id, { rating: 9 })
    ).rejects.toThrow(/1-5/);
    // blocked while still OPEN.
    await expect(
      ticketService.submitFeedback(userId, t.id, { rating: 4 })
    ).rejects.toThrow(/resolved before feedback/i);
    // another user can never leave feedback.
    await expect(
      ticketService.submitFeedback(new Types.ObjectId().toString(), t.id, { rating: 4 })
    ).rejects.toThrow(/not your ticket/i);

    await ticketService.resolve(userId, false, t.id);
    const fed = await ticketService.submitFeedback(userId, t.id, { rating: 5, comment: 'super' });
    expect(fed.rating).toBe(5);
    expect(fed.feedback_comment).toBe('super');
    expect(fed.feedback_at).toBeTruthy();

    // one-time.
    await expect(
      ticketService.submitFeedback(userId, t.id, { rating: 2 })
    ).rejects.toThrow(/already submitted/i);
  });

  it('accepts feedback on a CLOSED ticket and rejects bad ids / missing tickets', async () => {
    const t = await ticketService.createTicket(userId, { subject: 'S', body_text: 'B' });
    await ticketService.updateStatus(t.id, 'CLOSED');
    const fed = await ticketService.submitFeedback(userId, t.id, { rating: 3 });
    expect(fed.rating).toBe(3);
    expect(fed.feedback_comment).toBeNull();

    await expect(ticketService.submitFeedback(userId, 'not-an-id', { rating: 3 })).rejects.toThrow(
      /invalid ticket_id/i
    );
    await expect(
      ticketService.submitFeedback(userId, new Types.ObjectId().toString(), { rating: 3 })
    ).rejects.toThrow(/not found/i);
  });
});

describe('ticket transcript (B15)', () => {
  it('builds a plain-text transcript with the ST ticket number and subject', async () => {
    const t = await ticketService.createTicket(userId, {
      subject: 'Refund stuck',
      body_text: 'Money deducted',
    });
    const tr = await ticketService.transcript(t.id);
    expect(tr.filename).toMatch(/^support-ST-[0-9A-F]{6}\.txt$/);
    expect(tr.text).toContain('Refund stuck');
    expect(tr.text).toContain('Money deducted');
    expect(Buffer.from(tr.content_base64, 'base64').toString('utf8')).toBe(tr.text);
  });

  it('builds a .docx transcript (zip package) and includes SYSTEM lines', async () => {
    const t = await ticketService.createTicket(userId, { subject: 'Doc me', body_text: 'hi' });
    await ticketService.resolve(userId, false, t.id);

    const tr = await ticketService.transcript(t.id, 'DOCX');
    expect(tr.filename).toMatch(/\.docx$/);
    expect(tr.text).toMatch(/System: Ticket marked resolved by/i);
    const bytes = Buffer.from(tr.content_base64, 'base64');
    expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');
  });

  it('emails a .docx transcript by default and rejects an invalid address', async () => {
    const t = await ticketService.createTicket(userId, { subject: 'Mail me', body_text: 'hi' });
    const ok = await ticketService.emailTranscript(t.id, 'me@example.com');
    expect(ok).toBe(true);
    const arg = sendHtmlEmailMock.mock.calls.at(-1)![0];
    expect(arg.to).toBe('me@example.com');
    expect(arg.attachments[0].filename).toMatch(/^support-ST-[0-9A-F]{6}\.docx$/);
    expect(Buffer.isBuffer(arg.attachments[0].content)).toBe(true);

    await expect(ticketService.emailTranscript(t.id, 'nope')).rejects.toThrow(/valid email/i);
  });

  it('emails a .txt transcript when TXT is requested', async () => {
    const t = await ticketService.createTicket(userId, { subject: 'Txt me', body_text: 'hi' });
    await ticketService.emailTranscript(t.id, 'me@example.com', 'TXT');
    const arg = sendHtmlEmailMock.mock.calls.at(-1)![0];
    expect(arg.attachments[0].filename).toMatch(/\.txt$/);
  });

  it('throws on a bad id / missing ticket when building a transcript', async () => {
    await expect(ticketService.transcript('not-an-id')).rejects.toThrow(/invalid ticket_id/i);
    await expect(
      ticketService.transcript(new Types.ObjectId().toString())
    ).rejects.toThrow(/not found/i);
  });
});
