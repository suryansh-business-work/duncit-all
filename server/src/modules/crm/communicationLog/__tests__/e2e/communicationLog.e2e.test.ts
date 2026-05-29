import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('communicationLog e2e', () => {
  it('forbids a normal user from reading communication logs', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(
      user.request(gql`query { communicationLogs(filter: {}, page: {}) { total items { id } } }`)
    ).rejects.toThrow();
  });
});
