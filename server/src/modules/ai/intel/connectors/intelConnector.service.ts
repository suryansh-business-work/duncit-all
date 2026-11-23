import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { validate } from '@utils/validate';
import type { IntelActor } from '../access/intel.access';
import { writeAudit } from '../audit/intelAudit.service';
import { CONNECTOR_ENV_CATEGORY, type IntelConnectorKind, type ToolClass } from '../intel.constants';
import { removeConnectorDocuments } from '../index/intel.indexer';
import { DRIVERS } from '../sync/intel.drivers';
import { scheduleSync } from '../sync/intelSync.queue';
import { IntelSyncRunModel } from '../sync/intelSyncRun.model';
import { listBranches } from './github/github.connector';
import { entryOptions, resolveEntry } from './intel.credentials';
import { CONFIG_SCHEMAS, connectorInputSchema } from './intelConnector.schema';
import { IntelConnectorModel, type IIntelConnector } from './intelConnector.model';
import { discoverTools } from './mcp/mcp.connector';
import { listCollections } from './mongo/mongo.connector';
import { listChannels } from './slack/slack.connector';

/**
 * Connector management (Admin and above). Credentials are chosen from Tech
 * portal entries by id; nothing secret is accepted or returned here.
 */

const notFound = () => new GraphQLError('Connector not found', { extensions: { code: 'NOT_FOUND' } });

export const toConnectorDto = (c: IIntelConnector, entryName = '') => ({
  id: String(c._id),
  kind: c.kind,
  name: c.name,
  environment: c.environment,
  env_entry_id: c.env_entry_id,
  env_entry_name: entryName,
  enabled: c.enabled,
  config: JSON.stringify(c.config ?? {}),
  tools: c.tools.map((t) => ({ ...t, effective: t.override ?? t.class })),
  status: c.status,
  sync_paused: c.sync_paused,
  last_sync_at: c.last_sync_at,
  last_success_at: c.last_success_at,
  last_error: c.last_error,
  indexed_count: c.indexed_count,
  created_at: c.created_at,
  updated_at: c.updated_at,
});

async function load(id: string): Promise<IIntelConnector> {
  if (!Types.ObjectId.isValid(id)) throw notFound();
  const c = await IntelConnectorModel.findById(id).lean();
  if (!c) throw notFound();
  return c;
}

async function entryFor(c: IIntelConnector) {
  const entry = await resolveEntry(CONNECTOR_ENV_CATEGORY[c.kind], c.env_entry_id);
  if (!entry) throw new GraphQLError('The Tech portal entry this connector uses is missing or inactive. Pick another entry.', { extensions: { code: 'BAD_USER_INPUT' } });
  return entry;
}

async function parse(input: unknown) {
  const base = await validate(connectorInputSchema, input);
  const config = await validate(CONFIG_SCHEMAS[base.kind], base.config);
  if (!(await resolveEntry(CONNECTOR_ENV_CATEGORY[base.kind], base.env_entry_id))) {
    throw new GraphQLError('Validation failed', { extensions: { code: 'BAD_USER_INPUT', errors: ['env_entry_id: Choose an active Tech portal entry of the right kind'] } });
  }
  return { ...base, config };
}

const audit = (actor: IntelActor, action: string, c: Pick<IIntelConnector, 'name' | 'environment'>, detail = '', status: 'OK' | 'FAILED' = 'OK') =>
  writeAudit({ type: 'CONNECTOR', action, status, userId: actor.user.id, level: actor.level, environment: c.environment, target: c.name, detail });

export const intelConnectorService = {
  async list(kind?: IntelConnectorKind | null) {
    const rows = await IntelConnectorModel.find(kind ? { kind } : {}).sort({ kind: 1, name: 1 }).lean();
    const names = new Map((await Promise.all([...new Set(rows.map((r) => r.kind))].map((k) => entryOptions(CONNECTOR_ENV_CATEGORY[k])))).flat().map((e) => [e.id, e.name]));
    return rows.map((r) => toConnectorDto(r, names.get(r.env_entry_id) ?? ''));
  },

  async get(id: string) {
    const c = await load(id);
    return toConnectorDto(c, (await resolveEntry(CONNECTOR_ENV_CATEGORY[c.kind], c.env_entry_id))?.name ?? '');
  },

  entryOptions: (kind: IntelConnectorKind) => entryOptions(CONNECTOR_ENV_CATEGORY[kind]),

  /** The OpenAI entries for Settings › OpenAI API (not a connector kind). */
  entryOptionsFor: (category: 'OPENAI') => entryOptions(category),

  async create(actor: IntelActor, input: unknown) {
    const data = await parse(input);
    if (await IntelConnectorModel.exists({ kind: data.kind, name: data.name })) throw new GraphQLError('Validation failed', { extensions: { code: 'BAD_USER_INPUT', errors: ['name: A connector with this name already exists'] } });
    const created = await IntelConnectorModel.create({ ...data, created_by: actor.user.id, updated_by: actor.user.id });
    await audit(actor, 'connector.create', created, `${data.kind} via entry ${data.env_entry_id}`);
    if (created.enabled) await scheduleSync(created, 'FULL', 'CREATE', actor.user.id);
    return this.get(String(created._id));
  },

  async update(actor: IntelActor, id: string, input: unknown) {
    const before = await load(id);
    const data = await parse({ ...(input as object), kind: before.kind });
    const clash = await IntelConnectorModel.exists({ kind: data.kind, name: data.name, _id: { $ne: before._id } });
    if (clash) throw new GraphQLError('Validation failed', { extensions: { code: 'BAD_USER_INPUT', errors: ['name: A connector with this name already exists'] } });
    await IntelConnectorModel.updateOne({ _id: before._id }, { $set: { name: data.name, environment: data.environment, env_entry_id: data.env_entry_id, enabled: data.enabled, config: data.config, updated_by: actor.user.id } });
    await audit(actor, 'connector.update', { name: data.name, environment: data.environment }, JSON.stringify(data.config).slice(0, 1500));
    return this.get(id);
  },

  async remove(actor: IntelActor, id: string): Promise<boolean> {
    const c = await load(id);
    const removed = await removeConnectorDocuments(id);
    await IntelConnectorModel.deleteOne({ _id: c._id });
    await audit(actor, 'connector.delete', c, `${removed} indexed document(s) removed`);
    return true;
  },

  async setEnabled(actor: IntelActor, id: string, enabled: boolean) {
    const c = await load(id);
    await IntelConnectorModel.updateOne({ _id: c._id }, { $set: { enabled, updated_by: actor.user.id } });
    await audit(actor, enabled ? 'connector.enable' : 'connector.disable', c);
    return this.get(id);
  },

  async setPaused(actor: IntelActor, id: string, paused: boolean) {
    const c = await load(id);
    await IntelConnectorModel.updateOne({ _id: c._id }, { $set: { sync_paused: paused } });
    await audit(actor, paused ? 'connector.pause' : 'connector.resume', c);
    return this.get(id);
  },

  async test(actor: IntelActor, id: string) {
    const c = await load(id);
    const result = await DRIVERS[c.kind].test(c, await entryFor(c));
    if (!result.ok) await IntelConnectorModel.updateOne({ _id: c._id }, { $set: { status: 'ERROR', last_error: result.message.slice(0, 500) } });
    else if (c.status === 'ERROR') await IntelConnectorModel.updateOne({ _id: c._id }, { $set: { status: 'OK', last_error: '' } });
    await audit(actor, 'connector.test', c, result.message, result.ok ? 'OK' : 'FAILED');
    return result;
  },

  async syncNow(actor: IntelActor, id: string, full: boolean): Promise<string> {
    const c = await load(id);
    if (!c.enabled) throw new GraphQLError('Enable the connector before syncing it.', { extensions: { code: 'BAD_USER_INPUT' } });
    return scheduleSync(c, full ? 'FULL' : 'INCREMENTAL', 'MANUAL', actor.user.id);
  },

  async runs(connectorId: string | null | undefined, limit = 30) {
    const rows = await IntelSyncRunModel.find(connectorId ? { connector_id: connectorId } : {}).sort({ created_at: -1 }).limit(Math.min(limit, 100)).lean();
    return rows.map((r) => ({ ...r, id: String(r._id) }));
  },

  /** Pickers for the connector forms — read with the selected entry, before or after saving. */
  async collections(kind: 'MONGODB', entryId: string, database: string) {
    const entry = await resolveEntry(CONNECTOR_ENV_CATEGORY[kind], entryId);
    if (!entry) throw notFound();
    return listCollections({ config: { database } } as unknown as IIntelConnector, entry);
  },

  async slackChannels(entryId: string) {
    const entry = await resolveEntry('SLACK', entryId);
    if (!entry) throw notFound();
    return listChannels(entry);
  },

  async githubBranches(entryId: string, owner: string, repo: string) {
    const entry = await resolveEntry('GITHUB', entryId);
    if (!entry) throw notFound();
    return listBranches(entry, owner, repo);
  },

  async discover(actor: IntelActor, id: string) {
    const c = await load(id);
    if (c.kind !== 'MCP') throw new GraphQLError('Only MCP connectors have tools', { extensions: { code: 'BAD_USER_INPUT' } });
    const tools = await discoverTools(c, await entryFor(c));
    await audit(actor, 'connector.discover', c, `${tools.length} tool(s)`);
    return this.get(id);
  },

  async setToolClass(actor: IntelActor, id: string, tool: string, cls: ToolClass | null) {
    const c = await load(id);
    const res = await IntelConnectorModel.updateOne({ _id: c._id, 'tools.name': tool }, { $set: { 'tools.$.override': cls } });
    if (res.matchedCount === 0) throw notFound();
    await audit(actor, 'connector.tool_class', c, `${tool} → ${cls ?? 'auto'}`);
    return this.get(id);
  },
};
