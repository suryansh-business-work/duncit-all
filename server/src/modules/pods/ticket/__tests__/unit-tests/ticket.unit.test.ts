import { signTicketToken, verifyTicketToken } from '../../ticket.token';
import { eventTicketResolvers } from '../../ticket.resolver';
import { makeContext } from '@test/harness';

const asUser = makeContext({ roles: ['USER'] });
const call = (fn: () => unknown) => (async () => fn())();

describe('ticket.token', () => {
  it('round-trips a signed payload', () => {
    const token = signTicketToken({ t: 'TKT-1', u: 'u1', p: 'p1', m: 'm1' });
    expect(verifyTicketToken(token)).toEqual({ t: 'TKT-1', u: 'u1', p: 'p1', m: 'm1' });
  });

  it('rejects tampered or malformed tokens', () => {
    const token = signTicketToken({ t: 'TKT-1', u: 'u1', p: 'p1', m: 'm1' });
    const [body] = token.split('.');
    expect(verifyTicketToken(`${body}.deadbeef`)).toBeNull();
    expect(verifyTicketToken('nodot')).toBeNull();
    expect(verifyTicketToken('')).toBeNull();
  });
});

describe('eventTicket resolver RBAC', () => {
  it('gates admin queries + mutations', async () => {
    await expect(call(() => (eventTicketResolvers.Query as any).eventTickets({}, { filter: {} }, asUser))).rejects.toThrow(/access denied/i);
    await expect(call(() => (eventTicketResolvers.Query as any).eventTicket({}, { id: 'x' }, asUser))).rejects.toThrow(/access denied/i);
    await expect(call(() => (eventTicketResolvers.Mutation as any).verifyEventTicketQr({}, { token: 't' }, asUser))).rejects.toThrow(/access denied/i);
    await expect(call(() => (eventTicketResolvers.Mutation as any).checkInEventTicket({}, { input: {} }, asUser))).rejects.toThrow(/access denied/i);
  });

  it('requires auth for viewer queries', async () => {
    const anon = makeContext(null);
    await expect(call(() => (eventTicketResolvers.Query as any).myEventTickets({}, {}, anon))).rejects.toThrow();
    await expect(call(() => (eventTicketResolvers.Query as any).myEventTicketForPod({}, { pod_doc_id: 'p' }, anon))).rejects.toThrow();
    await expect(call(() => (eventTicketResolvers.Query as any).eventTicketPdfBase64({}, { ticket_doc_id: 't' }, anon))).rejects.toThrow();
  });
});
