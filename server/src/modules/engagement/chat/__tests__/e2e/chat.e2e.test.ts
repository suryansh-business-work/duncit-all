import { gql } from 'graphql-request';
import { startTestServer, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('chat e2e', () => {
  it('requires authentication to read my chat rooms', async () => {
    const anon = server.client();
    await expect(anon.request(gql`query { myChatRooms { id } }`)).rejects.toThrow();
  });
});
