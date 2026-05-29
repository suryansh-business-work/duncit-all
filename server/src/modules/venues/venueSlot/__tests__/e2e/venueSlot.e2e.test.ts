import { gql } from 'graphql-request';
import { startTestServer, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('venueSlot e2e', () => {
  it('requires authentication to read venue slots', async () => {
    const anon = server.client();
    await expect(
      anon.request(
        gql`
          query ($venue_id: ID!) {
            venueSlots(venue_id: $venue_id) {
              id
              status
            }
          }
        `,
        { venue_id: '000000000000000000000000' }
      )
    ).rejects.toThrow();
  });
});
