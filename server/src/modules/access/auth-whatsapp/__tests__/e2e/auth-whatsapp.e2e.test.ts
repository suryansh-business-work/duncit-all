import { gql } from 'graphql-request';
import { startTestServer, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const REQUEST = gql`
  mutation ($phone_extension: String!, $phone_number: String!) {
    requestSignupWhatsAppOtp(phone_extension: $phone_extension, phone_number: $phone_number) {
      ok
    }
  }
`;

describe('auth-whatsapp e2e', () => {
  /*
    Deliberately open to a signed-out caller: the account this belongs to does
    not exist yet, and proving the number is what decides whether it ever will.
    What keeps it from being a way to text strangers is the resend cooldown, the
    shipped "Sign-in and one-time codes" rate-limit rule, and the refusals in
    the service.
  */
  it('answers a signed-out caller, and refuses a number that is not one', async () => {
    const anon = server.client();
    await expect(
      anon.request(REQUEST, { phone_extension: '+91', phone_number: '123' })
    ).rejects.toThrow(/valid phone number/i);
  });
});
