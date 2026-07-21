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

const seedPod = (over: Record<string, unknown> = {}) =>
  PodModel.create({
    pod_id: `e2e-${Math.random().toString(36).slice(2)}`,
    pod_title: 'E2E Backout Pod',
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_type: 'NATIVE_FREE',
    pod_date_time: new Date(Date.now() + 86_400_000),
    no_of_spots: 5,
    is_active: true,
    ...over,
  });

const seedJoined = async (pod: any, uid: string) => {
  await PodMemberModel.create({
    pod_id: pod._id,
    user_id: new Types.ObjectId(uid),
    status: 'JOINED',
    source: 'FREE',
    refund_status: 'NONE',
  });
  await PodModel.updateOne({ _id: pod._id }, { $addToSet: { pod_attendees: new Types.ObjectId(uid) } });
};

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

  it('runs the backout → keep-my-spot cycle over GraphQL', async () => {
    const pod = await seedPod();
    const userId = new Types.ObjectId().toString();
    await seedJoined(pod, userId);
    const client = server.client(signToken({ id: userId }));

    const backout = await client.request<{ backoutPod: { status: string; backout_count: number } }>(
      gql`
        mutation ($id: ID!) {
          backoutPod(pod_doc_id: $id) {
            id
            status
            backout_count
          }
        }
      `,
      { id: String(pod._id) }
    );
    expect(backout.backoutPod.status).toBe('BACKOUT_IN_PROCESS');
    expect(backout.backoutPod.backout_count).toBe(1);

    const state = await client.request<{
      podMembershipState: {
        backout_in_process: boolean;
        can_cancel_backout: boolean;
        backout_attempts_used: number;
        backout_attempts_max: number;
      };
    }>(
      gql`
        query ($id: ID!) {
          podMembershipState(pod_doc_id: $id) {
            backout_in_process
            can_cancel_backout
            backout_attempts_used
            backout_attempts_max
          }
        }
      `,
      { id: String(pod._id) }
    );
    expect(state.podMembershipState).toMatchObject({
      backout_in_process: true,
      can_cancel_backout: true,
      backout_attempts_used: 1,
    });

    const restore = await client.request<{ cancelBackoutPod: { status: string } }>(
      gql`
        mutation ($id: ID!) {
          cancelBackoutPod(pod_doc_id: $id) {
            id
            status
          }
        }
      `,
      { id: String(pod._id) }
    );
    expect(restore.cancelBackoutPod.status).toBe('JOINED');
  });

  it('lists backout refund requests (with nested pod) for finance admins', async () => {
    const pod = await seedPod();
    const userId = new Types.ObjectId().toString();
    await seedJoined(pod, userId);
    const client = server.client(signToken({ id: userId }));
    await client.request(
      gql`
        mutation ($id: ID!) {
          backoutPod(pod_doc_id: $id) {
            id
          }
        }
      `,
      { id: String(pod._id) }
    );

    const admin = server.client(adminToken());
    const data = await admin.request<{
      backoutRefundRequests: Array<{
        backout_no: string;
        backout_status: string;
        events: Array<{ status: string; backout_count: number }>;
        pod: { pod_title: string } | null;
      }>;
    }>(gql`
      query {
        backoutRefundRequests {
          id
          backout_no
          backout_status
          status
          refund_status
          events {
            status
            backout_count
            at
          }
          pod {
            id
            pod_title
          }
        }
      }
    `);
    const row = data.backoutRefundRequests.find((r) => r.pod?.pod_title === 'E2E Backout Pod');
    expect(row).toBeTruthy();
    expect(row!.backout_no).toMatch(/^DUN-BKO-\d{6}$/);
    expect(row!.backout_status).toBe('IN_PROCESS');
    expect(row!.events).toEqual([expect.objectContaining({ status: 'IN_PROCESS', backout_count: 1 })]);
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
    const userId = new Types.ObjectId().toString();
    await seedJoined(pod, userId);
    const member = server.client(signToken({ id: userId }));
    await member.request(
      gql`
        mutation ($id: ID!) {
          backoutPod(pod_doc_id: $id) {
            id
          }
        }
      `,
      { id: String(pod._id) }
    );

    type Page = {
      backoutRefundRequestsTable: {
        rows: { backout_no: string; backout_status: string; refund_status: string }[];
        total: number;
        page: number;
        page_size: number;
      };
    };
    const TABLE = gql`
      query ($query: TableQueryInput) {
        backoutRefundRequestsTable(query: $query) {
          rows {
            backout_no
            backout_status
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
    expect(page.backoutRefundRequestsTable.rows[0]).toMatchObject({
      backout_status: 'IN_PROCESS',
      refund_status: 'NOT_ELIGIBLE',
    });
    expect(page.backoutRefundRequestsTable.page).toBe(1);
    expect(page.backoutRefundRequestsTable.page_size).toBe(25);

    // Same guard as backoutRefundRequests — plain users are rejected.
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(TABLE)).rejects.toThrow();

    // processBackoutRefund carries the same finance/admin gate.
    await expect(
      user.request(
        gql`
          mutation ($id: ID!) {
            processBackoutRefund(id: $id) {
              id
            }
          }
        `,
        { id: '000000000000000000000000' }
      )
    ).rejects.toThrow();
  });
});
