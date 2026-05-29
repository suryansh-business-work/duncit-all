import { gql } from 'graphql-request';
import { startTestServer, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('upload e2e', () => {
  it('requires authentication for ImageKit auth params', async () => {
    const anon = server.client();
    await expect(
      anon.request(gql`query { getImagekitAuth { token signature expire } }`)
    ).rejects.toThrow();
  });
});
