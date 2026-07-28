import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const CREATE_ROLE = gql`
  mutation Create($input: CreateRoleInput!) {
    createRole(input: $input) {
      id
      key
    }
  }
`;

describe('rbac e2e', () => {
  it('lets a super admin create a role and read roles', async () => {
    const admin = server.client(signToken({ roles: ['SUPER_ADMIN'] }));
    const created = await admin.request<{ createRole: { key: string } }>(CREATE_ROLE, {
      input: { key: 'ANALYTICS_MANAGER', name: 'Analytics Manager' },
    });
    expect(created.createRole.key).toBe('ANALYTICS_MANAGER');

    const roles = await admin.request<{ roles: unknown[] }>(gql`query { roles { id key } }`);
    expect(Array.isArray(roles.roles)).toBe(true);
  });

  it('forbids a normal user from creating a role', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(CREATE_ROLE, { input: { key: 'X', name: 'X' } })).rejects.toThrow();
  });
});
