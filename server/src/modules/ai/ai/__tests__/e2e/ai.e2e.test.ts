import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('ai e2e', () => {
  it('forbids a normal user from the admin AI chat', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(
      user.request(
        gql`
          mutation ($prompt: String!) {
            adminAiChat(prompt: $prompt)
          }
        `,
        { prompt: 'hello' }
      )
    ).rejects.toThrow();
  });
});
