import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('host e2e', () => {
  it('exposes publicHosts without auth', async () => {
    const pub = server.client();
    const res = await pub.request<{ publicHosts: unknown[] }>(gql`query { publicHosts { id full_name } }`);
    expect(Array.isArray(res.publicHosts)).toBe(true);
  });

  it('forbids a normal user from the admin hosts list', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(gql`query { hosts { id } }`)).rejects.toThrow();
  });
});
