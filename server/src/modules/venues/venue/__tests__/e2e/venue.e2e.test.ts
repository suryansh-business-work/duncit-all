import { gql } from 'graphql-request';
import { Types } from 'mongoose';
import { startTestServer, signToken, type TestServer } from '@test/harness';
import { VenueModel } from '../../venue.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import * as emailService from '@services/email/email.service';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const VENUE_CANCEL_POD = gql`
  mutation ($pod_id: ID!, $reason: String!) {
    venueCancelPod(pod_id: $pod_id, reason: $reason) {
      pod_id
      health_penalty
      venue_health_score
      refunded_count
    }
  }
`;

describe('venue e2e', () => {
  it('exposes publicVenues without auth (empty initially)', async () => {
    const pub = server.client();
    const res = await pub.request<{ publicVenues: unknown[] }>(gql`query { publicVenues { id venue_name } }`);
    expect(Array.isArray(res.publicVenues)).toBe(true);
  });

  it('forbids a normal user from the admin venues list', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(gql`query { venues { id } }`)).rejects.toThrow();
  });

  it('rejects venueCancelPod without a token', async () => {
    const pub = server.client();
    await expect(
      pub.request(VENUE_CANCEL_POD, { pod_id: String(new Types.ObjectId()), reason: 'Kitchen fire' })
    ).rejects.toThrow(/authentication required/i);
  });

  it('cancels an upcoming pod at the caller-owned venue and reports the penalty', async () => {
    jest.spyOn(emailService, 'sendPodCancelledEmail').mockResolvedValue(undefined as never);
    const ownerId = new Types.ObjectId();
    const venue = await VenueModel.create({
      owner_user_id: ownerId,
      status: 'APPROVED',
      is_active: true,
      venue_name: 'Riverside Hall',
      owner_email: 'owner@example.com',
    } as never);
    const pod = await PodModel.create({
      pod_id: `e2e-${new Types.ObjectId().toString()}`,
      pod_title: 'River poetry',
      pod_hosts_id: [new Types.ObjectId()],
      club_id: new Types.ObjectId(),
      pod_description: 'desc',
      pod_type: 'PAID',
      pod_amount: 300,
      pod_date_time: new Date(Date.now() + 86_400_000),
      no_of_spots: 6,
      is_active: true,
      venue_id: venue._id,
      venue_approval_status: 'APPROVED',
    });

    const owner = server.client(signToken({ id: String(ownerId), roles: ['USER'] }));
    const res = await owner.request<{
      venueCancelPod: {
        pod_id: string;
        health_penalty: number;
        venue_health_score: number;
        refunded_count: number;
      };
    }>(VENUE_CANCEL_POD, { pod_id: String(pod._id), reason: 'Kitchen fire in the hall' });

    expect(res.venueCancelPod).toEqual({
      pod_id: String(pod._id),
      health_penalty: 5,
      venue_health_score: 95,
      refunded_count: 0,
    });
    expect(await PodModel.findById(pod._id)).toBeNull();
    jest.restoreAllMocks();
  });
});
