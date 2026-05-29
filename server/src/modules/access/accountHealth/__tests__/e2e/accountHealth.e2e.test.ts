import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('accountHealth e2e', () => {
  it('requires authentication for myAccountHealth', async () => {
    const anon = server.client();
    await expect(
      anon.request(gql`query { myAccountHealth { total_score band } }`)
    ).rejects.toThrow();
  });

  it('forbids a normal user from reading another user’s health', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(
      user.request(
        gql`
          query ($id: ID!) {
            userAccountHealth(user_id: $id) {
              total_score
            }
          }
        `,
        { id: '000000000000000000000000' }
      )
    ).rejects.toThrow();
  });
});
