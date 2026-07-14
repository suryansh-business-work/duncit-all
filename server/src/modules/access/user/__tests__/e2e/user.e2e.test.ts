import { gql } from 'graphql-request';
import { Types } from 'mongoose';
import { startTestServer, signToken, type TestServer } from '@test/harness';
import { UserModel } from '../../user.model';

let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterAll(async () => {
  await server.stop();
});

/** Insert a user directly with the nested storage shape (bypasses signup). */
async function seedUser(first: string, email: string, roles: string[], created: string) {
  await UserModel.collection.insertOne({
    _id: new Types.ObjectId(),
    auth: { email, phone: { number: '' } },
    profile: { first_name: first, last_name: '' },
    metadata: { status: 'ACTIVE', role_keys: roles, created_at: new Date(created) },
  } as never);
}

describe('user e2e', () => {
  it('forbids a normal user from listing users', async () => {
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request(gql`query { users { user_id } }`)).rejects.toThrow();
  });

  it('serves usersTable: envelope, search, filters, sort and paging', async () => {
    await seedUser('Alice', 'alice@duncit.com', ['USER'], '2026-01-01');
    await seedUser('Bob', 'bob@duncit.com', ['CITY_ADMIN'], '2026-02-01');
    await seedUser('Cara', 'cara@duncit.com', ['USER'], '2026-03-01');

    type Page = {
      usersTable: { rows: { first_name: string }[]; total: number; page: number; page_size: number };
    };
    const TABLE = gql`
      query ($query: TableQueryInput) {
        usersTable(query: $query) {
          rows {
            first_name
          }
          total
          page
          page_size
        }
      }
    `;
    // The directory guard also admits the Marketing portal's read-only role.
    const support = server.client(signToken({ roles: ['SUPPORT_USER'] }));

    // (a) plain page-1 envelope, newest first
    const all = await support.request<Page>(TABLE);
    expect(all.usersTable.total).toBe(3);
    expect(all.usersTable.rows.map((r) => r.first_name)).toEqual(['Cara', 'Bob', 'Alice']);
    expect(all.usersTable.page).toBe(1);
    expect(all.usersTable.page_size).toBe(25);

    // (b) search narrows
    const searched = await support.request<Page>(TABLE, { query: { search: 'bob@duncit.com' } });
    expect(searched.usersTable.rows.map((r) => r.first_name)).toEqual(['Bob']);
    expect(searched.usersTable.total).toBe(1);

    // (c) role filter narrows
    const admins = await support.request<Page>(TABLE, {
      query: { filters: [{ field: 'role', op: 'eq', value: 'CITY_ADMIN' }] },
    });
    expect(admins.usersTable.rows.map((r) => r.first_name)).toEqual(['Bob']);

    // (d) allowlisted sort ascending
    const sorted = await support.request<Page>(TABLE, {
      query: { sort_by: 'first_name', sort_dir: 'asc' },
    });
    expect(sorted.usersTable.rows.map((r) => r.first_name)).toEqual(['Alice', 'Bob', 'Cara']);

    // (e) page_size=1 page=2 returns the 2nd user; total is unaffected by paging
    const page2 = await support.request<Page>(TABLE, { query: { page: 2, page_size: 1 } });
    expect(page2.usersTable.rows.map((r) => r.first_name)).toEqual(['Bob']);
    expect(page2.usersTable.total).toBe(3);
    expect(page2.usersTable.page).toBe(2);
    expect(page2.usersTable.page_size).toBe(1);

    // (f) same guard as the sibling users query — a normal user is forbidden
    const user = server.client(signToken({ roles: ['USER'] }));
    await expect(user.request<Page>(TABLE)).rejects.toThrow();
  });
});
