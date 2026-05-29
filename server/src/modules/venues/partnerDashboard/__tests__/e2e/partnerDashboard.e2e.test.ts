import { gql } from 'graphql-request';
import { Types } from 'mongoose';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const DASHBOARD = gql`
  query ($from: String!, $to: String!) {
    partnerDashboard(from: $from, to: $to) {
      summary {
        total_earning
        number_of_pods
      }
    }
  }
`;

describe('partnerDashboard e2e', () => {
  it('returns a dashboard for an authenticated partner', async () => {
    const user = server.client(signToken({ id: new Types.ObjectId().toString(), roles: ['HOST'] }));
    const res = await user.request<{ partnerDashboard: { summary: { number_of_pods: number } } }>(DASHBOARD, {
      from: '2020-01-01',
      to: '2030-01-01',
    });
    expect(res.partnerDashboard.summary.number_of_pods).toBe(0);
  });

  it('requires authentication', async () => {
    const anon = server.client();
    await expect(anon.request(DASHBOARD, { from: '2020-01-01', to: '2030-01-01' })).rejects.toThrow();
  });
});
