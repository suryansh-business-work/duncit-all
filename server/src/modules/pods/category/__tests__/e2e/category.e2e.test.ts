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
  mutation Create($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
      name
      slug
      level
    }
  }
`;

describe('category e2e', () => {
  it('lets an admin create a super category and read it publicly', async () => {
    const admin = server.client(signToken({ roles: ['CITY_ADMIN'] }));
    const created = await admin.request<{ createCategory: { slug: string; level: string } }>(CREATE, {
      input: { name: 'Nightlife', level: 'SUPER' },
    });
    expect(created.createCategory.level).toBe('SUPER');
    expect(created.createCategory.slug).toBe('nightlife');

    const pub = server.client();
    const list = await pub.request<{ categories: unknown[] }>(gql`query { categories { id name } }`);
    expect(list.categories).toHaveLength(1);
  });

  it('forbids a non-admin from creating a category', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(CREATE, { input: { name: 'x', level: 'SUPER' } })).rejects.toThrow();
  });
});
