jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

/*
  Subscribing is one of the public writes behind the human check, and the whole
  point of that check is that the answer is only in the PICTURE. Fixing the code
  the picture is drawn from is the smallest thing that lets a test solve it: the
  guard, the signed token, the expiry and the single-use burn are all still the
  real ones — only the five letters are predictable.
*/
jest.mock('@modules/platform/captcha/captcha.image', () => ({
  ...jest.requireActual('@modules/platform/captcha/captcha.image'),
  generateCaptchaCode: () => 'ABCDE',
}));

import { gql } from 'graphql-request';
import { startTestServer, signToken, type TestServer } from '@test/harness';
import { issueCaptcha } from '@modules/platform/captcha/captcha.service';

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
    const { token } = issueCaptcha();
    const res = await pub.request<{ subscribeNewsletter: { ok: boolean } }>(SUBSCRIBE, {
      input: {
        email: 'visitor@duncit.com',
        source: 'WEBSITE_FOOTER',
        captcha_token: token,
        captcha_answer: 'ABCDE',
      },
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
