import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  ChallengeToolModel,
  ChallengeToolPresetModel,
  type ChallengeToolDoc,
  type ChallengeToolPresetDoc,
} from './challengeTool.model';
import { TOOL_DEFINITIONS, toolDefinition } from './challengeTool.catalogue';
import { catalogueDefaults, normalizeToolConfig, type ToolConfig } from './challengeTool.config';

export interface ToolUpdateInput {
  name?: string | null;
  description?: string | null;
  default_config?: ToolConfig | null;
  status?: 'ACTIVE' | 'INACTIVE' | null;
}

export interface PresetInput {
  tool_id: string;
  name: string;
  config?: ToolConfig | null;
}

function fail(message: string, code = 'BAD_USER_INPUT'): never {
  throw new GraphQLError(message, { extensions: { code } });
}

function notFound(what: string): never {
  fail(`${what} not found`, 'NOT_FOUND');
}

function assertId(id: string) {
  if (!Types.ObjectId.isValid(id)) fail('Invalid id');
}

type Stamped<T> = T & { created_at?: Date; updated_at?: Date };

function toolPub(d: Stamped<ChallengeToolDoc>) {
  const def = toolDefinition(d.tool_type);
  return {
    id: String(d._id),
    tool_type: d.tool_type,
    name: d.name,
    description: d.description ?? '',
    status: d.status,
    version: d.version ?? 1,
    engine_ready: def?.engine_ready ?? false,
    live_updates: def?.live_updates ?? false,
    input_types: def?.input_types ?? [],
    output_types: def?.output_types ?? [],
    config_schema_json: JSON.stringify(def?.fields ?? []),
    default_config_json: JSON.stringify(d.default_config ?? {}),
    created_at: d.created_at?.toISOString?.() ?? '',
    updated_at: d.updated_at?.toISOString?.() ?? '',
  };
}

function presetPub(d: Stamped<ChallengeToolPresetDoc>) {
  return {
    id: String(d._id),
    tool_id: String(d.tool_id),
    name: d.name,
    config_json: JSON.stringify(d.config ?? {}),
    version: d.version ?? 1,
    is_active: !!d.is_active,
    updated_at: d.updated_at?.toISOString?.() ?? '',
  };
}

export const challengeToolService = {
  /**
   * Inserts any catalogue tool the database does not have yet. Existing rows
   * are never touched, so admin edits survive every deploy. Engine-ready tools
   * start ACTIVE; roadmap tools start INACTIVE and cannot be activated.
   */
  async seedDefaults() {
    // Cast: mongoose's inferred timestamp index signature rejects any typed
    //  (it widens every key to NativeDate).
    await ChallengeToolModel.bulkWrite(
      TOOL_DEFINITIONS.map((def, i) => ({
        updateOne: {
          filter: { tool_type: def.type },
          update: {
            $setOnInsert: {
              tool_type: def.type,
              name: def.name,
              description: def.description,
              default_config: catalogueDefaults(def.type),
              status: def.engine_ready ? 'ACTIVE' : 'INACTIVE',
              version: 1,
              sort_order: (i + 1) * 10,
            },
          },
          upsert: true,
        },
      })) as never[]
    );
  },

  async list() {
    const docs = await ChallengeToolModel.find({}).sort({ sort_order: 1 }).lean();
    return docs.map(toolPub);
  },

  async getById(id: string) {
    assertId(id);
    const d = await ChallengeToolModel.findById(id).lean();
    return d ? toolPub(d) : null;
  },

  /** Active, engine-ready tools by id — the only tools new configurations may use. */
  async activeByIds(ids: string[]) {
    const docs = await ChallengeToolModel.find({ _id: { $in: ids }, status: 'ACTIVE' }).lean();
    return docs.filter((d) => toolDefinition(d.tool_type)?.engine_ready);
  },

  async update(id: string, input: ToolUpdateInput) {
    assertId(id);
    const doc = await ChallengeToolModel.findById(id);
    if (!doc) notFound('Tool');
    if (input.name !== undefined && input.name !== null) {
      if (!input.name.trim()) fail('A tool name is required');
      doc.name = input.name.trim();
    }
    if (input.description !== undefined && input.description !== null) doc.description = input.description;
    if (input.default_config) {
      doc.default_config = normalizeToolConfig(doc.tool_type, catalogueDefaults(doc.tool_type), input.default_config);
      doc.markModified('default_config');
      doc.version = (doc.version ?? 1) + 1;
    }
    if (input.status) {
      if (input.status === 'ACTIVE' && !toolDefinition(doc.tool_type)?.engine_ready) {
        fail('This tool is not available yet and cannot be activated');
      }
      doc.status = input.status;
    }
    await doc.save();
    return toolPub(doc.toObject());
  },

  async presets(toolId?: string | null) {
    const filter = toolId ? { tool_id: toolId } : {};
    if (toolId) assertId(toolId);
    const docs = await ChallengeToolPresetModel.find(filter).sort({ name: 1 }).lean();
    return docs.map(presetPub);
  },

  async presetsByIds(ids: string[]) {
    return ChallengeToolPresetModel.find({ _id: { $in: ids }, is_active: true }).lean();
  },

  async createPreset(input: PresetInput) {
    assertId(input.tool_id);
    const tool = await ChallengeToolModel.findById(input.tool_id).lean();
    if (!tool) notFound('Tool');
    if (!input.name?.trim()) fail('A preset name is required');
    const config = normalizeToolConfig(tool.tool_type, (tool.default_config ?? {}) as ToolConfig, input.config);
    const doc = await ChallengeToolPresetModel.create({ tool_id: tool._id, name: input.name.trim(), config });
    return presetPub(doc.toObject());
  },

  async updatePreset(id: string, input: { name?: string | null; config?: ToolConfig | null; is_active?: boolean | null }) {
    assertId(id);
    const doc = await ChallengeToolPresetModel.findById(id);
    if (!doc) notFound('Preset');
    if (input.name !== undefined && input.name !== null) {
      if (!input.name.trim()) fail('A preset name is required');
      doc.name = input.name.trim();
    }
    if (input.config) {
      const tool = await ChallengeToolModel.findById(doc.tool_id).lean();
      if (!tool) notFound('Tool');
      doc.config = normalizeToolConfig(tool.tool_type, (doc.config ?? {}) as ToolConfig, input.config);
      doc.markModified('config');
      doc.version = (doc.version ?? 1) + 1;
    }
    if (input.is_active !== undefined && input.is_active !== null) doc.is_active = input.is_active;
    await doc.save();
    return presetPub(doc.toObject());
  },

  async duplicatePreset(id: string) {
    assertId(id);
    const src = await ChallengeToolPresetModel.findById(id).lean();
    if (!src) notFound('Preset');
    const doc = await ChallengeToolPresetModel.create({
      tool_id: src.tool_id,
      name: `${src.name} (copy)`,
      config: src.config,
    });
    return presetPub(doc.toObject());
  },
};
