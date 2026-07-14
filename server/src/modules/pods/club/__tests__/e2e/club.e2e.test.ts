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
  mutation Create($input: CreateClubInput!) {
    createClub(input: $input) {
      id
      club_id
      club_name
    }
  }
`;

describe('club e2e', () => {
  it('lets an admin create a club that is then publicly listed', async () => {
    const admin = server.client(signToken({ roles: ['CITY_ADMIN'] }));
    const created = await admin.request<{ createClub: { club_id: string } }>(CREATE, {
      input: { club_name: 'Trail Blazers' },
    });
    expect(created.createClub.club_id).toBe('trail-blazers');

    const pub = server.client();
    const list = await pub.request<{ clubs: unknown[] }>(gql`query { clubs { id club_name } }`);
    expect(list.clubs).toHaveLength(1);
  });

  it('forbids a non-admin from creating a club', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(CREATE, { input: { club_name: 'X' } })).rejects.toThrow();
  });

  it('narrows the public club list to a locality/zone via ClubFilterInput', async () => {
    const admin = server.client(signToken({ roles: ['CITY_ADMIN'] }));
    await admin.request(CREATE, { input: { club_name: 'Saket Runners', locality: 'Saket' } });
    await admin.request(CREATE, { input: { club_name: 'Rohini Runners', locality: 'Rohini' } });

    const pub = server.client();
    const saket = await pub.request<{ clubs: { club_name: string }[] }>(
      gql`
        query ($locality: String) {
          clubs(filter: { is_active: true, locality: $locality }) {
            club_name
          }
        }
      `,
      { locality: 'Saket' }
    );
    expect(saket.clubs).toEqual([{ club_name: 'Saket Runners' }]);
  });

  it('serves clubsTable: envelope, search, filters, sort and paging', async () => {
    const admin = server.client(signToken({ roles: ['CITY_ADMIN'] }));
    await admin.request(CREATE, { input: { club_name: 'Alpha Runners', locality: 'Saket' } });
    await admin.request(CREATE, { input: { club_name: 'Beta Bakers', locality: 'Rohini' } });
    await admin.request(CREATE, {
      input: { club_name: 'Gamma Gamers', locality: 'Saket', is_active: false },
    });

    type Page = { clubsTable: { rows: { club_name: string }[]; total: number; page: number; page_size: number } };
    const TABLE = gql`
      query ($query: TableQueryInput) {
        clubsTable(query: $query) {
          rows {
            club_name
          }
          total
          page
          page_size
        }
      }
    `;
    const pub = server.client();

    // (a) plain page-1 envelope
    const all = await pub.request<Page>(TABLE);
    expect(all.clubsTable.total).toBe(3);
    expect(all.clubsTable.rows).toHaveLength(3);
    expect(all.clubsTable.page).toBe(1);
    expect(all.clubsTable.page_size).toBe(25);

    // (b) search narrows
    const searched = await pub.request<Page>(TABLE, { query: { search: 'bakers' } });
    expect(searched.clubsTable.rows.map((r) => r.club_name)).toEqual(['Beta Bakers']);
    expect(searched.clubsTable.total).toBe(1);

    // (c) boolean filter narrows
    const active = await pub.request<Page>(TABLE, {
      query: { filters: [{ field: 'is_active', op: 'is_true' }] },
    });
    expect(active.clubsTable.rows.map((r) => r.club_name)).toEqual([
      'Alpha Runners',
      'Beta Bakers',
    ]);
    expect(active.clubsTable.total).toBe(2);

    // (d) sort_by club_name asc ordering
    const sorted = await pub.request<Page>(TABLE, {
      query: { sort_by: 'club_name', sort_dir: 'asc' },
    });
    expect(sorted.clubsTable.rows.map((r) => r.club_name)).toEqual([
      'Alpha Runners',
      'Beta Bakers',
      'Gamma Gamers',
    ]);

    // (e) page_size=1 page=2 returns the 2nd club; total is unaffected by paging
    const page2 = await pub.request<Page>(TABLE, { query: { page: 2, page_size: 1 } });
    expect(page2.clubsTable.rows.map((r) => r.club_name)).toEqual(['Beta Bakers']);
    expect(page2.clubsTable.total).toBe(3);
    expect(page2.clubsTable.page).toBe(2);
    expect(page2.clubsTable.page_size).toBe(1);
  });
});
