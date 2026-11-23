import { fenceUntrusted } from '@modules/ai/askDuncit/guard/askDuncit.guard';
import { writeAudit } from '../../audit/intelAudit.service';
import { propose } from '../../approvals/intelApproval.service';
import { resolveEntry } from '../../connectors/intel.credentials';
import type { IIntelConnector } from '../../connectors/intelConnector.model';
import { canRead, canWrite, databaseName, permittedCollections, previewWrite, readQuery, type ReadRequest } from '../../connectors/mongo/mongo.connector';
import { WRITE_OPERATIONS, type WriteOperation } from '../../connectors/mongo/mongo.safety';
import { INTEL_LIMITS } from '../../intel.constants';
import type { TurnContext } from '../intel.context';
import { failed, str, type IntelTool, type ToolOutcome } from './intel.tool.types';

/**
 * Live MongoDB access. Reads run at once — capped, time-limited, redacted —
 * on connections this turn may use. Writes NEVER run here: mongo_write only
 * creates an approval request with a preview, which a permitted person must
 * approve (production: a second person, by default).
 */

function connectorFor(ctx: TurnContext, id: unknown): IIntelConnector | null {
  return ctx.connectors.find((c) => c.kind === 'MONGODB' && String(c._id) === String(id)) ?? null;
}

const notAllowed = (name: string) => failed(name, 'Database', 'That connection is not available in this conversation (environment, source or access level).', 'DENIED');

export const mongoQueryTool: IntelTool = {
  def: {
    type: 'function',
    function: {
      name: 'mongo_query',
      description: 'Read live data from a permitted MongoDB collection. Use list_connectors first for connector ids and permitted collections. Filters and pipelines use MongoDB Extended JSON ({"$oid": "..."}, {"$date": "..."}). At most 50 rows.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: { type: 'string' },
          collection: { type: 'string' },
          operation: { type: 'string', enum: ['find', 'aggregate', 'count'] },
          filter: { type: 'object' },
          projection: { type: 'object' },
          sort: { type: 'object' },
          limit: { type: 'integer', minimum: 1, maximum: 50 },
          pipeline: { type: 'array', items: { type: 'object' } },
        },
        required: ['connector_id', 'collection', 'operation'],
      },
    },
  },
  available: (ctx) => ctx.connectors.some((c) => c.kind === 'MONGODB' && canRead(c)),
  async run(ctx, args): Promise<ToolOutcome> {
    const connector = connectorFor(ctx, args.connector_id);
    if (!connector || !canRead(connector)) return notAllowed('mongo_query');
    const entry = await resolveEntry('MONGODB', connector.env_entry_id);
    if (!entry) return failed('mongo_query', connector.name, 'The Tech portal entry for this connection is missing.');
    const title = `${connector.name} · ${str(args.collection, 80)} (${connector.environment.toLowerCase()})`;
    try {
      const out = await readQuery(connector, entry, args as unknown as ReadRequest);
      await writeAudit({ type: 'TOOL', action: 'mongo.read', userId: ctx.actor.user.id, level: ctx.actor.level, environment: connector.environment, target: title, detail: JSON.stringify(args).slice(0, 1500) });
      const body = JSON.stringify(out.count === undefined ? { rows: out.rows } : { count: out.count }).slice(0, INTEL_LIMITS.toolResultChars);
      return { content: fenceUntrusted(`mongodb:${connector.name}`, body), call: { name: 'mongo_query', title, status: 'OK', summary: out.count === undefined ? `${out.rows.length} row(s)` : `count ${out.count}` } };
    } catch (error) {
      return failed('mongo_query', title, error instanceof Error ? error.message : 'The query failed');
    }
  },
};

export const mongoWriteTool: IntelTool = {
  def: {
    type: 'function',
    function: {
      name: 'mongo_write',
      description: 'PROPOSE a change to a permitted MongoDB collection. Nothing runs now: it creates an approval request with a preview that a person must approve. Updates must use operators ($set, $inc…); a non-empty filter is required for updates and deletes.',
      parameters: {
        type: 'object',
        properties: {
          connector_id: { type: 'string' },
          collection: { type: 'string' },
          operation: { type: 'string', enum: [...WRITE_OPERATIONS] },
          filter: { type: 'object' },
          payload: { type: 'object', description: 'The document (insertOne) or the update operators (updateOne/updateMany).' },
          reason: { type: 'string', description: 'Why, in one sentence, as the person asked.' },
        },
        required: ['connector_id', 'collection', 'operation', 'reason'],
      },
    },
  },
  available: (ctx) => ctx.policy.can_request_writes && ctx.connectors.some((c) => c.kind === 'MONGODB' && canWrite(c)),
  async run(ctx, args): Promise<ToolOutcome> {
    const connector = connectorFor(ctx, args.connector_id);
    if (!connector || !canWrite(connector) || !ctx.policy.can_request_writes) return notAllowed('mongo_write');
    const entry = await resolveEntry('MONGODB', connector.env_entry_id);
    if (!entry) return failed('mongo_write', connector.name, 'The Tech portal entry for this connection is missing.');
    const collection = str(args.collection, 120);
    const operation = str(args.operation, 20) as WriteOperation;
    const request = { collection, operation, filter: args.filter ?? {}, payload: args.payload ?? {} };
    const title = `${connector.name} · ${collection}: ${operation}`;
    try {
      const preview = await previewWrite(connector, entry, request);
      const impact = operation === 'insertOne' ? `Inserts 1 document into ${collection}.` : `${operation} on ${collection}: ${preview.matched} document(s) match${operation.endsWith('One') && preview.matched > 1 ? ' (only the first is changed)' : ''}.`;
      const approval = await propose(ctx.actor, {
        kind: 'MONGO_WRITE',
        connectorId: String(connector._id),
        conversationId: ctx.conversationId,
        messageId: ctx.messageId,
        action: operation,
        toolClass: operation.startsWith('delete') ? 'DESTRUCTIVE' : 'WRITE',
        collection,
        database: databaseName(connector, entry),
        request,
        preview,
        impact,
        reason: str(args.reason, 500),
      });
      return {
        approvalId: String(approval._id),
        content: JSON.stringify({ status: 'awaiting_approval', approval_id: String(approval._id), environment: approval.environment, impact, four_eyes: approval.four_eyes }),
        call: { name: 'mongo_write', title, status: 'AWAITING_APPROVAL', summary: impact },
      };
    } catch (error) {
      return failed('mongo_write', title, error instanceof Error ? error.message : 'The change could not be prepared');
    }
  },
};

/** list_connectors — what this conversation can reach, so the model never guesses ids. */
export const listConnectorsTool: IntelTool = {
  def: {
    type: 'function',
    function: { name: 'list_connectors', description: 'List the database, MCP, Slack, Gmail and GitHub connectors available in this conversation, with ids, environment and permitted collections.', parameters: { type: 'object', properties: {} } },
  },
  available: (ctx) => ctx.connectors.length > 0,
  async run(ctx) {
    const rows = ctx.connectors.map((c) => ({
      id: String(c._id),
      kind: c.kind,
      name: c.name,
      environment: c.environment,
      ...(c.kind === 'MONGODB' ? { access: c.config.access_mode, collections: permittedCollections(c) } : {}),
      ...(c.kind === 'MCP' ? { tools: c.tools.length } : {}),
    }));
    return { content: JSON.stringify({ connectors: rows }), call: { name: 'list_connectors', title: 'Connectors', status: 'OK', summary: `${rows.length} connector(s)` } };
  },
};
