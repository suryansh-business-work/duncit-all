import { gql } from 'graphql-request';
import { startTestServer, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

describe('auth-whatsapp e2e', () => {
  it('requires authentication to request a WhatsApp OTP', async () => {
    const anon = server.client();
    await expect(
      anon.request(
        gql`
          mutation ($phone_extension: String!, $phone_number: String!) {
            requestWhatsAppOtp(phone_extension: $phone_extension, phone_number: $phone_number) {
              ok
            }
          }
        `,
        { phone_extension: "+91", phone_number: "9999999999" }
      )
    ).rejects.toThrow();
  });
});
