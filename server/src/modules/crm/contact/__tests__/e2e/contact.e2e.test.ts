jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

const SUBMIT = gql`
  mutation Submit($input: SubmitContactInput!) {
    submitContactForm(input: $input) {
      ok
      message
    }
  }
`;

describe('contact e2e', () => {
  it('lets anyone submit and an admin list submissions', async () => {
    const pub = server.client();
    const res = await pub.request<{ submitContactForm: { ok: boolean } }>(SUBMIT, {
      input: { name: 'Visitor', email: 'v@duncit.com', message: 'Hello from the website' },
    });
    expect(res.submitContactForm.ok).toBe(true);

    const admin = server.client(signToken({ roles: ['CITY_ADMIN'] }));
    const list = await admin.request<{ contactSubmissions: unknown[] }>(
      gql`query { contactSubmissions { id email status } }`
    );
    expect(list.contactSubmissions).toHaveLength(1);
  });

  it('forbids a non-admin from listing submissions', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(gql`query { contactSubmissions { id } }`)).rejects.toThrow();
  });
});
