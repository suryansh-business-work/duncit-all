import { gql } from 'graphql-request';
import { Types } from 'mongoose';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const CREATE = gql`
  mutation Create($input: CreateTicketInput!) {
    createTicket(input: $input) {
      id
      subject
      status
      message_count
    }
  }
`;
const MY = gql`
  query {
    myTickets {
      id
      subject
    }
  }
`;
const SET_STATUS = gql`
  mutation Status($id: ID!, $status: TicketStatus!) {
    updateTicketStatus(ticket_id: $id, status: $status) {
      id
      status
    }
  }
`;

describe('ticket e2e', () => {
  it('lets a user raise and see a ticket, and an agent resolve it', async () => {
    const userId = new Types.ObjectId().toString();
    const user = server.client(signToken({ id: userId, roles: ['USER'] }));

    const created = await user.request<{ createTicket: { id: string; status: string; message_count: number } }>(
      CREATE,
      { input: { subject: 'Payment stuck', body_text: 'Money deducted, no pod' } }
    );
    expect(created.createTicket.status).toBe('OPEN');
    expect(created.createTicket.message_count).toBe(1);

    const mine = await user.request<{ myTickets: Array<{ id: string }> }>(MY);
    expect(mine.myTickets).toHaveLength(1);

    const agent = server.client(signToken({ roles: ['SUPPORT_MANAGER'] }));
    const resolved = await agent.request<{ updateTicketStatus: { status: string } }>(SET_STATUS, {
      id: created.createTicket.id,
      status: 'RESOLVED',
    });
    expect(resolved.updateTicketStatus.status).toBe('RESOLVED');
  });

  it('rejects createTicket without authentication', async () => {
    const anon = server.client();
    await expect(
      anon.request(CREATE, { input: { subject: 'x', body_text: 'y' } })
    ).rejects.toThrow();
  });

  it('forbids a non-agent from listing all tickets', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(gql`query { tickets { total } }`)).rejects.toThrow();
  });

  it('lets the owner resolve, then leave one-time feedback (B7 + B8)', async () => {
    const userId = new Types.ObjectId().toString();
    const user = server.client(signToken({ id: userId, roles: ['USER'] }));
    const created = await user.request<{ createTicket: { id: string } }>(CREATE, {
      input: { subject: 'Resolve me', body_text: 'please' },
    });
    const id = created.createTicket.id;

    const resolved = await user.request<{ resolveTicket: { status: string; messages: Array<{ author_role: string }> } }>(
      gql`mutation ($id: ID!) { resolveTicket(ticket_id: $id) { status messages { author_role } } }`,
      { id }
    );
    expect(resolved.resolveTicket.status).toBe('RESOLVED');
    expect(resolved.resolveTicket.messages.some((m) => m.author_role === 'SYSTEM')).toBe(true);

    const fed = await user.request<{ submitTicketFeedback: { rating: number; feedback_comment: string } }>(
      gql`mutation ($id: ID!) { submitTicketFeedback(ticket_id: $id, rating: 5, comment: "ok") { rating feedback_comment } }`,
      { id }
    );
    expect(fed.submitTicketFeedback.rating).toBe(5);

    await expect(
      user.request(gql`mutation ($id: ID!) { submitTicketFeedback(ticket_id: $id, rating: 2) { rating } }`, { id })
    ).rejects.toThrow(/already submitted/i);
  });

  it('returns a ticket transcript to the owner but hides it from a stranger', async () => {
    const userId = new Types.ObjectId().toString();
    const user = server.client(signToken({ id: userId, roles: ['USER'] }));
    const created = await user.request<{ createTicket: { id: string } }>(CREATE, {
      input: { subject: 'Export me', body_text: 'hello transcript' },
    });
    const id = created.createTicket.id;

    const tr = await user.request<{ ticketTranscript: { filename: string; text: string } }>(
      gql`query ($id: ID!) { ticketTranscript(ticket_id: $id, format: TXT) { filename text } }`,
      { id }
    );
    expect(tr.ticketTranscript.filename).toMatch(/^support-ST-[0-9A-F]{6}\.txt$/);
    expect(tr.ticketTranscript.text).toContain('hello transcript');

    const stranger = server.client(signToken({ roles: ['USER'] }));
    await expect(
      stranger.request(gql`query ($id: ID!) { ticketTranscript(ticket_id: $id) { filename } }`, { id })
    ).rejects.toThrow(/not found/i);
  });
});
