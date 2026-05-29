import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('analytics e2e', () => {
  it('forbids a normal user from reading dashboard totals', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(
      user.request(gql`query { dashboardTotals { super_category_slug } }`)
    ).rejects.toThrow();
  });
});
