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
    await expect(user.request(gql`query { tickets { id } }`)).rejects.toThrow();
  });
});
