import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('payment e2e', () => {
  it('forbids a normal user from the admin payments list and anon from myPayments', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(gql`query { payments { id status } }`)).rejects.toThrow();

    const anon = server.client();
    await expect(anon.request(gql`query { myPayments { id } }`)).rejects.toThrow();
  });
});
