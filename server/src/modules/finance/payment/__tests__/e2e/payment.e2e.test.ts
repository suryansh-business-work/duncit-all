import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

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
