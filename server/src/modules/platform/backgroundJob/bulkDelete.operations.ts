import {
  execute,
  getNamedType,
  isLeafType,
  isNonNullType,
  parse,
  validate,
  type DocumentNode,
  type GraphQLSchema,
} from 'graphql';
import type { GraphQLContext } from '@context';
import { logs } from '@observability/log';
import { requestIdentity, type RequestIdentity } from '@observability/requestIdentity';
import { captureTableScope, type TableScope } from '@utils/table-query';
import { currentSchema } from '@modules/platform/graphqlMonitor/graphqlMonitor.plugin';
import { fieldInvocation } from '@modules/platform/tableApi/tableApi.operation';
import { BULK_DELETE_TARGETS } from './bulkDelete.targets';
import type { JobActor } from './backgroundJob.model';

/**
 * A registered table, turned into the two operations a bulk delete runs:
 *
 * - `scope` — the table's own read, selecting only `total`. Running it is what
 *   authorizes the caller (the resolver's role check) and what captures the
 *   collection + filter the table showed them.
 * - `remove` — the table's own single-row delete mutation. Every row goes
 *   through it, so a bulk delete keeps each entity's guards, cascades and
 *   change log exactly as the row's bin button has them.
 *
 * Both run through `graphql.execute` against Apollo's schema rather than
 * through Apollo itself: a job is not a request, so the rate limiter, the
 * response cache and the request monitor have nothing to say about it.
 */
export interface BulkDeleteOperations {
  table: string;
  roles: readonly string[];
  idArg: string;
  scope: DocumentNode;
  remove: DocumentNode;
}

/** The context a resolver sees when a job, not a request, calls it. */
export type JobContext = Omit<GraphQLContext, 'req' | 'res'>;

export function jobContext(actor: JobActor): JobContext {
  return {
    user: { id: actor.id, email: actor.email, roles: actor.roles },
    device_id: null,
    noRedis: true,
    isClientGone: () => false,
  };
}

const operations = new Map<string, BulkDeleteOperations | null>();

function buildDocument(schema: GraphQLSchema, text: string): DocumentNode | null {
  const document = parse(text);
  const errors = validate(schema, document);
  if (errors.length === 0) return document;
  logs.server.error('backgroundJob', 'buildDocument', { msg: errors[0]?.message, text });
  return null;
}

function build(schema: GraphQLSchema, table: string): BulkDeleteOperations | null {
  const target = BULK_DELETE_TARGETS[table];
  const tableField = schema.getQueryType()?.getFields()[table];
  const mutation = schema.getMutationType()?.getFields()[target.mutation];
  const idArg = target.idArg ?? 'id';
  // The job can only pass the row id, so any other required argument makes the
  // mutation uncallable from here.
  const callable = mutation?.args.every(
    (arg) => arg.name === idArg || !isNonNullType(arg.type) || arg.defaultValue !== undefined
  );
  if (!tableField || !mutation || !callable || !mutation.args.some((arg) => arg.name === idArg)) {
    logs.server.error('backgroundJob', 'target', { msg: 'Unusable bulk delete target', table });
    return null;
  }
  const read = fieldInvocation(tableField);
  const write = fieldInvocation(mutation);
  const selection = isLeafType(getNamedType(mutation.type)) ? '' : ' { __typename }';
  const scope = buildDocument(schema, `query BulkDeleteScope${read.signature} { ${read.call} { total } }`);
  const remove = buildDocument(schema, `mutation BulkDeleteRow${write.signature} { ${write.call}${selection} }`);
  if (!scope || !remove) return null;
  return { table, roles: target.roles, idArg, scope, remove };
}

/**
 * The operations for one table, or null when it is not registered or its
 * registration no longer matches the schema. Built once per process.
 */
export function bulkDeleteOperations(table: string): BulkDeleteOperations | null {
  if (!Object.hasOwn(BULK_DELETE_TARGETS, table)) return null;
  const schema = currentSchema();
  if (!schema) return null;
  if (!operations.has(table)) operations.set(table, build(schema, table));
  return operations.get(table) ?? null;
}

/** Run one operation as the job's actor; the first GraphQL error is thrown. */
export async function runAs(
  document: DocumentNode,
  variables: Record<string, unknown>,
  actor: JobActor,
  identity: RequestIdentity
): Promise<void> {
  const schema = currentSchema();
  if (!schema) throw new Error('The GraphQL schema is not ready yet.');
  const result = await requestIdentity.run(identity, () =>
    execute({ schema, document, variableValues: variables, contextValue: jobContext(actor) })
  );
  const first = result.errors?.[0];
  if (first) throw first;
}

/** The table's variables, asking for the smallest page — only the scope is wanted. */
function onePage(variables: Record<string, unknown>): Record<string, unknown> {
  const query = (variables.query ?? {}) as Record<string, unknown>;
  return { ...variables, query: { ...query, page: 1, page_size: 1 } };
}

/**
 * The collection and filter the table shows this actor, captured from the
 * table's own read. Throws the resolver's refusal when they may not read it,
 * and a plain reason when the table is not backed by one collection.
 */
export async function captureScope(
  ops: BulkDeleteOperations,
  variables: Record<string, unknown>,
  actor: JobActor,
  identity: RequestIdentity
): Promise<TableScope> {
  const scope = await captureTableScope(() => runAs(ops.scope, onePage(variables), actor, identity));
  if (!scope) throw new Error('This table is not read from a single collection, so it cannot be deleted in bulk.');
  return scope;
}
