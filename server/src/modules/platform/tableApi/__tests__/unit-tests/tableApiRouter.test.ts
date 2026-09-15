import express from 'express';
import request from 'supertest';
import type { ApolloServer } from '@apollo/server';
import type { GraphQLContext } from '@context';
import { tableApiService } from '../../tableApi.service';
import { buildTableApiRouter } from '../../tableApi.router';

jest.mock('../../tableApi.service', () => ({ tableApiService: { authenticate: jest.fn() } }));
jest.mock('@config/url-configs', () => ({
  getUrlConfigs: async () => ({ serverUrl: 'https://server.duncit.com' }),
}));

const SDL = /* GraphQL */ `
  type Query {
    podsTable(query: TableQueryInput): PodPage
    bareTable: BarePage
  }
  input TableQueryInput {
    page: Int
  }
  type PodPage {
    rows: [Pod]
    total: Int
    page: Int
    page_size: Int
  }
  type BarePage {
    rows: [Pod]
    total: Int
  }
  type Pod {
    id: ID
  }
`;

const USER = { id: 'u1', email: 'asha@duncit.com', roles: ['TECH_MANAGER'], assigned_city: null, assigned_zones: [] };
const authenticate = tableApiService.authenticate as jest.Mock;
const executeOperation = jest.fn();

function app() {
  const server = express();
  const apollo = { executeOperation } as unknown as ApolloServer<GraphQLContext>;
  server.use('/table-api', buildTableApiRouter({ apollo, typeDefs: [SDL], resolvers: [] }));
  return server;
}

const single = (singleResult: Record<string, unknown>) => ({ body: { kind: 'single', singleResult } });

beforeEach(() => {
  authenticate.mockReset().mockResolvedValue(USER);
  executeOperation.mockReset();
});

describe('GET /table-api/:table', () => {
  it('asks for a token first', async () => {
    authenticate.mockResolvedValue(null);
    const res = await request(app()).get('/table-api/podsTable');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHENTICATED');
    expect(res.headers['cache-control']).toContain('no-store');
  });

  it('refuses a name that is not a table query', async () => {
    const res = await request(app()).get('/table-api/me?token=dtt_1');
    expect(res.status).toBe(404);
  });

  it('refuses a malformed page', async () => {
    const res = await request(app()).get('/table-api/podsTable?token=dtt_1&page=0');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'BAD_USER_INPUT', message: '"page" must be a whole number of 1 or more.' });
  });

  it('runs the table as the token owner and links the neighbouring pages', async () => {
    executeOperation.mockResolvedValue(
      single({ data: { podsTable: { rows: [{ id: 'DUN-POD-4821' }], total: 60, page: 2, page_size: 25 } } })
    );
    const res = await request(app()).get('/table-api/podsTable?token=dtt_1&page=2');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      table: 'podsTable',
      page: 2,
      page_size: 25,
      total: 60,
      total_pages: 3,
      next_page_url: 'https://server.duncit.com/table-api/podsTable?token=dtt_1&page=3',
      previous_page_url: 'https://server.duncit.com/table-api/podsTable?token=dtt_1&page=1',
      rows: [{ id: 'DUN-POD-4821' }],
    });
    const [operation, { contextValue }] = executeOperation.mock.calls[0];
    expect(operation.operationName).toBe('TableApi_podsTable');
    expect(operation.variables.query.page).toBe(2);
    expect(contextValue.user).toBe(USER);
    expect(contextValue.noRedis).toBe(true);
  });

  it('reads paging from the request when the page type does not echo it', async () => {
    executeOperation.mockResolvedValue(single({ data: { podsTable: { rows: [{ id: 'p1' }], total: 5 } } }));
    const res = await request(app()).get('/table-api/podsTable?token=dtt_1&page_size=10');
    expect(res.body).toMatchObject({ page: 1, page_size: 10, total_pages: 1, next_page_url: null, previous_page_url: null });
  });

  it('answers an empty table with no paging arguments', async () => {
    executeOperation.mockResolvedValue(single({ data: { bareTable: { rows: [], total: 0 } } }));
    const res = await request(app()).get('/table-api/bareTable?token=dtt_1');
    expect(res.body).toMatchObject({ page: 1, page_size: 0, total_pages: 0, next_page_url: null });
  });

  it.each([
    [{ errors: [{ message: 'Access Denied', extensions: { code: 'FORBIDDEN' } }] }, 403, 'FORBIDDEN', 'Access Denied'],
    [{ errors: [{ message: 'Boom', extensions: { code: 'INTERNAL_SERVER_ERROR' } }] }, 500, 'INTERNAL_SERVER_ERROR', 'Boom'],
    [{ errors: [{ message: 'Odd' }] }, 500, 'INTERNAL', 'Odd'],
    [{ data: null }, 500, 'INTERNAL', 'The table could not be read. Try again.'],
  ])('passes a failed read on as an HTTP status (%j)', async (result, status, error, message) => {
    executeOperation.mockResolvedValue(single(result));
    const res = await request(app()).get('/table-api/podsTable?token=dtt_1');
    expect(res.status).toBe(status);
    expect(res.body).toEqual({ error, message });
  });

  it('answers 500 instead of crashing when the read itself throws', async () => {
    executeOperation.mockResolvedValue({ body: { kind: 'incremental' } });
    const res = await request(app()).get('/table-api/podsTable?token=dtt_1');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('INTERNAL');
  });
});
