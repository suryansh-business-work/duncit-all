import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { requireIntel } from '../access/intel.access';
import { listAudit, type AuditListArgs } from '../audit/intelAudit.service';
import { intelGmailAccounts } from '../connectors/gmail/gmailAccount.service';
import { ProviderError } from '../connectors/intel.http';
import { intelConnectorService } from '../connectors/intelConnector.service';
import { systemHealth } from '../health/intel.health';
import { indexDocuments, indexStats, usage } from '../health/intel.reports';
import { INDEX_SCOPES, INTEL_CONNECTOR_KINDS, TOOL_CLASSES, type IndexScope, type IntelConnectorKind, type ToolClass } from '../intel.constants';
import { openAiChatModels } from '../index/intel.models';
import { rebuildIndex } from '../index/intel.rebuild';
import { intelSettingsService } from '../settings/intelSettings.service';

/**
 * Settings, connectors, sync, index, health, audit and usage — INTEL_MANAGER
 * (Admin) and above. Access and security settings additionally need a Super
 * Admin (checked in the settings service).
 */

const admin = (ctx: GraphQLContext) => requireIntel(ctx, 'ADMIN');
const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

function kindOf(value: string): IntelConnectorKind {
  if (!(INTEL_CONNECTOR_KINDS as readonly string[]).includes(value)) throw badInput('Unknown connector kind');
  return value as IntelConnectorKind;
}

function parseJson(value: string, what: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw badInput(`${what} is not valid JSON`);
  }
}

/**
 * A picker that could not load says why, in words the form can show: a
 * provider's refusal (bad token, unknown repository, missing scope) is the
 * admin's to fix, so it is a BAD_USER_INPUT with the provider's message.
 */
async function picker<T>(what: string, load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof ProviderError) {
      const hint = error.status === 404 ? ' — check the owner and repository names and that the token can read them' : '';
      throw badInput(`${what}: ${error.message}${hint}`);
    }
    throw error;
  }
}

const settingsPayload = (s: { value: unknown; revision: number }) => ({ revision: s.revision, json: JSON.stringify(s.value) });

interface ConnectorInputArg {
  input: { kind: string; name: string; environment: string; env_entry_id: string; enabled?: boolean | null; config: string };
}

const connectorInput = (input: ConnectorInputArg['input']) => ({ ...input, enabled: input.enabled ?? true, config: parseJson(input.config, 'config') });

export const intelAdminResolvers = {
  Query: {
    intelSettings: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      admin(ctx);
      return settingsPayload(await intelSettingsService.getWithRevision());
    },
    intelEntryOptions: (_: unknown, args: { kind: string }, ctx: GraphQLContext) => {
      admin(ctx);
      if (args.kind === 'OPENAI') return intelConnectorService.entryOptionsFor('OPENAI');
      return intelConnectorService.entryOptions(kindOf(args.kind));
    },
    intelConnectors: (_: unknown, args: { kind?: string | null }, ctx: GraphQLContext) => {
      admin(ctx);
      return intelConnectorService.list(args.kind ? kindOf(args.kind) : null);
    },
    intelConnector: (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      admin(ctx);
      return intelConnectorService.get(args.id);
    },
    intelMongoCollections: (_: unknown, args: { entry_id: string; database?: string | null }, ctx: GraphQLContext) => {
      admin(ctx);
      return intelConnectorService.collections('MONGODB', args.entry_id, args.database ?? '');
    },
    intelSlackChannels: (_: unknown, args: { entry_id: string }, ctx: GraphQLContext) => {
      admin(ctx);
      return intelConnectorService.slackChannels(args.entry_id);
    },
    intelGithubBranches: (_: unknown, args: { entry_id: string; owner: string; repo: string }, ctx: GraphQLContext) => {
      admin(ctx);
      return picker(`GitHub could not list the branches of ${args.owner}/${args.repo}`, () => intelConnectorService.githubBranches(args.entry_id, args.owner, args.repo));
    },
    intelGithubRepos: (_: unknown, args: { entry_id: string }, ctx: GraphQLContext) => {
      admin(ctx);
      return picker('GitHub could not list the repositories', () => intelConnectorService.githubRepos(args.entry_id));
    },
    intelOpenAiModels: (_: unknown, __: unknown, ctx: GraphQLContext) => {
      admin(ctx);
      return picker('OpenAI could not list the models', openAiChatModels);
    },
    intelGmailAccounts: (_: unknown, __: unknown, ctx: GraphQLContext) => {
      admin(ctx);
      return intelGmailAccounts.list();
    },
    intelSyncRuns: (_: unknown, args: { connector_id?: string | null; limit?: number | null }, ctx: GraphQLContext) => {
      admin(ctx);
      return intelConnectorService.runs(args.connector_id, args.limit ?? 30);
    },
    intelIndexDocuments: (_: unknown, args: Parameters<typeof indexDocuments>[0], ctx: GraphQLContext) => {
      requireIntel(ctx);
      return indexDocuments(args);
    },
    intelIndexStats: (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireIntel(ctx);
      return indexStats();
    },
    intelHealth: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      admin(ctx);
      const h = await systemHealth();
      return {
        qdrant_configured: h.qdrant.configured,
        qdrant_reachable: h.qdrant.reachable,
        qdrant_error: h.qdrant.error,
        collections: h.qdrant.collections,
        queue_configured: h.queue.configured,
        openai_configured: h.openai.configured,
        openai_entry_selected: h.openai.entry_selected,
        failed_runs_24h: h.failed_runs_24h,
        pending_approvals: h.pending_approvals,
        connector_errors: h.connector_errors,
      };
    },
    intelAudit: (_: unknown, args: AuditListArgs, ctx: GraphQLContext) => {
      admin(ctx);
      return listAudit(args);
    },
    intelUsage: (_: unknown, args: { days?: number | null }, ctx: GraphQLContext) => {
      admin(ctx);
      return usage(args.days);
    },
  },
  Mutation: {
    intelUpdateSettings: async (_: unknown, args: { section: string; value: string; revision: number }, ctx: GraphQLContext) =>
      settingsPayload(await intelSettingsService.update(admin(ctx), args.section, parseJson(args.value, 'value'), args.revision)),
    intelCreateConnector: (_: unknown, args: ConnectorInputArg, ctx: GraphQLContext) => intelConnectorService.create(admin(ctx), connectorInput(args.input)),
    intelUpdateConnector: (_: unknown, args: ConnectorInputArg & { id: string }, ctx: GraphQLContext) => intelConnectorService.update(admin(ctx), args.id, connectorInput(args.input)),
    intelDeleteConnector: (_: unknown, args: { id: string }, ctx: GraphQLContext) => intelConnectorService.remove(admin(ctx), args.id),
    intelSetConnectorEnabled: (_: unknown, args: { id: string; enabled: boolean }, ctx: GraphQLContext) => intelConnectorService.setEnabled(admin(ctx), args.id, args.enabled),
    intelSetConnectorPaused: (_: unknown, args: { id: string; paused: boolean }, ctx: GraphQLContext) => intelConnectorService.setPaused(admin(ctx), args.id, args.paused),
    intelTestConnector: (_: unknown, args: { id: string }, ctx: GraphQLContext) => intelConnectorService.test(admin(ctx), args.id),
    intelSyncConnector: (_: unknown, args: { id: string; full?: boolean | null }, ctx: GraphQLContext) => intelConnectorService.syncNow(admin(ctx), args.id, Boolean(args.full)),
    intelDiscoverTools: (_: unknown, args: { id: string }, ctx: GraphQLContext) => intelConnectorService.discover(admin(ctx), args.id),
    intelSetToolClass: (_: unknown, args: { id: string; tool: string; class?: string | null }, ctx: GraphQLContext) => {
      const actor = admin(ctx);
      if (args.class && !(TOOL_CLASSES as readonly string[]).includes(args.class)) throw badInput('class must be READ, WRITE or DESTRUCTIVE');
      return intelConnectorService.setToolClass(actor, args.id, args.tool, (args.class as ToolClass | null) ?? null);
    },
    intelRebuildIndex: (_: unknown, args: { scope?: string | null }, ctx: GraphQLContext) => {
      const actor = admin(ctx);
      if (args.scope && !(INDEX_SCOPES as readonly string[]).includes(args.scope)) throw badInput('Unknown index scope');
      return rebuildIndex(actor, (args.scope as IndexScope | null) ?? null);
    },
    intelGmailConnectUrl: (_: unknown, __: unknown, ctx: GraphQLContext) => intelGmailAccounts.connectUrl(admin(ctx)),
    intelDisconnectGmail: (_: unknown, args: { id: string }, ctx: GraphQLContext) => intelGmailAccounts.disconnect(admin(ctx), args.id),
  },
};
