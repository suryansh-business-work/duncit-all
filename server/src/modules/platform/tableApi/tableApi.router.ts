import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { ApolloServer } from '@apollo/server';
import type { GraphQLFormattedError } from 'graphql';
import type { GraphQLContext } from '@context';
import { getUrlConfigs } from '@config/url-configs';
import { watchClientPresence } from '@utils/clientPresence';
import { logs } from '@observability/log';
import { createTableOperations, type SdlSource } from './tableApi.operation';
import { pageUrl, TOKEN_HEADER, TOKEN_PARAM, tokenOf, variablesOf } from './tableApi.request';
import { tableApiService } from './tableApi.service';

/**
 * The GET API behind every portal table's "GET API" dialog.
 *
 *   GET /table-api/<tableQueryName>?token=dtt_…&page=1&page_size=25
 *
 * Read-only by construction: it can only run a `<name>Table` Query field, built
 * by tableApi.operation.ts. It runs through Apollo like any portal request —
 * rate limiting, the GraphQL monitor and every resolver's own role check apply
 * — as the token's owner, so it answers with what that person can already see.
 */

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' } as const;

const ERROR_STATUS: Readonly<Record<string, number>> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  BAD_USER_INPUT: 400,
  GRAPHQL_VALIDATION_FAILED: 400,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
};

interface TableApiDeps {
  apollo: ApolloServer<GraphQLContext>;
  typeDefs: ReadonlyArray<SdlSource>;
  resolvers: ReadonlyArray<Readonly<Record<string, unknown>>>;
}

interface TablePayload {
  rows: unknown[];
  total: number;
  page?: number;
  page_size?: number;
}

function sendJson(res: Response, status: number, body: unknown): void {
  res.status(status).set(NO_STORE).type('application/json').send(`${JSON.stringify(body, null, 2)}\n`);
}

/** A failed read, answered with the resolver's own reason and the matching HTTP status. */
function sendFailure(res: Response, first: GraphQLFormattedError | undefined): void {
  const code = first?.extensions?.code;
  const known = typeof code === 'string';
  sendJson(res, known ? (ERROR_STATUS[code] ?? 500) : 500, {
    error: known ? code : 'INTERNAL',
    message: first?.message ?? 'The table could not be read. Try again.',
  });
}

/** The rows plus everything a caller needs to walk the pages. */
async function sendPage(
  req: Request,
  res: Response,
  table: string,
  variables: Record<string, unknown>,
  payload: TablePayload
): Promise<void> {
  const query = variables.query as { page?: number; page_size?: number } | undefined;
  const page = payload.page ?? query?.page ?? 1;
  const pageSize = payload.page_size ?? query?.page_size ?? payload.rows.length;
  const totalPages = pageSize > 0 ? Math.ceil(payload.total / pageSize) : 0;
  const { serverUrl } = await getUrlConfigs();
  sendJson(res, 200, {
    table,
    page,
    page_size: pageSize,
    total: payload.total,
    total_pages: totalPages,
    next_page_url: page < totalPages ? pageUrl(serverUrl, req, page + 1) : null,
    previous_page_url: page > 1 ? pageUrl(serverUrl, req, page - 1) : null,
    rows: payload.rows,
  });
}

/** Never rejects: a thrown await answers 500 instead of taking the process down. */
function guard(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res) => {
    handler(req, res).catch((error: unknown) => {
      logs.server.error('tableApi', 'request', { error, path: req.path });
      sendJson(res, 500, { error: 'INTERNAL', message: 'The table could not be read. Try again.' });
    });
  };
}

export function buildTableApiRouter({ apollo, typeDefs, resolvers }: TableApiDeps) {
  const router = Router();
  const operations = createTableOperations(typeDefs, resolvers);

  router.get(
    '/:table',
    guard(async (req, res) => {
      const user = await tableApiService.authenticate(tokenOf(req));
      if (!user) {
        sendJson(res, 401, {
          error: 'UNAUTHENTICATED',
          message: `Send your table API token as ?${TOKEN_PARAM}= or the ${TOKEN_HEADER} header. Generate it in Tech → Table API → Settings.`,
        });
        return;
      }
      const table = String(req.params.table);
      const operation = operations.get(table);
      if (!operation) {
        sendJson(res, 404, { error: 'NOT_FOUND', message: `"${table}" is not a table query.` });
        return;
      }
      let variables: Record<string, unknown>;
      try {
        variables = variablesOf(req, operation);
      } catch (error) {
        sendJson(res, 400, { error: 'BAD_USER_INPUT', message: (error as Error).message });
        return;
      }
      const contextValue: GraphQLContext = {
        req,
        res,
        user,
        device_id: null,
        noRedis: true,
        isClientGone: watchClientPresence(res),
      };
      const response = await apollo.executeOperation(
        { query: operation.document, operationName: operation.operationName, variables },
        { contextValue }
      );
      if (response.body.kind !== 'single') throw new Error('Unexpected incremental response');
      const { data, errors } = response.body.singleResult;
      const payload = (data as Record<string, TablePayload | null> | null | undefined)?.[table];
      if (errors?.length || !payload) {
        sendFailure(res, errors?.[0]);
        return;
      }
      await sendPage(req, res, table, variables, payload);
    })
  );

  return router;
}
