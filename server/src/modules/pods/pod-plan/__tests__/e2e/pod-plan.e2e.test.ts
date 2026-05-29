import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const CREATE = gql`
  mutation Create($input: PodPlanInput!) {
    createPodPlan(input: $input) {
      id
      key
    }
  }
`;

describe('pod-plan e2e', () => {
  it('lets an admin create a plan exposed via publicPodPlans', async () => {
    const admin = server.client(signToken({ roles: ['CITY_ADMIN'] }));
    const created = await admin.request<{ createPodPlan: { key: string } }>(CREATE, {
      input: { key: 'starter', name: 'Starter', is_active: true },
    });
    expect(created.createPodPlan.key).toBe('starter');

    const pub = server.client();
    const list = await pub.request<{ publicPodPlans: unknown[] }>(gql`query { publicPodPlans { id key } }`);
    expect(list.publicPodPlans).toHaveLength(1);
  });

  it('forbids a non-admin from creating a plan', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(CREATE, { input: { key: 'x', name: 'X' } })).rejects.toThrow();
  });
});
