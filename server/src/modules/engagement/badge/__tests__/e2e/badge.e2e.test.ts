import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const CREATE = gql`
  mutation Create($input: CreateBadgeInput!) {
    createBadge(input: $input) {
      id
      badge_id
    }
  }
`;

describe('badge e2e', () => {
  it('lets an admin create a badge listed publicly', async () => {
    const admin = server.client(signToken({ roles: ['CITY_ADMIN'] }));
    const created = await admin.request<{ createBadge: { badge_id: string } }>(CREATE, {
      input: { title: 'Explorer', condition_type: 'POD_JOIN_COUNT', threshold: 3 },
    });
    expect(created.createBadge.badge_id).toMatch(/^explorer/);

    const pub = server.client();
    const list = await pub.request<{ badges: unknown[] }>(gql`query { badges { id title } }`);
    expect(list.badges).toHaveLength(1);
  });

  it('forbids a non-admin from creating a badge', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(CREATE, { input: { title: 'X', condition_type: 'MANUAL' } })).rejects.toThrow();
  });
});
