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

  it('serves clubAdminDashboardTable scoped to the caller and requires auth', async () => {
    const admin = new Types.ObjectId().toString();
    const alpha = await seedClub([admin], 'Alpha Club');
    await seedClub([admin], 'Beta Club');
    await seedClub([new Types.ObjectId().toString()], 'Other Club');
    await seedPod(alpha._id);

    type Page = {
      clubAdminDashboardTable: {
        rows: { club_name: string; total_pods: number }[];
        total: number;
        page: number;
        page_size: number;
      };
    };
    const TABLE = gql`
      query ($query: TableQueryInput) {
        clubAdminDashboardTable(query: $query) {
          rows {
            club_name
            total_pods
          }
          total
          page
          page_size
        }
      }
    `;

    const client = server.client(signToken({ id: admin, roles: ['CLUB_ADMIN'] }));
    const all = await client.request<Page>(TABLE);
    expect(all.clubAdminDashboardTable.total).toBe(2); // never the other admin's club
    expect(all.clubAdminDashboardTable.rows.map((r) => r.club_name)).toEqual([
      'Alpha Club',
      'Beta Club',
    ]);
    expect(all.clubAdminDashboardTable.rows[0].total_pods).toBe(1);
    expect(all.clubAdminDashboardTable.page).toBe(1);
    expect(all.clubAdminDashboardTable.page_size).toBe(25);

    const searched = await client.request<Page>(TABLE, { query: { search: 'beta' } });
    expect(searched.clubAdminDashboardTable.rows.map((r) => r.club_name)).toEqual(['Beta Club']);

    await expect(server.client().request(TABLE)).rejects.toThrow();
  });
});
