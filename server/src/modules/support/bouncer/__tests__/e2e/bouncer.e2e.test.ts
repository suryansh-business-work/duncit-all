import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const TARGET = gql`
  query {
    bouncerSupportTarget {
      phone
      available
    }
  }
`;
const ALERTS = gql`
  query {
    bouncerSosAlerts {
      id
      status
    }
  }
`;

describe('bouncer e2e', () => {
  it('returns the support target for an authenticated user', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    const res = await user.request<{ bouncerSupportTarget: { available: boolean } }>(TARGET);
    expect(typeof res.bouncerSupportTarget.available).toBe('boolean');
  });

  it('lets a support agent read SOS alerts but forbids a regular user', async () => {
    const agent = server.client(signToken({ roles: ['SUPPORT_MANAGER'] }));
    const res = await agent.request<{ bouncerSosAlerts: unknown[] }>(ALERTS);
    expect(Array.isArray(res.bouncerSosAlerts)).toBe(true);

    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(ALERTS)).rejects.toThrow();
  });

  it('rejects raising an SOS without authentication', async () => {
    const anon = server.client();
    await expect(
      anon.request(
        gql`
          mutation Raise($input: RaiseSosInput!) {
            raiseBouncerSos(input: $input) {
              id
            }
          }
        `,
        { input: { pod_id: '000000000000000000000000' } }
      )
    ).rejects.toThrow();
  });
});
