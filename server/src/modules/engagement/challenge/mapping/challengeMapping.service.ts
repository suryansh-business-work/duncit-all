import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { CategoryModel } from '@modules/pods/category/category.model';
import { ChallengeCategoryMappingModel, type ChallengeCategoryMappingDoc } from './challengeMapping.model';
import { ChallengeToolModel, ChallengeToolPresetModel } from '../tools/challengeTool.model';
import { toolDefinition } from '../tools/challengeTool.catalogue';
import { ChallengeModel } from '../challenge.model';

export interface MappingInput {
  enabled?: boolean | null;
  allowed_tool_ids?: string[] | null;
  preset_ids?: string[] | null;
  default_template_id?: string | null;
  allow_host_customization?: boolean | null;
  show_on_pod_details_default?: boolean | null;
  allow_audience_voting?: boolean | null;
  require_challenge?: boolean | null;
  max_competitors?: number | null;
}

type Row = Partial<ChallengeCategoryMappingDoc> & { updated_at?: Date };
type CategoryRef = { _id: Types.ObjectId; name: string; level: string };

function fail(message: string, code = 'BAD_USER_INPUT'): never {
  throw new GraphQLError(message, { extensions: { code } });
}

function assertIds(ids: string[]) {
  if (ids.some((id) => !Types.ObjectId.isValid(id))) fail('Invalid id');
}

const ids = (list: unknown[] | null | undefined) => (list ?? []).map(String);

/**
 * Challenge tools are chosen per SUB-category and nowhere else: a sub-category
 * runs exactly what its own row says, and nothing is inherited from the
 * category or super category above it.
 */
const MAPPED_LEVEL = 'SUB';

/** A row that is actually in force: a sub-category's, with challenges on. */
const MAPPED = { level: MAPPED_LEVEL, enabled: true } as const;

function assertMappable(category: { level: string }) {
  if (category.level !== MAPPED_LEVEL) fail('Challenge tools are chosen per sub-category');
}

function pub(row: Row | null, category: CategoryRef) {
  const r = row ?? {};
  return {
    id: r._id ? String(r._id) : null,
    category_id: category._id.toString(),
    category_name: category.name,
    level: category.level,
    // Kept for older clients: a row is always the category's own now.
    source_category_id: r._id ? category._id.toString() : null,
    inherited: false,
    enabled: !!r.enabled,
    allowed_tool_ids: ids(r.allowed_tool_ids),
    preset_ids: ids(r.preset_ids),
    default_template_id: r.default_template_id ? String(r.default_template_id) : null,
    allow_host_customization: !!r.allow_host_customization,
    show_on_pod_details_default: r.show_on_pod_details_default ?? true,
    allow_audience_voting: r.allow_audience_voting ?? true,
    require_challenge: !!r.require_challenge,
    max_competitors: r.max_competitors ?? 0,
    updated_at: r.updated_at?.toISOString?.() ?? '',
  };
}

/** Rejects newly added tools that are inactive or not runnable by the engine. */
async function assertSelectableTools(next: string[], previous: string[]) {
  const added = next.filter((id) => !previous.includes(id));
  if (!added.length) return;
  const tools = await ChallengeToolModel.find({ _id: { $in: added } }).select('tool_type status').lean();
  const ok = tools.filter((t) => t.status === 'ACTIVE' && toolDefinition(t.tool_type)?.engine_ready);
  if (ok.length !== added.length) fail('Only active tools can be mapped to a category');
}

async function assertPresets(presetIds: string[], toolIds: string[]) {
  if (!presetIds.length) return;
  const presets = await ChallengeToolPresetModel.find({ _id: { $in: presetIds } }).select('tool_id').lean();
  if (presets.length !== presetIds.length) fail('A selected preset no longer exists');
  if (presets.some((p) => !toolIds.includes(String(p.tool_id)))) {
    fail('Every preset must belong to one of the allowed tools');
  }
}

async function assertTemplate(templateId: string | null, toolIds: string[]) {
  if (!templateId) return;
  assertIds([templateId]);
  const tpl = await ChallengeModel.findById(templateId).select('is_active tool_instances').lean();
  if (!tpl?.is_active) fail('The default template must be an active template');
  const outside = (tpl.tool_instances ?? []).some((t) => !toolIds.includes(String(t.tool_id)));
  if (outside) fail('The default template uses a tool this category does not allow');
}

export const challengeMappingService = {
  /**
   * A category's own challenge settings. Only a sub-category can have any; a
   * category or super category (and a sub-category nobody has configured)
   * reads as challenges off.
   */
  async effective(categoryId: string) {
    assertIds([categoryId]);
    const category = await CategoryModel.findById(categoryId).select('name level').lean();
    if (!category) fail('Category not found', 'NOT_FOUND');
    const ref: CategoryRef = { _id: category._id, name: category.name, level: category.level };
    if (category.level !== MAPPED_LEVEL) return pub(null, ref);
    return pub(await ChallengeCategoryMappingModel.findOne({ category_id: categoryId }).lean(), ref);
  },

  /** Every sub-category row, for the Category Mapping table. */
  async list() {
    const rows = await ChallengeCategoryMappingModel.find({ level: MAPPED_LEVEL }).sort({ updated_at: -1 }).lean();
    const cats = await CategoryModel.find({ _id: { $in: rows.map((r) => r.category_id) } })
      .select('name level')
      .lean();
    const byId = new Map<string, CategoryRef>(
      cats.map((c) => [c._id.toString(), { _id: c._id, name: c.name, level: c.level }])
    );
    return rows.flatMap((r) => {
      const category = byId.get(String(r.category_id));
      return category ? [pub(r, category)] : [];
    });
  },

  async upsert(categoryId: string, input: MappingInput, actorId: string) {
    assertIds([categoryId]);
    const category = await CategoryModel.findById(categoryId).select('name level').lean();
    if (!category) fail('Category not found', 'NOT_FOUND');
    assertMappable(category);
    const current = await ChallengeCategoryMappingModel.findOne({ category_id: categoryId }).lean();
    const toolIds = input.allowed_tool_ids ?? ids(current?.allowed_tool_ids);
    const presetIds = input.preset_ids ?? ids(current?.preset_ids);
    const currentTemplate = current?.default_template_id ? String(current.default_template_id) : null;
    const templateId = 'default_template_id' in input ? (input.default_template_id ?? null) : currentTemplate;
    assertIds([...toolIds, ...presetIds]);
    await assertSelectableTools(toolIds, ids(current?.allowed_tool_ids));
    await assertPresets(presetIds, toolIds);
    await assertTemplate(templateId, toolIds);
    if (input.max_competitors !== undefined && input.max_competitors !== null && input.max_competitors < 0) {
      fail('Maximum competitors cannot be negative');
    }

    const set: Record<string, unknown> = {
      level: category.level,
      allowed_tool_ids: toolIds,
      preset_ids: presetIds,
      default_template_id: templateId,
      updated_by: actorId,
    };
    for (const key of [
      'enabled',
      'allow_host_customization',
      'show_on_pod_details_default',
      'allow_audience_voting',
      'require_challenge',
      'max_competitors',
    ] as const) {
      if (input[key] !== undefined && input[key] !== null) set[key] = input[key];
    }
    await ChallengeCategoryMappingModel.updateOne({ category_id: categoryId }, { $set: set }, { upsert: true });
    return challengeMappingService.effective(categoryId);
  },

  /** Drops a sub-category's row: challenges are off for it until it is configured again. */
  async clear(categoryId: string) {
    assertIds([categoryId]);
    await ChallengeCategoryMappingModel.deleteOne({ category_id: categoryId });
    return challengeMappingService.effective(categoryId);
  },

  /** Tool id → the sub-categories running it (challenges on, tool allowed), for the whole Tool Master list. */
  async categoriesByTool() {
    const rows = await ChallengeCategoryMappingModel.find({ ...MAPPED, 'allowed_tool_ids.0': { $exists: true } })
      .select('category_id allowed_tool_ids')
      .lean();
    const out = new Map<string, string[]>();
    for (const row of rows) {
      for (const toolId of ids(row.allowed_tool_ids)) {
        out.set(toolId, [...(out.get(toolId) ?? []), String(row.category_id)]);
      }
    }
    return out;
  },

  /** The sub-categories running the tool (Tool Master > Mapped Categories). */
  async categoriesForTool(toolId: string) {
    assertIds([toolId]);
    const rows = await ChallengeCategoryMappingModel.find({ ...MAPPED, allowed_tool_ids: toolId }).select('category_id').lean();
    return rows.map((r) => String(r.category_id));
  },

  /**
   * Makes `categoryIds` exactly the sub-categories running the tool — the Tool
   * Master side of the SAME rows a sub-category's own Challenge section edits,
   * so the two screens always agree. Mapping a tool to a sub-category switches
   * its challenges on (that is what choosing it there means) and keeps the
   * tools it already had; taking away its last tool switches them off again.
   */
  async setToolCategories(toolId: string, categoryIds: string[], actorId: string) {
    assertIds([toolId, ...categoryIds]);
    const wanted = [...new Set(categoryIds)];
    const current = await challengeMappingService.categoriesForTool(toolId);
    const added = wanted.filter((id) => !current.includes(id));
    const removed = current.filter((id) => !wanted.includes(id));
    if (added.length) await assertSelectableTools([toolId], []);

    const cats = await CategoryModel.find({ _id: { $in: added } }).select('level').lean();
    if (cats.length !== added.length) fail('Category not found', 'NOT_FOUND');
    cats.forEach(assertMappable);
    // Unmapping a tool also unmaps its presets, so no row keeps a preset for a
    // tool it no longer allows.
    const toolPresets = removed.length
      ? (await ChallengeToolPresetModel.find({ tool_id: toolId }).select('_id').lean()).map((p) => p._id)
      : [];
    await ChallengeCategoryMappingModel.bulkWrite([
      ...cats.map((c) => ({
        updateOne: {
          filter: { category_id: c._id },
          update: {
            $addToSet: { allowed_tool_ids: new Types.ObjectId(toolId) },
            $set: { updated_by: actorId, enabled: true, level: c.level },
          },
          upsert: true,
        },
      })),
      ...removed.map((id) => ({
        updateOne: {
          filter: { category_id: new Types.ObjectId(id) },
          update: {
            $pull: { allowed_tool_ids: new Types.ObjectId(toolId), preset_ids: { $in: toolPresets } },
            $set: { updated_by: actorId },
          },
        },
      })),
    ] as never[]);
    if (removed.length) {
      // Challenges cannot stay on with nothing to run.
      await ChallengeCategoryMappingModel.updateMany(
        { category_id: { $in: removed.map((id) => new Types.ObjectId(id)) }, allowed_tool_ids: { $size: 0 } },
        { $set: { enabled: false } }
      );
    }
    return challengeMappingService.categoriesForTool(toolId);
  },
};
