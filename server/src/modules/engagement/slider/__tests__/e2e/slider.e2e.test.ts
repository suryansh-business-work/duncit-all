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
  mutation Create($input: CreateSliderInput!) {
    createSlider(input: $input) {
      id
      slider_id
      effective_link_url
    }
  }
`;

const input = {
  title: 'Launch',
  media_url: 'https://img/launch.jpg',
  scope: 'GLOBAL',
  link_type: 'EXTERNAL',
  link_url: 'https://duncit.com',
};

describe('slider e2e', () => {
  it('lets an admin create a slider that is publicly listed', async () => {
    const admin = server.client(signToken({ roles: ['CITY_ADMIN'] }));
    const created = await admin.request<{ createSlider: { id: string } }>(CREATE, { input });
    expect(created.createSlider.id).toBeTruthy();

    const pub = server.client();
    const list = await pub.request<{ sliders: unknown[] }>(gql`query { sliders { id title } }`);
    expect(list.sliders).toHaveLength(1);
  });

  it('forbids a non-admin from creating a slider', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(CREATE, { input })).rejects.toThrow();
  });
});
