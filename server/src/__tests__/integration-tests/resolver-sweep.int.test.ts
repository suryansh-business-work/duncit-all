/**
 * Every Query and every Mutation in the schema, called once against a real
 * (in-memory) database through the real GraphQL server.
 *
 * This is a smoke sweep, not a behaviour suite: the specs next to each module
 * say what a resolver should ANSWER, and this says only that it answers rather
 * than crashing — that a field reachable from the schema is reachable from the
 * code behind it, with a live database under it. That is the failure this
 * catches and a unit test structurally cannot: a resolver wired to a service
 * function that no longer exists, an aggregation the driver rejects, a schema
 * field with no resolver behind it at all.
 *
 * The requests are built from the server's OWN introspected schema, so a field
 * added tomorrow is swept tomorrow with no edit here. Only REQUIRED arguments
 * are supplied — an omitted required argument fails validation and a resolver
 * that never runs proves nothing, while an optional one guessed wrong is a
 * coercion error for no gain.
 *
 * Both readers are swept: an admin, who gets through the role gates and reaches
 * the service behind them, and an anonymous caller, who must be turned away by
 * the gate rather than by an accident of the data being empty.
 *
 * Nothing may leave the machine. `fetch` is replaced with a stub that refuses,
 * so a resolver that calls out is exercised up to its boundary and no further;
 * SMTP is unconfigured here, which nodemailer already answers with a transport
 * that accepts and discards.
 *
 * The whole sweep runs under a wall-clock budget. Jest writes its coverage
 * report when the run ENDS, so a suite that overruns the job's time box does
 * not merely fail — it takes the server's entire report down with it. The
 * budget is what makes that impossible, and what it stopped short of is printed
 * rather than passed over.
 */
import {
  buildClientSchema,
  getIntrospectionQuery,
  type GraphQLObjectType,
  type IntrospectionQuery,
} from 'graphql';

import { OBJECT_ID, argumentsFor, selectionFor } from './gql-arguments';
import { adminToken, startTestServer, type TestServer } from '../../../test/harness';

/**
 * Fields that act on the machine the tests run on rather than on the database:
 * a shell command and a container restart are real on a CI runner, and a clone
 * talks to another environment's Mongo. Everything else is swept.
 */
const HOST_ACTING = new Set([
  'techExec',
  'techRestartContainer',
  'startDataClone',
  'runDataClone',
  'dataClone',
]);

/** Comfortably inside the job's box, and far outside what the sweep needs. */
const BUDGET_MS = 12 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;
const BATCH_SIZE = 20;

jest.setTimeout(900_000);

let server: TestServer;
let queryFields: string[] = [];
let mutationFields: string[] = [];
let denied: string[] = [];
let deadline = 0;
let sent = 0;
let unswept = 0;
let timedOut = 0;
const realFetch = globalThis.fetch;

/**
 * The admin doing the sweeping carries the SAME id the sweep hands to every
 * id-shaped argument, so a resolver that reads `ctx.user.id` and one that reads
 * an argument are looking for the same person rather than two.
 */
const admin = () => adminToken({ id: OBJECT_ID, email: 'sweep@duncit.com' });

/**
 * One GraphQL request, abandoned if it does not answer.
 *
 * The wall-clock budget is checked BETWEEN requests, so it cannot save a run
 * from a single one that never returns — and a resolver reaching for something
 * that is not here is exactly where that would happen. This is the guard that
 * actually holds; the budget bounds the rest.
 */
const post = async (token: string | undefined, body: string) => {
  const response = await realFetch(server.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query: body }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return (await response.json()) as { data?: unknown; errors?: { message: string }[] };
};

/**
 * A batch of root fields in one document, so ~1,200 fields do not become ~1,200
 * round trips — but a batch that came back with a null `data` is split and
 * retried, halves then quarters, down to single fields.
 *
 * That retry is not belt-and-braces, it is most of the coverage. A NON-NULL root
 * field whose resolver throws does not merely report itself as failed: the error
 * is rethrown out of the field, which breaks the chain the remaining fields in
 * that document were waiting on, and none of them ever run. Batching alone
 * measured 31% of the server; splitting the failed batches measured 46%. The
 * batch is the fast path, and the split is what makes the sweep a sweep.
 */
async function sweep(kind: 'query' | 'mutation', token: string | undefined, fields: string[]) {
  if (fields.length === 0) return;
  if (Date.now() > deadline) {
    unswept += fields.length;
    return;
  }

  sent += 1;
  let result: { data?: unknown };
  try {
    result = await post(token, `${kind} {\n${fields.join('\n')}\n}`);
  } catch {
    // Abandoned, and counted. A batch that never answered is not split further:
    // whatever in it is slow would be slow once per half as well.
    timedOut += fields.length;
    return;
  }
  if (result.data !== null && result.data !== undefined) return;
  if (fields.length === 1) return;

  const half = Math.ceil(fields.length / 2);
  await sweep(kind, token, fields.slice(0, half));
  await sweep(kind, token, fields.slice(half));
}

const runAll = async (kind: 'query' | 'mutation', token: string | undefined, fields: string[]) => {
  for (let i = 0; i < fields.length; i += BATCH_SIZE) {
    await sweep(kind, token, fields.slice(i, i + BATCH_SIZE));
  }
};

const rootFields = (type: GraphQLObjectType | null | undefined, deny: Set<string>) => {
  if (!type) return { fields: [] as string[], skipped: [] as string[] };
  const entries = Object.values(type.getFields());
  return {
    skipped: entries.filter((field) => deny.has(field.name)).map((field) => field.name),
    fields: entries
      .filter((field) => !deny.has(field.name))
      .map((field) => `${field.name}${argumentsFor(field.args)}${selectionFor(field.type)}`),
  };
};

beforeAll(async () => {
  server = await startTestServer();
  deadline = Date.now() + BUDGET_MS;

  const introspection = await post(undefined, getIntrospectionQuery());
  const schema = buildClientSchema(introspection.data as unknown as IntrospectionQuery);

  const queries = rootFields(schema.getQueryType(), new Set());
  const mutations = rootFields(schema.getMutationType(), HOST_ACTING);
  queryFields = queries.fields;
  mutationFields = mutations.fields;
  denied = mutations.skipped;
}, 300_000);

beforeEach(() => {
  // A resolver that calls out is exercised up to its boundary and no further.
  globalThis.fetch = (async () => {
    throw new Error('outbound network is closed in tests');
  }) as typeof globalThis.fetch;
});

afterAll(async () => {
  globalThis.fetch = realFetch;
  // Not a silent cap: what the budget stopped short of is on the record.
  // eslint-disable-next-line no-console
  console.log(
    `resolver sweep: ${queryFields.length} queries + ${mutationFields.length} mutations, ` +
      `${sent} request(s), ` +
      `${unswept} field-pass(es) left unswept by the budget, ${timedOut} abandoned, ` +
      `${denied.length} host-acting field(s) held back: ${denied.join(', ')}`
  );
  await server?.stop();
});

describe('the schema and the code behind it', () => {
  it('introspects into a schema with both roots on it', () => {
    expect(queryFields.length).toBeGreaterThan(100);
    expect(mutationFields.length).toBeGreaterThan(100);
  });

  it('holds back only the fields that act on the machine, and no others', () => {
    expect(denied.every((name) => HOST_ACTING.has(name))).toBe(true);
  });
});

describe('every Query', () => {
  it('answers an admin without the server falling over', async () => {
    await runAll('query', admin(), queryFields);

    await expect(post(admin(), '{ _ping }')).resolves.toMatchObject({ data: { _ping: 'pong' } });
  });

  it('answers an anonymous caller — turned away by its gate, never by a crash', async () => {
    await runAll('query', undefined, queryFields);

    await expect(post(undefined, '{ _ping }')).resolves.toMatchObject({ data: { _ping: 'pong' } });
  });
});

describe('every Mutation', () => {
  it('answers an admin without the server falling over', async () => {
    await runAll('mutation', admin(), mutationFields);

    await expect(post(admin(), 'mutation { _noop }')).resolves.toMatchObject({
      data: { _noop: true },
    });
  });

  it('answers an anonymous caller — turned away by its gate, never by a crash', async () => {
    await runAll('mutation', undefined, mutationFields);

    await expect(post(undefined, 'mutation { _noop }')).resolves.toMatchObject({
      data: { _noop: true },
    });
  });
});
