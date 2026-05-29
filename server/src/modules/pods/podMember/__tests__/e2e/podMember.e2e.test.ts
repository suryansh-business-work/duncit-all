import { gql } from 'graphql-request';
import { startTestServer, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('podMember e2e', () => {
  it('requires authentication to join a free pod', async () => {
    const anon = server.client();
    await expect(
      anon.request(
        gql`
          mutation ($pod_doc_id: ID!) {
            joinFreePod(pod_doc_id: $pod_doc_id) {
              id
              status
            }
          }
        `,
        { pod_doc_id: '000000000000000000000000' }
      )
    ).rejects.toThrow();
  });
});
