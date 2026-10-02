import { GraphQLError } from 'graphql';
import type { Model } from 'mongoose';
import type { AuthUser } from '@context';
import { requestIdentity } from '@observability/requestIdentity';
import { captureTableScope, runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { onePage, runAs, tableScopeDocument } from '@modules/platform/backgroundJob/bulkDelete.operations';
import { actorOf, parseVariables } from '@modules/platform/backgroundJob/backgroundJob.service';
import { findInScope } from '@modules/platform/backgroundJob/bulkDelete.runner';
import { TableChangeLogModel, type ITableChangeLog } from './tableChangeLog.model';

/**
 * A table's change log, as the person looking at that table may see it.
 *
 * The table is named by its `<name>Table` query and the variables its view
 * sends. That read is RUN AS THE CALLER first: its resolver's role check is
 * what decides they may see this history at all, and the filter it applies
 * (their own clubs, a status tab, their search) is what decides WHICH records'
 * history — the log of a row the person is not shown is not shown either.
 */

/** A view narrower than its collection lists at most this many records' history. */
const MAX_SCOPED_RECORDS = 10_000;

const CONFIG: TableEntityConfig = {
  searchFields: ['actor_name', 'actor_email', 'field', 'old_value', 'new_value', 'doc_id'],
  sortFields: {
    created_at: 'created_at',
    action: 'action',
    field: 'field',
    actor_name: 'actor_name',
    actor_email: 'actor_email',
    source: 'source',
    doc_id: 'doc_id',
  },
  filterFields: {
    action: { type: 'enum' },
    field: { type: 'string' },
    old_value: { type: 'string' },
    new_value: { type: 'string' },
    actor_name: { type: 'string' },
    actor_email: { type: 'string' },
    source: { type: 'enum' },
    doc_id: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

export interface TableChangeLogsArgs {
  table: string;
  /** The table query's variables, as JSON text — the schema has no JSON scalar. */
  variables: string;
  query?: TableQueryInput | null;
}

const toPub = (row: ITableChangeLog) => ({
  id: String(row._id),
  collection_name: row.collection_name,
  doc_id: row.doc_id,
  action: row.action,
  field: row.field,
  old_value: row.old_value,
  new_value: row.new_value,
  actor_user_id: row.actor_user_id ? String(row.actor_user_id) : null,
  actor_name: row.actor_name,
  actor_email: row.actor_email,
  actor_roles: row.actor_roles,
  source: row.source,
  ip: row.ip,
  user_agent: row.user_agent,
  created_at: row.created_at.toISOString(),
});

export const tableChangeLogService = {
  async logs(user: AuthUser, args: TableChangeLogsArgs) {
    const document = tableScopeDocument(args.table);
    if (!document) throw badInput('This table has no change log.');
    const variables = parseVariables(args.variables);
    const identity = requestIdentity.current() ?? { user: actorOf(user) };
    // Throws the table resolver's own refusal when the caller may not read it.
    const scope = await captureTableScope(() => runAs(document, onePage(variables), actorOf(user), identity));
    if (!scope) throw badInput('This table is not read from a single collection, so it keeps no change log.');

    const model = scope.model as unknown as Model<unknown>;
    const base: Record<string, unknown> = { collection_name: model.collection.collectionName };
    const [inView, inCollection] = await Promise.all([
      findInScope(scope, scope.filter).countDocuments(),
      model.estimatedDocumentCount(),
    ]);
    if (inView < inCollection) {
      const rows: Array<{ _id: unknown }> = await findInScope(scope, scope.filter)
        .select('_id')
        .limit(MAX_SCOPED_RECORDS)
        .lean();
      base.doc_id = { $in: rows.map((row) => String(row._id)) };
    }

    const page = await runTableQuery<ITableChangeLog>(TableChangeLogModel, base, args.query, CONFIG);
    return { rows: page.docs.map(toPub), total: page.total, page: page.page, page_size: page.page_size };
  },
};
