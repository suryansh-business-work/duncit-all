import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

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
  mutation ($input: CreateCommsProviderInput!) {
    createCommsProvider(input: $input) {
      id name type is_default config { host has_password }
    }
  }
`;

describe('commsProvider e2e', () => {
  it('forbids a normal user from listing communication providers', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(gql`query { commsProviders(filter: {}) { id name type } }`)).rejects.toThrow();
  });

  it('creates an SMTP provider, masks its password and reads it back', async () => {
    const created: any = await tech.request(CREATE, {
      input: { name: 'Sales SMTP', type: 'SMTP', is_default: true, config: { host: 'smtp.test', port: 587, password: 'secret' } },
    });
    expect(created.createCommsProvider.config.host).toBe('smtp.test');
    expect(created.createCommsProvider.config.has_password).toBe(true);

    const list: any = await tech.request(gql`query { commsProviders(filter: { type: SMTP }) { id name is_default } }`);
    expect(list.commsProviders).toHaveLength(1);
  });

  it('keeps a single default, updates and deletes a provider', async () => {
    const a: any = await tech.request(CREATE, { input: { name: 'A', type: 'SMTP', is_default: true, config: { host: 'a' } } });
    const b: any = await tech.request(CREATE, { input: { name: 'B', type: 'SMTP', config: { host: 'b' } } });
    const idA = a.createCommsProvider.id;
    const idB = b.createCommsProvider.id;

    await tech.request(gql`mutation ($id: ID!) { setDefaultCommsProvider(id: $id) { id is_default } }`, { id: idB });
    const list: any = await tech.request(gql`query { commsProviders(filter: { type: SMTP }) { id is_default } }`);
    expect(list.commsProviders.find((p: any) => p.id === idA).is_default).toBe(false);
    expect(list.commsProviders.find((p: any) => p.id === idB).is_default).toBe(true);

    const updated: any = await tech.request(
      gql`mutation ($id: ID!, $input: UpdateCommsProviderInput!) { updateCommsProvider(id: $id, input: $input) { id description } }`,
      { id: idA, input: { description: 'primary' } }
    );
    expect(updated.updateCommsProvider.description).toBe('primary');

    const del: any = await tech.request(gql`mutation ($id: ID!) { deleteCommsProvider(id: $id) }`, { id: idA });
    expect(del.deleteCommsProvider).toBe(true);
  });

  it('queues a test send for an existing provider', async () => {
    const p: any = await tech.request(CREATE, { input: { name: 'T', type: 'SMTP', config: { host: 'h' } } });
    const res: any = await tech.request(
      gql`mutation ($id: ID!, $r: String!) { testCommsProvider(id: $id, recipient: $r) { ok message } }`,
      { id: p.createCommsProvider.id, r: 'dest@example.com' }
    );
    expect(res.testCommsProvider.ok).toBe(true);
    expect(res.testCommsProvider.message).toMatch(/dest@example.com/);
  });
});
