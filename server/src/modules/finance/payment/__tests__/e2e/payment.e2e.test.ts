import { gql } from 'graphql-request';
import { Types } from 'mongoose';
import { startTestServer, signToken, type TestServer } from '@test/harness';
import { PaymentModel } from '../../payment.model';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('payment e2e', () => {
  it('forbids a normal user from the admin payments list and anon from myPayments', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(gql`query { payments { id status } }`)).rejects.toThrow();

    const anon = server.client();
    await expect(anon.request(gql`query { myPayments { id } }`)).rejects.toThrow();
  });

  it('serves paymentsTable: envelope, search, filter, sort and paging (finance roles only)', async () => {
    const seed = (over: Record<string, unknown>) =>
      PaymentModel.create({
        payment_id: `pay_${Math.random().toString(36).slice(2)}`,
        user_id: new Types.ObjectId(),
        user_name: 'A',
        user_email: 'a@a.com',
        subtotal: 100,
        total: 118,
        status: 'PENDING',
        ...over,
      });
    await seed({ user_name: 'Asha', status: 'SUCCESS', total: 118 });
    await seed({ user_name: 'Bela', status: 'FAILED', total: 236 });
    await seed({ user_name: 'Chitra', status: 'SUCCESS', total: 59 });

    type Page = {
      paymentsTable: { rows: { user_name: string; total: number }[]; total: number; page: number; page_size: number };
    };
    const TABLE = gql`
      query ($query: TableQueryInput) {
        paymentsTable(query: $query) {
          rows {
            user_name
            total
          }
          total
          page
          page_size
        }
      }
    `;

    // The guard matches the sibling payments query: a plain USER is forbidden.
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(TABLE)).rejects.toThrow();

    const admin = server.client(signToken({ roles: ['FINANCE_MANAGER'] }));

    // (a) plain page-1 envelope
    const all = await admin.request<Page>(TABLE);
    expect(all.paymentsTable.total).toBe(3);
    expect(all.paymentsTable.rows).toHaveLength(3);
    expect(all.paymentsTable.page).toBe(1);
    expect(all.paymentsTable.page_size).toBe(25);

    // (b) search narrows
    const searched = await admin.request<Page>(TABLE, { query: { search: 'bela' } });
    expect(searched.paymentsTable.rows.map((r) => r.user_name)).toEqual(['Bela']);
    expect(searched.paymentsTable.total).toBe(1);

    // (c) enum filter narrows
    const success = await admin.request<Page>(TABLE, {
      query: { filters: [{ field: 'status', op: 'eq', value: 'SUCCESS' }] },
    });
    expect(success.paymentsTable.total).toBe(2);

    // (d) sort_by total asc ordering
    const sorted = await admin.request<Page>(TABLE, { query: { sort_by: 'total', sort_dir: 'asc' } });
    expect(sorted.paymentsTable.rows.map((r) => r.total)).toEqual([59, 118, 236]);

    // (e) page_size=1 page=2 returns the 2nd payment; total is unaffected by paging
    const page2 = await admin.request<Page>(TABLE, {
      query: { sort_by: 'total', sort_dir: 'asc', page: 2, page_size: 1 },
    });
    expect(page2.paymentsTable.rows.map((r) => r.total)).toEqual([118]);
    expect(page2.paymentsTable.total).toBe(3);
    expect(page2.paymentsTable.page).toBe(2);
    expect(page2.paymentsTable.page_size).toBe(1);
  });

  it('lets an authenticated user reach their invoice (no longer admin-gated)', async () => {
    const missingId = '64b000000000000000000000';
    // A normal USER must now get past the role gate — a missing payment surfaces
    // "Payment not found", not "Access Denied". This is the invoice-download fix.
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(
      user.request(gql`query { paymentInvoicePdfBase64(payment_doc_id: "${missingId}") }`)
    ).rejects.toThrow(/not found/i);

    // An anonymous caller is still rejected (authentication required).
    const anon = server.client();
    await expect(
      anon.request(gql`query { paymentInvoicePdfBase64(payment_doc_id: "${missingId}") }`)
    ).rejects.toThrow(/authenticat/i);
  });
});
