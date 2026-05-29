import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('commsProvider e2e', () => {
  it('forbids a normal user from listing communication providers', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(
      user.request(gql`query { commsProviders(filter: {}) { id name type } }`)
    ).rejects.toThrow();
  });
});
