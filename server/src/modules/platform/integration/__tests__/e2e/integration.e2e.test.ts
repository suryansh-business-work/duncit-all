import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('integration e2e', () => {
  it('forbids a normal user from listing integration providers', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(
      user.request(gql`query { integrationProviders(filter: {}) { id name type } }`)
    ).rejects.toThrow();
  });
});
