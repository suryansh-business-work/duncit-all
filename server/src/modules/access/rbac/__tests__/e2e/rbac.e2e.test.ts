import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const CREATE_RESOURCE = gql`
  mutation Create($input: CreateResourceInput!) {
    createResource(input: $input) {
      id
      key
    }
  }
`;

describe('rbac e2e', () => {
  it('lets a super admin create a resource and read roles', async () => {
    const admin = server.client(signToken({ roles: ['SUPER_ADMIN'] }));
    const created = await admin.request<{ createResource: { key: string } }>(CREATE_RESOURCE, {
      input: { key: 'analytics', name: 'Analytics' },
    });
    expect(created.createResource.key).toBe('analytics');

    const roles = await admin.request<{ roles: unknown[] }>(gql`query { roles { id key } }`);
    expect(Array.isArray(roles.roles)).toBe(true);
  });

  it('forbids a normal user from creating a resource', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(CREATE_RESOURCE, { input: { key: 'x', name: 'X' } })).rejects.toThrow();
  });
});
