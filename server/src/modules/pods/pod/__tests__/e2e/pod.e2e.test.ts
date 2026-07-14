import { gql } from 'graphql-request';
import { Types } from 'mongoose';
import { startTestServer, signToken, type TestServer } from '@test/harness';
import { PodModel } from '../../pod.model';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const seedPod = (over: Record<string, unknown> = {}) =>
  PodModel.create({
    pod_id: `e2e-${Math.random().toString(36).slice(2)}`,
    pod_title: 'Table Pod',
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_type: 'NATIVE_FREE',
    pod_date_time: new Date(Date.now() + 86_400_000),
    is_active: true,
    ...over,
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

  it('serves podsTable: envelope, search, PENDING guard and paging', async () => {
    await seedPod({ pod_title: 'Alpha Jam' });
    await seedPod({ pod_title: 'Beta Bash' });
    await seedPod({ pod_title: 'Hidden Pending', venue_approval_status: 'PENDING' });

    type Page = {
      podsTable: { rows: { pod_title: string }[]; total: number; page: number; page_size: number };
    };
    const TABLE = gql`
      query ($query: TableQueryInput) {
        podsTable(query: $query) {
          rows {
            pod_title
          }
          total
          page
          page_size
        }
      }
    `;
    const pub = server.client();

    // (a) plain page-1 envelope — the PENDING pod stays hidden from the public
    const all = await pub.request<Page>(TABLE);
    expect(all.podsTable.total).toBe(2);
    expect(all.podsTable.rows).toHaveLength(2);
    expect(all.podsTable.page).toBe(1);
    expect(all.podsTable.page_size).toBe(25);

    // (b) search narrows
    const searched = await pub.request<Page>(TABLE, { query: { search: 'beta' } });
    expect(searched.podsTable.rows.map((r) => r.pod_title)).toEqual(['Beta Bash']);
    expect(searched.podsTable.total).toBe(1);

    // (c) sort + paging: page 2 of size 1 is the 2nd title; total unaffected
    const page2 = await pub.request<Page>(TABLE, {
      query: { sort_by: 'pod_title', sort_dir: 'asc', page: 2, page_size: 1 },
    });
    expect(page2.podsTable.rows.map((r) => r.pod_title)).toEqual(['Beta Bash']);
    expect(page2.podsTable.total).toBe(2);
    expect(page2.podsTable.page).toBe(2);
    expect(page2.podsTable.page_size).toBe(1);

    // (d) review roles see the PENDING pod too
    const admin = server.client(signToken({ roles: ['CITY_ADMIN'] }));
    const review = await admin.request<Page>(TABLE);
    expect(review.podsTable.total).toBe(3);
  });

  it('serves myHostPodsTable scoped to the signed-in host and requires auth', async () => {
    const hostA = new Types.ObjectId().toString();
    const hostB = new Types.ObjectId().toString();
    await seedPod({ pod_title: 'Mine', pod_hosts_id: [new Types.ObjectId(hostA)] });
    await seedPod({ pod_title: 'Theirs', pod_hosts_id: [new Types.ObjectId(hostB)] });

    const MY = gql`
      query {
        myHostPodsTable {
          rows {
            pod_title
          }
          total
        }
      }
    `;
    const hostClient = server.client(signToken({ id: hostA }));
    const mine = await hostClient.request<{
      myHostPodsTable: { rows: { pod_title: string }[]; total: number };
    }>(MY);
    expect(mine.myHostPodsTable.rows.map((r) => r.pod_title)).toEqual(['Mine']);
    expect(mine.myHostPodsTable.total).toBe(1);

    await expect(server.client().request(MY)).rejects.toThrow();
  });
});
