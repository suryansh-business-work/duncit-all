import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('finance e2e', () => {
  it('forbids a normal user from reading payment release requests', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(
      user.request(gql`query { paymentReleaseRequests { id status } }`)
    ).rejects.toThrow();
  });
});
