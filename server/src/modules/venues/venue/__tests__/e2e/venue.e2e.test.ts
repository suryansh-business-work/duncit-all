import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('venue e2e', () => {
  it('exposes publicVenues without auth (empty initially)', async () => {
    const pub = server.client();
    const res = await pub.request<{ publicVenues: unknown[] }>(gql`query { publicVenues { id venue_name } }`);
    expect(Array.isArray(res.publicVenues)).toBe(true);
  });

  it('forbids a normal user from the admin venues list', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(gql`query { venues { id } }`)).rejects.toThrow();
  });
});
