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
  mutation Create($input: CreateLocationInput!) {
    createLocation(input: $input) {
      id
      location_id
      location_name
    }
  }
`;

const input = {
  location_name: 'Pune',
  country: 'India',
  country_code: 'IN',
  state: 'Maharashtra',
  state_code: 'MH',
  city: 'Pune',
  location_image: 'https://img/pune.jpg',
  location_pincode: '411001',
};

describe('location e2e', () => {
  it('lets an admin create a location that is then publicly listed', async () => {
    const admin = server.client(signToken({ roles: ['CITY_ADMIN'] }));
    const created = await admin.request<{ createLocation: { location_id: string } }>(CREATE, { input });
    expect(created.createLocation.location_id).toBe('pune');

    const pub = server.client();
    const list = await pub.request<{ locations: unknown[] }>(gql`query { locations { id location_name } }`);
    expect(list.locations).toHaveLength(1);
  });

  it('forbids a non-admin from creating a location', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(CREATE, { input })).rejects.toThrow();
  });
});
