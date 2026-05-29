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

const SUBSCRIBE = gql`
  mutation Sub($input: SubscribeNewsletterInput!) {
    subscribeNewsletter(input: $input) {
      ok
      message
    }
  }
`;

describe('newsletter e2e', () => {
  it('lets anyone subscribe and an admin list subscribers', async () => {
    const pub = server.client();
    const res = await pub.request<{ subscribeNewsletter: { ok: boolean } }>(SUBSCRIBE, {
      input: { email: 'visitor@duncit.com', source: 'WEBSITE_FOOTER' },
    });
    expect(res.subscribeNewsletter.ok).toBe(true);

    const admin = server.client(signToken({ roles: ['CITY_ADMIN'] }));
    const list = await admin.request<{ newsletterSubscribers: unknown[] }>(
      gql`query { newsletterSubscribers { id email } }`
    );
    expect(list.newsletterSubscribers).toHaveLength(1);
  });

  it('forbids a non-admin from listing subscribers', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(gql`query { newsletterSubscribers { id } }`)).rejects.toThrow();
  });
});
