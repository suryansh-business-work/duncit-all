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

function pub(row: Row | null, category: CategoryRef, source: Row | null) {
  const r = row ?? {};
  return {
    id: r._id ? String(r._id) : null,
    category_id: category._id.toString(),
    category_name: category.name,
    level: category.level,
    source_category_id: source ? String(source.category_id) : null,
    inherited: !!source && String(source.category_id) !== category._id.toString(),
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

/** The category and its ancestors, nearest first (at most Sub → Category → Super). */
async function chainOf(categoryId: string) {
  const chain: CategoryRef[] = [];
  let next: string | null = categoryId;
  while (next && chain.length < 3) {
    const cat: { _id: Types.ObjectId; name: string; level: string; parent_id?: unknown } | null = await CategoryModel.findById(next)
      .select('name level parent_id')
      .lean();
    if (!cat) break;
    chain.push({ _id: cat._id, name: cat.name, level: cat.level });
    next = cat.parent_id ? String(cat.parent_id) : null;
  }
  return chain;
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
  /** The nearest mapping row for a category, walking up the tree. */
  async effective(categoryId: string) {
    assertIds([categoryId]);
    const chain = await chainOf(categoryId);
    if (!chain.length) fail('Category not found', 'NOT_FOUND');
    const rows = await ChallengeCategoryMappingModel.find({ category_id: { $in: chain.map((c) => c._id) } }).lean();
    const byCat = new Map(rows.map((r) => [String(r.category_id), r]));
    const source = chain.map((c) => byCat.get(String(c._id))).find(Boolean) ?? null;
    return pub(source, chain[0], source);
  },

  /** Every category row, for the Category Mapping table. */
  async list() {
    const rows = await ChallengeCategoryMappingModel.find({}).sort({ updated_at: -1 }).lean();
    const cats = await CategoryModel.find({ _id: { $in: rows.map((r) => r.category_id) } })
      .select('name level')
      .lean();
    const byId = new Map<string, CategoryRef>(
      cats.map((c) => [c._id.toString(), { _id: c._id, name: c.name, level: c.level }])
    );
    return rows.flatMap((r) => {
      const category = byId.get(String(r.category_id));
      return category ? [pub(r, category, r)] : [];
    });
  },

  async upsert(categoryId: string, input: MappingInput, actorId: string) {
    assertIds([categoryId]);
    const category = await CategoryModel.findById(categoryId).select('name level').lean();
    if (!category) fail('Category not found', 'NOT_FOUND');
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

  /** Drops a category's own row so it inherits from its parent again. */
  async clear(categoryId: string) {
    assertIds([categoryId]);
    await ChallengeCategoryMappingModel.deleteOne({ category_id: categoryId });
    return challengeMappingService.effective(categoryId);
  },

  /** Tool id → category ids whose own row allows it, for the whole Tool Master list. */
  async categoriesByTool() {
    const rows = await ChallengeCategoryMappingModel.find({ 'allowed_tool_ids.0': { $exists: true } })
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

  /** Category ids whose own row allows the tool (Tool Master > Mapped Categories). */
  async categoriesForTool(toolId: string) {
    assertIds([toolId]);
    const rows = await ChallengeCategoryMappingModel.find({ allowed_tool_ids: toolId }).select('category_id').lean();
    return rows.map((r) => String(r.category_id));
  },

  /**
   * Makes `categoryIds` exactly the categories whose own row allows the tool —
   * the Tool Master side of the same rows Category Mapping edits. New rows are
   * created disabled so mapping a tool never switches challenges on by itself.
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
            $set: { updated_by: actorId },
            $setOnInsert: { level: c.level, enabled: false },
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
    return challengeMappingService.categoriesForTool(toolId);
  },
};
