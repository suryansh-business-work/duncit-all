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

  it('serves podPlansTable to admins only: envelope, search and paging', async () => {
    const admin = server.client(signToken({ roles: ['CITY_ADMIN'] }));
    await admin.request(CREATE, { input: { key: 'starter', name: 'Starter', sort_order: 0 } });
    await admin.request(CREATE, { input: { key: 'growth', name: 'Growth', sort_order: 1 } });

    type Page = {
      podPlansTable: { rows: { key: string }[]; total: number; page: number; page_size: number };
    };
    const TABLE = gql`
      query ($query: TableQueryInput) {
        podPlansTable(query: $query) {
          rows {
            key
          }
          total
          page
          page_size
        }
      }
    `;

    const all = await admin.request<Page>(TABLE);
    expect(all.podPlansTable.total).toBe(2);
    expect(all.podPlansTable.rows.map((r) => r.key)).toEqual(['starter', 'growth']);
    expect(all.podPlansTable.page).toBe(1);
    expect(all.podPlansTable.page_size).toBe(25);

    const searched = await admin.request<Page>(TABLE, { query: { search: 'grow' } });
    expect(searched.podPlansTable.rows.map((r) => r.key)).toEqual(['growth']);

    const page2 = await admin.request<Page>(TABLE, { query: { page: 2, page_size: 1 } });
    expect(page2.podPlansTable.rows.map((r) => r.key)).toEqual(['growth']);
    expect(page2.podPlansTable.total).toBe(2);
    expect(page2.podPlansTable.page).toBe(2);
    expect(page2.podPlansTable.page_size).toBe(1);

    // Same guard as podPlans — plain users are rejected.
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(TABLE)).rejects.toThrow();
  });
});
