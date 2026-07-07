import { gql } from 'graphql-request';
import { Types } from 'mongoose';
import { startTestServer, signToken, type TestServer } from '@test/harness';
import { ClubModel } from '@modules/pods/club/club.model';
import { PodModel } from '@modules/pods/pod/pod.model';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const seedClub = (admins: string[], name = 'E2E Club') =>
  ClubModel.create({
    club_id: `e2e-${Math.random().toString(36).slice(2)}`,
    club_name: name,
    admin_user_ids: admins,
  });

const seedPod = (clubId: unknown) =>
  PodModel.create({
    pod_id: `e2e-${Math.random().toString(36).slice(2)}`,
    pod_title: 'E2E Pod',
    club_id: clubId,
    pod_description: 'desc',
    pod_type: 'NATIVE_FREE',
    pod_date_time: new Date(Date.now() + 86_400_000),
    is_active: true,
  });

describe('clubAdmin e2e', () => {
  it('requires authentication for the club-admin surface', async () => {
    const anon = server.client();
    await expect(anon.request(gql`{ myAdminClubs { id } }`)).rejects.toThrow();
    await expect(
      anon.request(gql`{ clubAdminDashboard { kpis { assigned_clubs } } }`)
    ).rejects.toThrow();
  });

  it('returns the caller’s administered clubs and dashboard', async () => {
    const admin = new Types.ObjectId().toString();
    await seedClub([admin], 'Alpha Club');
    const client = server.client(signToken({ id: admin, roles: ['CLUB_ADMIN'] }));

    const res: any = await client.request(gql`
      {
        myAdminClubs {
          id
          club_name
          admin_user_ids
        }
        clubAdminDashboard {
          kpis {
            assigned_clubs
            total_pods
            currency_symbol
          }
          clubs {
            club_name
          }
          trend {
            label
          }
        }
      }
    `);
    expect(res.myAdminClubs).toHaveLength(1);
    expect(res.myAdminClubs[0].club_name).toBe('Alpha Club');
    expect(res.myAdminClubs[0].admin_user_ids).toEqual([admin]);
    expect(res.clubAdminDashboard.kpis.assigned_clubs).toBe(1);
    expect(res.clubAdminDashboard.clubs).toHaveLength(1);
  });

  it('blocks editing a pod in a club the caller does not administer', async () => {
    const admin = new Types.ObjectId().toString();
    await seedClub([admin]);
    const otherClub = await seedClub([new Types.ObjectId().toString()]);
    const otherPod = await seedPod(otherClub._id);
    const client = server.client(signToken({ id: admin, roles: ['CLUB_ADMIN'] }));

    await expect(
      client.request(
        gql`
          mutation ($id: ID!) {
            clubAdminUpdatePod(pod_doc_id: $id, input: { pod_title: "Hacked" }) {
              id
            }
          }
        `,
        { id: String(otherPod._id) }
      )
    ).rejects.toThrow(/do not administer/i);
  });
});
