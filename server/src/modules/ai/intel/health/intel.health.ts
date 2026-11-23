import { resolveConfig } from '@services/openai/openai.client';
import type { IntelActor } from '../access/intel.access';
import { IntelApprovalModel } from '../approvals/intelApproval.model';
import { IntelConnectorModel, type IIntelConnector } from '../connectors/intelConnector.model';
import { INDEX_SCOPES, INTEL_CONNECTOR_KINDS, type IntelSource, type SourceState } from '../intel.constants';
import { intelOpenAiCredentials } from '../index/intel.openai';
import { collectionOf, qdrant, qdrantUrl } from '../index/qdrant.client';
import { IntelMediaModel } from '../media/intelMedia.model';
import { intelSettingsService } from '../settings/intelSettings.service';
import { IntelSyncRunModel } from '../sync/intelSyncRun.model';

/**
 * The live state behind the source cards and System Health. Nothing here is
 * assumed: a source is CONNECTED only when an enabled connector's last sync or
 * test succeeded, Qdrant only when it answers, OpenAI only when a key exists.
 */

export interface SourceCard {
  source: string;
  state: SourceState;
  connectors: number;
  indexed: number;
  last_sync_at: Date | null;
  detail: string;
}

/** One source's state from its connectors. Pure, so the rules are unit-tested. */
export function stateOf(connectors: Pick<IIntelConnector, 'enabled' | 'status' | 'last_success_at'>[], allowed: boolean): SourceState {
  if (!allowed) return 'RESTRICTED';
  const enabled = connectors.filter((c) => c.enabled);
  if (enabled.length === 0) return 'DISCONNECTED';
  if (enabled.some((c) => c.status === 'SYNCING')) return 'SYNCING';
  if (enabled.some((c) => c.status === 'ERROR')) return 'ERROR';
  return enabled.some((c) => c.status === 'OK' || c.last_success_at) ? 'CONNECTED' : 'DISCONNECTED';
}

const latest = (dates: Array<Date | null>): Date | null => dates.reduce<Date | null>((a, d) => (d && (!a || d > a) ? d : a), null);

export async function sourceCards(actor: IntelActor): Promise<SourceCard[]> {
  const settings = await intelSettingsService.get();
  const policy = intelSettingsService.policyFor(settings, actor.level);
  const connectors = await IntelConnectorModel.find({}, { kind: 1, enabled: 1, status: 1, last_success_at: 1, last_sync_at: 1, indexed_count: 1, tools: 1 }).lean();
  const cards: SourceCard[] = INTEL_CONNECTOR_KINDS.map((kind) => {
    const list = connectors.filter((c) => c.kind === kind);
    const allowed = policy.sources.includes(kind as IntelSource);
    return {
      source: kind,
      state: stateOf(list, allowed),
      connectors: list.filter((c) => c.enabled).length,
      indexed: kind === 'MCP' ? list.reduce((n, c) => n + c.tools.length, 0) : list.reduce((n, c) => n + c.indexed_count, 0),
      last_sync_at: latest(list.map((c) => c.last_sync_at)),
      detail: kind === 'MCP' ? 'tools' : 'documents',
    };
  });
  const [files, indexing, failed, qdrantUp, openAiKey] = await Promise.all([
    IntelMediaModel.countDocuments({ deleted_at: null, index_status: 'INDEXED' }),
    IntelMediaModel.countDocuments({ deleted_at: null, index_status: { $in: ['PENDING', 'INDEXING'] } }),
    IntelMediaModel.countDocuments({ deleted_at: null, index_status: 'FAILED', updated_at: { $gt: new Date(Date.now() - 3600_000) } }),
    qdrant.ready(),
    openAiConfigured(settings),
  ]);
  const lastIndexed = await IntelMediaModel.findOne({ index_status: 'INDEXED' }, { indexed_at: 1 }).sort({ indexed_at: -1 }).lean();
  let mediaState: SourceState = 'CONNECTED';
  if (!policy.sources.includes('MEDIA')) mediaState = 'RESTRICTED';
  else if (!qdrantUp || failed > 0) mediaState = 'ERROR';
  else if (indexing > 0) mediaState = 'SYNCING';
  cards.push({ source: 'MEDIA', state: mediaState, connectors: 1, indexed: files, last_sync_at: lastIndexed?.indexed_at ?? null, detail: 'files' });
  cards.push({ source: 'QDRANT', state: qdrantUp ? 'CONNECTED' : 'ERROR', connectors: 1, indexed: 0, last_sync_at: null, detail: qdrantUrl() ? 'vector index' : 'not configured' });
  cards.push({ source: 'OPENAI', state: openAiKey ? 'CONNECTED' : 'DISCONNECTED', connectors: 1, indexed: intelSettingsService.enabledModels(settings).length, last_sync_at: null, detail: 'models' });
  return cards;
}

async function openAiConfigured(settings: Awaited<ReturnType<typeof intelSettingsService.get>>): Promise<boolean> {
  if (await intelOpenAiCredentials(settings)) return true;
  return Boolean((await resolveConfig()).apiKey);
}

export async function systemHealth() {
  const settings = await intelSettingsService.get();
  const up = await qdrant.ready();
  const collections = up
    ? await Promise.all(
        INDEX_SCOPES.map(async (scope) => {
          const info = await qdrant.info(collectionOf(scope)).catch(() => null);
          const size = info?.config?.params?.vectors?.dense?.size ?? null;
          return { scope, name: collectionOf(scope), exists: Boolean(info), status: info?.status ?? 'missing', points: info?.points_count ?? 0, dimensions: size, dimension_mismatch: size !== null && size !== settings.embeddings.dimensions };
        })
      )
    : [];
  const [failedRuns, pendingApprovals, erroredConnectors] = await Promise.all([
    IntelSyncRunModel.countDocuments({ status: 'FAILED', created_at: { $gt: new Date(Date.now() - 24 * 3600_000) } }),
    IntelApprovalModel.countDocuments({ status: 'PENDING' }),
    IntelConnectorModel.find({ status: 'ERROR' }, { name: 1, kind: 1, last_error: 1 }).lean(),
  ]);
  return {
    qdrant: { configured: Boolean(qdrantUrl()), reachable: up, collections },
    queue: { configured: Boolean(process.env.REDIS_QUEUE_URL?.trim()) },
    openai: { configured: await openAiConfigured(settings), entry_selected: Boolean(settings.openai.env_entry_id) },
    failed_runs_24h: failedRuns,
    pending_approvals: pendingApprovals,
    connector_errors: erroredConnectors.map((c) => ({ id: String(c._id), name: c.name, kind: c.kind, error: c.last_error })),
  };
}
