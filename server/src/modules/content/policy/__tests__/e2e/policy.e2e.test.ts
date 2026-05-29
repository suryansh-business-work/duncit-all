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
  mutation Create($input: CreatePolicyInput!) {
    createPolicy(input: $input) {
      id
      slug
      title
      is_active
    }
  }
`;

describe('policy e2e', () => {
  it('lets a legal manager create a policy that is then public by slug', async () => {
    const legal = server.client(signToken({ roles: ['LEGAL_MANAGER'] }));
    const created = await legal.request<{ createPolicy: { slug: string } }>(CREATE, {
      input: { title: 'Cookie Policy', slug: 'cookie-policy', is_active: true },
    });
    expect(created.createPolicy.slug).toBe('cookie-policy');

    const pub = server.client();
    const bySlug = await pub.request<{ policyBySlug: { title: string } | null }>(
      gql`
        query ($slug: String!) {
          policyBySlug(slug: $slug) {
            title
          }
        }
      `,
      { slug: 'cookie-policy' }
    );
    expect(bySlug.policyBySlug?.title).toBe('Cookie Policy');

    const list = await pub.request<{ publicPolicies: unknown[] }>(gql`query { publicPolicies { id } }`);
    expect(list.publicPolicies).toHaveLength(1);
  });

  it('forbids a non-legal user from creating a policy', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(
      user.request(CREATE, { input: { title: 'x', slug: 'x' } })
    ).rejects.toThrow();
  });
});
