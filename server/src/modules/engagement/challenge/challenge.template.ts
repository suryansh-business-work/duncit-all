import { GraphQLError } from 'graphql';
import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { ChallengeToolModel, ChallengeToolPresetModel } from './tools/challengeTool.model';
import { toolDefinition } from './tools/challengeTool.catalogue';
import { normalizeToolConfig, parseConfigJson, type ToolConfig } from './tools/challengeTool.config';
import { TOTAL_KEY } from './runtime/challenge.standings';

/**
 * Builds a template's tool instances and winner rules from client input.
 * Each instance resolves its settings as: tool admin defaults → preset → the
 * template's own overrides, then snapshots the tool version it was built on.
 */

export interface ToolInstanceInput {
  instance_id?: string | null;
  tool_id: string;
  preset_id?: string | null;
  label: string;
  config_json?: string | null;
}

export interface RankKeyInput {
  rank_by: string;
  direction: 'ASC' | 'DESC';
}

export interface WinnerRulesInput extends RankKeyInput {
  tie_breakers?: RankKeyInput[] | null;
  podium_size?: number | null;
}

export interface BuiltInstance {
  instance_id: string;
  tool_id: Types.ObjectId;
  tool_type: string;
  tool_version: number;
  preset_id: Types.ObjectId | null;
  label: string;
  config: ToolConfig;
}

const MAX_INSTANCES = 12;
const MAX_TIE_BREAKERS = 3;

function bad(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

export async function buildToolInstances(input: ToolInstanceInput[]): Promise<BuiltInstance[]> {
  if (input.length > MAX_INSTANCES) bad(`A template can hold at most ${MAX_INSTANCES} tools`);
  const ids = [...input.map((i) => i.tool_id), ...input.flatMap((i) => (i.preset_id ? [i.preset_id] : []))];
  if (ids.some((id) => !Types.ObjectId.isValid(id))) bad('Invalid tool or preset id');

  const [tools, presets] = await Promise.all([
    ChallengeToolModel.find({ _id: { $in: input.map((i) => i.tool_id) } }).lean(),
    ChallengeToolPresetModel.find({ _id: { $in: input.flatMap((i) => i.preset_id ?? []) } }).lean(),
  ]);
  const toolById = new Map(tools.map((t) => [t._id.toString(), t]));
  const presetById = new Map(presets.map((p) => [p._id.toString(), p]));
  const seen = new Set<string>();

  return input.map((raw) => {
    const tool = toolById.get(raw.tool_id);
    if (!tool) bad('A selected tool no longer exists');
    if (tool.status !== 'ACTIVE' || !toolDefinition(tool.tool_type)?.engine_ready) {
      bad(`${tool.name} is inactive and cannot be added to a template`);
    }
    const preset = raw.preset_id ? presetById.get(raw.preset_id) : null;
    if (raw.preset_id && (!preset?.is_active || String(preset.tool_id) !== raw.tool_id)) {
      bad(`The preset chosen for ${tool.name} is not available`);
    }
    const label = raw.label?.trim();
    if (!label) bad('Every tool in a template needs a label');
    const instanceId = raw.instance_id?.trim() || randomUUID().slice(0, 8);
    if (seen.has(instanceId)) bad('Tool instance ids must be unique');
    seen.add(instanceId);

    const base = { ...(tool.default_config as ToolConfig), ...((preset?.config as ToolConfig) ?? {}) };
    return {
      instance_id: instanceId,
      tool_id: tool._id,
      tool_type: tool.tool_type,
      tool_version: tool.version ?? 1,
      preset_id: preset ? preset._id : null,
      label: label.slice(0, 60),
      config: normalizeToolConfig(tool.tool_type, base, parseConfigJson(raw.config_json)),
    };
  });
}

/** Rank keys must point at TOTAL or at an instance that produces a number. */
export function buildWinnerRules(
  input: WinnerRulesInput | null | undefined,
  instances: readonly { instance_id: string; tool_type: string }[]
) {
  const scoring = instances.filter((t) => (toolDefinition(t.tool_type)?.metric ?? 'NONE') !== 'NONE');
  const valid = new Set([TOTAL_KEY, ...scoring.map((t) => t.instance_id)]);
  const key = (k: RankKeyInput) => {
    if (!valid.has(k.rank_by)) bad('Winner rules must rank by the total or by a scoring tool');
    if (k.direction !== 'ASC' && k.direction !== 'DESC') bad('Ranking direction must be ascending or descending');
    return { rank_by: k.rank_by, direction: k.direction };
  };
  const rules = input ?? { rank_by: TOTAL_KEY, direction: 'DESC' as const };
  const tieBreakers = (rules.tie_breakers ?? []).slice(0, MAX_TIE_BREAKERS).map(key);
  const podium = rules.podium_size ?? 3;
  if (!Number.isInteger(podium) || podium < 1 || podium > 10) bad('Podium size must be between 1 and 10');
  return { ...key(rules), tie_breakers: tieBreakers, podium_size: podium };
}
