import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('notification e2e', () => {
  it('requires auth for myNotifications and admin for the full list', async () => {
    const anon = server.client();
    await expect(anon.request(gql`query { myNotifications { id } }`)).rejects.toThrow();

    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(gql`query { notifications { id } }`)).rejects.toThrow();
  });
});
