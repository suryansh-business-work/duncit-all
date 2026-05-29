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
  mutation Create($input: CreateEmailTemplateInput!) {
    createEmailTemplate(input: $input) {
      template_id
      slug
    }
  }
`;

const input = {
  slug: 'promo-mail',
  name: 'Promo Mail',
  subject: 'Promo',
  mjml: '<mjml><mj-body><mj-text>Hi</mj-text></mj-body></mjml>',
};

describe('emailTemplate e2e', () => {
  it('lets an admin create and list templates', async () => {
    const admin = server.client(signToken({ roles: ['CITY_ADMIN'] }));
    const created = await admin.request<{ createEmailTemplate: { slug: string } }>(CREATE, { input });
    expect(created.createEmailTemplate.slug).toBe('promo-mail');

    const list = await admin.request<{ emailTemplates: unknown[] }>(gql`query { emailTemplates { template_id slug } }`);
    expect(list.emailTemplates.length).toBeGreaterThanOrEqual(1);
  });

  it('forbids a non-admin from listing templates', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(gql`query { emailTemplates { template_id } }`)).rejects.toThrow();
  });
});
