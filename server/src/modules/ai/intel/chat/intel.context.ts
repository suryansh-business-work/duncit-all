import type { IntelActor } from '../access/intel.access';
import { IntelConnectorModel, type IIntelConnector } from '../connectors/intelConnector.model';
import type { IntelHttp } from '../connectors/mcp/mcp.builtin';
import { INTEL_SOURCES, type IndexScope, type IntelEnvironment, type IntelSource } from '../intel.constants';
import { intelSettingsService } from '../settings/intelSettings.service';
import type { IntelRolePolicy, IntelSettings } from '../settings/intelSettings.types';
import type { IIntelConversation } from './intelChat.models';

/**
 * What one turn may reach: the conversation's environment and sources,
 * narrowed by the person's access policy. Computed on the server for every
 * turn; the model is told the result but can never widen it.
 */

export interface TurnContext {
  actor: IntelActor;
  settings: IntelSettings;
  policy: IntelRolePolicy;
  conversation: IIntelConversation;
  conversationId: string;
  messageId: string;
  environments: IntelEnvironment[];
  sources: IntelSource[];
  scopes: IndexScope[];
  connectors: IIntelConnector[];
  model: string;
  /** How many [S#] citations earlier searches of this turn handed out. */
  citationBase: number;
  /** The console request that started the turn — Duncit MCP runs tools as the person under it. */
  http?: IntelHttp;
}

export function allowedEnvironments(choice: string, policy: IntelRolePolicy): IntelEnvironment[] {
  const wanted: IntelEnvironment[] = choice === 'BOTH' ? ['STAGING', 'PRODUCTION'] : [choice as IntelEnvironment];
  return wanted.filter((e) => policy.environments.includes(e));
}

export function allowedSources(selected: readonly string[], policy: IntelRolePolicy): IntelSource[] {
  const wanted = selected.length ? selected : INTEL_SOURCES;
  return INTEL_SOURCES.filter((s) => wanted.includes(s) && policy.sources.includes(s));
}

export const connectorVisible = (c: Pick<IIntelConnector, 'environment' | 'kind' | 'enabled'>, envs: readonly IntelEnvironment[], sources: readonly IntelSource[]) =>
  c.enabled && sources.includes(c.kind) && (c.environment === 'BOTH' || envs.includes(c.environment));

export function pickModel(requested: string, settings: IntelSettings): string {
  const enabled = intelSettingsService.enabledModels(settings);
  return enabled.some((m) => m.id === requested) ? requested : intelSettingsService.defaultModel(settings);
}

export async function buildTurnContext(actor: IntelActor, conversation: IIntelConversation, messageId: string, http?: IntelHttp): Promise<TurnContext> {
  const settings = await intelSettingsService.get();
  const policy = intelSettingsService.policyFor(settings, actor.level);
  const environments = allowedEnvironments(conversation.environment, policy);
  const sources = allowedSources(conversation.sources, policy);
  const all = await IntelConnectorModel.find({ enabled: true }).lean();
  return {
    actor,
    settings,
    policy,
    conversation,
    conversationId: String(conversation._id),
    messageId,
    environments,
    sources,
    scopes: [...environments, 'SHARED'],
    connectors: all.filter((c) => connectorVisible(c, environments, sources)),
    model: pickModel(conversation.model, settings),
    citationBase: 0,
    http,
  };
}
