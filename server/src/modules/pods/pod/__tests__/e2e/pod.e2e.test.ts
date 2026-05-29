import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('pod e2e', () => {
  it('lists pods publicly (empty initially)', async () => {
    const pub = server.client();
    const res = await pub.request<{ pods: unknown[] }>(gql`query { pods { id pod_title } }`);
    expect(Array.isArray(res.pods)).toBe(true);
  });

  it('forbids a non-admin from creating a pod', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(
      user.request(
        gql`
          mutation ($input: CreatePodInput!) {
            createPod(input: $input) {
              id
            }
          }
        `,
        { input: { pod_title: 'x' } }
      )
    ).rejects.toThrow();
  });
});
