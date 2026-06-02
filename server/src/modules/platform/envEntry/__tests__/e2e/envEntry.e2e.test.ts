import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';
import { ENV_CATEGORIES } from '../../envEntry.model';

let server: TestServer;
let tech: ReturnType<TestServer['client']>;

beforeAll(async () => {
  server = await startTestServer();
  tech = server.client(signToken({ roles: ['TECH_MANAGER'] }));
});
afterAll(async () => {
  await server.stop();
});

const CREATE = gql`
  mutation ($i: CreateEnvEntryInput!) {
    createEnvEntry(input: $i) {
      id name category is_default is_active
      config { key value }
      secrets { key present }
    }
  }
`;

describe('envEntry e2e — access control', () => {
  it('forbids a normal user from listing or mutating entries', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(gql`query { envEntries(filter: {}) { id } }`)).rejects.toThrow();
    await expect(
      user.request(CREATE, { i: { name: 'x', category: 'EMAIL' } })
    ).rejects.toThrow();
  });

  it('exposes the category catalogue (with doc links + field hints) to a tech manager', async () => {
    const res: any = await tech.request(
      gql`query { envCategories { category label docUrl fields { name secret phone hint } } }`
    );
    const cats = res.envCategories.map((c: any) => c.category).sort();
    expect(cats).toEqual([...ENV_CATEGORIES].sort());
    const openai = res.envCategories.find((c: any) => c.category === 'OPENAI');
    expect(openai.docUrl).toMatch(/^https?:\/\//);
    expect(openai.fields.find((f: any) => f.name === 'api_key').hint).toContain('sk-');
    const twilio = res.envCategories.find((c: any) => c.category === 'TWILIO');
    expect(twilio.fields.find((f: any) => f.name === 'phone_number').phone).toBe(true);
  });
});

describe('envEntry e2e — every category is accepted by the schema', () => {
  // This guards the SDL `enum EnvCategory` against the code's ENV_CATEGORIES:
  // a drift (e.g. schema still says GOOGLE while code says GOOGLE_MAPS) makes
  // createEnvEntry reject the value with BAD_USER_INPUT and fails this test.
  it.each([...ENV_CATEGORIES])('creates a %s entry over HTTP', async (category) => {
    const res: any = await tech.request(CREATE, {
      i: { name: `E2E ${category}`, category, config: [{ key: 'api_key', value: 'k' }] },
    });
    expect(res.createEnvEntry.category).toBe(category);
    expect(res.createEnvEntry.is_default).toBe(true); // first in category
  });
});

describe('envEntry e2e — lifecycle', () => {
  const idOf = (r: any) => r.createEnvEntry.id;

  it('runs the full CRUD + default + mapping flow', async () => {
    // Create two ImageKit entries.
    const a = idOf(await tech.request(CREATE, { i: { name: 'IK A', category: 'IMAGEKIT', config: [{ key: 'private_key', value: 'sa' }] } }));
    const b = idOf(await tech.request(CREATE, { i: { name: 'IK B', category: 'IMAGEKIT', config: [{ key: 'private_key', value: 'sb' }] } }));

    // Secrets are returned now — the Tech portal reveals them behind an eye toggle.
    const list: any = await tech.request(gql`query { envEntries(filter: { category: IMAGEKIT }) { id name is_default secrets { key present } config { key value } } }`);
    expect(list.envEntries).toHaveLength(2);
    const privateKey = list.envEntries[0].config.find((c: any) => c.key === 'private_key');
    expect(privateKey?.value).toBe('sa');
    expect(list.envEntries[0].secrets.find((s: any) => s.key === 'has_private_key')?.present).toBe(true);

    // Switch the default to B.
    await tech.request(gql`mutation ($id: ID!) { setDefaultEnvEntry(id: $id) { id is_default } }`, { id: b });
    const after: any = await tech.request(gql`query { envEntries(filter: { category: IMAGEKIT }) { id is_default } }`);
    expect(after.envEntries.find((e: any) => e.id === a).is_default).toBe(false);
    expect(after.envEntries.find((e: any) => e.id === b).is_default).toBe(true);

    // Update + assign to a portal.
    await tech.request(gql`mutation ($id: ID!, $i: UpdateEnvEntryInput!) { updateEnvEntry(id: $id, input: $i) { id description } }`, {
      id: a,
      i: { description: 'primary imagekit' },
    });
    await tech.request(gql`mutation ($k: String!, $ids: [ID!]!) { setPortalEnvEntries(portalKey: $k, entryIds: $ids) { id } }`, {
      k: 'crm',
      ids: [a],
    });
    const forPortal: any = await tech.request(gql`query { envEntriesForPortal(portalKey: "crm") { id } }`);
    expect(forPortal.envEntriesForPortal.map((e: any) => e.id)).toEqual([a]);

    // Delete A → B remains the (only) default.
    const del: any = await tech.request(gql`mutation ($id: ID!) { deleteEnvEntry(id: $id) }`, { id: a });
    expect(del.deleteEnvEntry).toBe(true);
    const remaining: any = await tech.request(gql`query { envEntries(filter: { category: IMAGEKIT }) { id } }`);
    expect(remaining.envEntries.map((e: any) => e.id)).toEqual([b]);
  });

  it('runs the credential quick-test mutation (mismatched key fails fast)', async () => {
    const id = idOf(await tech.request(CREATE, { i: { name: 'PX', category: 'PEXELS', config: [] } }));
    const res: any = await tech.request(gql`mutation ($id: ID!) { testEnvEntry(id: $id) { ok message } }`, { id });
    expect(res.testEnvEntry.ok).toBe(false); // no api_key configured
  });
});
