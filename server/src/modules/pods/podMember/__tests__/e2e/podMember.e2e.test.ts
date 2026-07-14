import { gql } from 'graphql-request';
import { Types } from 'mongoose';
import { startTestServer, adminToken, signToken, type TestServer } from '@test/harness';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '../../podMember.model';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const seedPod = () =>
  PodModel.create({
    pod_id: `e2e-${Math.random().toString(36).slice(2)}`,
    pod_title: 'E2E Backout Pod',
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_type: 'NATIVE_FREE',
    pod_date_time: new Date(Date.now() + 86_400_000),
    is_active: true,
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

  it('lists backout refund requests (with nested pod) for finance admins', async () => {
    const pod = await seedPod();
    await PodMemberModel.create({
      pod_id: pod._id,
      user_id: new Types.ObjectId(),
      status: 'BACKED_OUT',
      backed_out_at: new Date(),
      source: 'FREE',
      refund_status: 'NOT_ELIGIBLE',
    });

    const admin = server.client(adminToken());
    const data = await admin.request<{
      backoutRefundRequests: Array<{ pod: { pod_title: string } | null }>;
    }>(gql`
      query {
        backoutRefundRequests {
          id
          status
          refund_status
          pod {
            id
            pod_title
          }
        }
      }
    `);
    expect(data.backoutRefundRequests.some((r) => r.pod?.pod_title === 'E2E Backout Pod')).toBe(true);
  });

  it('lets a member rejoin a pod they backed out of, without payment', async () => {
    const pod = await seedPod();
    const userId = new Types.ObjectId().toString();
    await PodMemberModel.create({
      pod_id: pod._id,
      user_id: new Types.ObjectId(userId),
      status: 'BACKED_OUT',
      backed_out_at: new Date(),
      source: 'PAID',
      refund_status: 'PENDING',
    });

    const client = server.client(signToken({ id: userId }));
    const data = await client.request<{ rejoinPod: { status: string; refund_status: string } }>(
      gql`
        mutation ($id: ID!) {
          rejoinPod(pod_doc_id: $id) {
            id
            status
            refund_status
          }
        }
      `,
      { id: String(pod._id) }
    );
    expect(data.rejoinPod.status).toBe('JOINED');
    expect(data.rejoinPod.refund_status).toBe('NONE');
  });

  it('serves backoutRefundRequestsTable to finance admins only', async () => {
    const pod = await seedPod();
    await PodMemberModel.create({
      pod_id: pod._id,
      user_id: new Types.ObjectId(),
      status: 'BACKED_OUT',
      backed_out_at: new Date(),
      source: 'FREE',
      refund_status: 'NOT_ELIGIBLE',
    });
    await PodMemberModel.create({
      pod_id: pod._id,
      user_id: new Types.ObjectId(),
      status: 'JOINED',
      source: 'FREE',
      refund_status: 'NONE',
    });

    type Page = {
      backoutRefundRequestsTable: {
        rows: { status: string; refund_status: string }[];
        total: number;
        page: number;
        page_size: number;
      };
    };
    const TABLE = gql`
      query ($query: TableQueryInput) {
        backoutRefundRequestsTable(query: $query) {
          rows {
            status
            refund_status
          }
          total
          page
          page_size
        }
      }
    `;

    const admin = server.client(adminToken());
    const page = await admin.request<Page>(TABLE);
    expect(page.backoutRefundRequestsTable.total).toBe(1);
    expect(page.backoutRefundRequestsTable.rows).toEqual([
      { status: 'BACKED_OUT', refund_status: 'NOT_ELIGIBLE' },
    ]);
    expect(page.backoutRefundRequestsTable.page).toBe(1);
    expect(page.backoutRefundRequestsTable.page_size).toBe(25);

    // Same guard as backoutRefundRequests — plain users are rejected.
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(TABLE)).rejects.toThrow();
  });
});
