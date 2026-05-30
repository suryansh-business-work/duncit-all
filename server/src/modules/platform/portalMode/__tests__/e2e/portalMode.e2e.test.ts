import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('portalMode e2e', () => {
  it('lets anyone read a public portal mode', async () => {
    const anon = server.client();
    const res = await anon.request(gql`query { portalMode(key: "tech") { key mode } }`);
    expect(res.portalMode.mode).toBeDefined();
  });

  it('forbids a normal user from setting a portal mode', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(
      user.request(gql`mutation { setPortalMode(key: "tech", mode: MAINTENANCE) { key mode } }`)
    ).rejects.toThrow();
  });
});
