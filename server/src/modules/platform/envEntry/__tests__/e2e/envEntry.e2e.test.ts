import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('envEntry e2e', () => {
  it('forbids a normal user from listing env entries', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(
      user.request(gql`query { envEntries(filter: {}) { id name category } }`)
    ).rejects.toThrow();
  });

  it('lets a tech manager create, map and read an entry end to end', async () => {
    const tech = server.client(signToken({ roles: ['TECH_MANAGER'] }));
    const created: any = await tech.request(
      gql`mutation ($i: CreateEnvEntryInput!) { createEnvEntry(input: $i) { id name category is_default secrets { key present } } }`,
      { i: { name: 'E2E IK', category: 'IMAGEKIT', config: [{ key: 'private_key', value: 'sek' }] } }
    );
    const id = created.createEnvEntry.id;
    expect(created.createEnvEntry.is_default).toBe(true);
    expect(created.createEnvEntry.secrets.find((s: any) => s.key === 'has_private_key').present).toBe(true);

    await tech.request(
      gql`mutation ($k: String!, $ids: [ID!]!) { setPortalEnvEntries(portalKey: $k, entryIds: $ids) { id } }`,
      { k: 'crm', ids: [id] }
    );
    const forPortal: any = await tech.request(
      gql`query { envEntriesForPortal(portalKey: "crm") { id name } }`
    );
    expect(forPortal.envEntriesForPortal.map((e: any) => e.id)).toContain(id);
  });
});
