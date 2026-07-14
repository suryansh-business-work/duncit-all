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
});
