import { gql } from 'graphql-request';
import { Types } from 'mongoose';
import { startTestServer, adminToken, signToken, type TestServer } from '@test/harness';
import { TicketModel } from '../../ticket.model';
import { signTicketToken } from '../../ticket.token';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const seedTicket = (over: Record<string, any> = {}) => {
  const code = over.ticket_code ?? `TKT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const membership_id = new Types.ObjectId();
  const pod_id = over.pod_id ?? new Types.ObjectId();
  const user_id = new Types.ObjectId();
  return TicketModel.create({
    ticket_code: code,
    membership_id,
    pod_id,
    user_id,
    status: over.status ?? 'VALID',
    qr_token: signTicketToken({
      t: code,
      u: String(user_id),
      p: String(pod_id),
      m: String(membership_id),
    }),
    snapshot: {
      pod_title: 'E2E Event',
      pod_mode: 'PHYSICAL',
      user_name: 'Guest',
      user_email: 'guest@example.com',
      ...(over.snapshot ?? {}),
    },
  });
};

describe('event ticket e2e', () => {
  it('serves eventTicketsTable to admins: envelope, search, filter and paging', async () => {
    await seedTicket({
      ticket_code: 'TKT-AAA11',
      snapshot: { pod_title: 'Jazz Night', user_name: 'Asha Rao' },
    });
    await seedTicket({
      ticket_code: 'TKT-BBB22',
      status: 'CHECKED_IN',
      snapshot: { pod_title: 'Poetry Slam', user_name: 'Bela Sen' },
    });

    type Page = {
      eventTicketsTable: {
        rows: { ticket_code: string; status: string }[];
        total: number;
        page: number;
        page_size: number;
      };
    };
    const TABLE = gql`
      query ($query: TableQueryInput) {
        eventTicketsTable(query: $query) {
          rows {
            ticket_code
            status
          }
          total
          page
          page_size
        }
      }
    `;
    const admin = server.client(adminToken());

    // (a) plain page-1 envelope
    const all = await admin.request<Page>(TABLE);
    expect(all.eventTicketsTable.total).toBe(2);
    expect(all.eventTicketsTable.rows).toHaveLength(2);
    expect(all.eventTicketsTable.page).toBe(1);
    expect(all.eventTicketsTable.page_size).toBe(25);

    // (b) search narrows (attendee name)
    const searched = await admin.request<Page>(TABLE, { query: { search: 'asha' } });
    expect(searched.eventTicketsTable.rows.map((r) => r.ticket_code)).toEqual(['TKT-AAA11']);
    expect(searched.eventTicketsTable.total).toBe(1);

    // (c) status filter narrows
    const checkedIn = await admin.request<Page>(TABLE, {
      query: { filters: [{ field: 'status', op: 'eq', value: 'CHECKED_IN' }] },
    });
    expect(checkedIn.eventTicketsTable.rows.map((r) => r.ticket_code)).toEqual(['TKT-BBB22']);

    // (d) sort + paging: page 2 of size 1; total unaffected
    const page2 = await admin.request<Page>(TABLE, {
      query: { sort_by: 'ticket_code', sort_dir: 'asc', page: 2, page_size: 1 },
    });
    expect(page2.eventTicketsTable.rows.map((r) => r.ticket_code)).toEqual(['TKT-BBB22']);
    expect(page2.eventTicketsTable.total).toBe(2);
    expect(page2.eventTicketsTable.page).toBe(2);
    expect(page2.eventTicketsTable.page_size).toBe(1);
  });

  it('forbids non-admins from eventTicketsTable (same guard as eventTickets)', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(
      user.request(gql`
        query {
          eventTicketsTable {
            total
          }
        }
      `)
    ).rejects.toThrow();
  });
});
