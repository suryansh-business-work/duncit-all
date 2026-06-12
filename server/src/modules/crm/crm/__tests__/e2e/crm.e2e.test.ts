import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('crm e2e', () => {
  it('forbids a normal user from reading venue leads', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(
      user.request(gql`query { venueLeads(filter: {}) { id } }`)
    ).rejects.toThrow();
  });

  it('lets a CRM manager create, read and delete an ecomm lead', async () => {
    const crm = server.client(signToken({ roles: ['CRM_MANAGER'] }));
    const created = await crm.request<{ createEcommLead: { id: string; seller_name: string } }>(
      gql`
        mutation ($input: EcommLeadInput!) {
          createEcommLead(input: $input) {
            id
            seller_name
          }
        }
      `,
      { input: { seller_name: 'Acme Sellers', brand_name: 'Acme', contacts: [{ email: 'sell@acme.com' }] } }
    );
    expect(created.createEcommLead.seller_name).toBe('Acme Sellers');
    const id = created.createEcommLead.id;

    const list = await crm.request<{ ecommLeads: { id: string }[] }>(
      gql`query { ecommLeads(filter: {}) { id seller_name } }`
    );
    expect(list.ecommLeads.map((l) => l.id)).toContain(id);

    const removed = await crm.request<{ deleteEcommLead: boolean }>(
      gql`mutation ($id: ID!) { deleteEcommLead(id: $id) }`,
      { id }
    );
    expect(removed.deleteEcommLead).toBe(true);
  });

  it('forbids a normal user from reading ecomm leads', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(gql`query { ecommLeads(filter: {}) { id } }`)).rejects.toThrow();
  });
});
