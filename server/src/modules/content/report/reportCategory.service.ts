import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { ContentReportModel } from './contentReport.model';
import {
  DEFAULT_REPORT_CATEGORIES,
  ReportCategoryModel,
  type IReportCategory,
} from './reportCategory.model';

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

const toPub = (c: IReportCategory) => ({
  id: String(c.id),
  key: c.key,
  label: c.label,
  description: c.description ?? '',
  requires_details: c.requires_details === true,
  sort_order: c.sort_order ?? 0,
  is_active: c.is_active !== false,
  created_at: c.created_at?.toISOString?.() ?? '',
  updated_at: c.updated_at?.toISOString?.() ?? '',
});

export type ReportCategoryPub = ReturnType<typeof toPub>;

/** Allowlists for the shared table engine (reportCategoriesTable — DUNCIT TABLE CONTRACT v1). */
const CATEGORY_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['label', 'key', 'description'],
  sortFields: {
    label: 'label',
    sort_order: 'sort_order',
    is_active: 'is_active',
    requires_details: 'requires_details',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    is_active: { type: 'boolean' },
    requires_details: { type: 'boolean' },
    created_at: { type: 'date' },
  },
  // The order the dialog shows them in, so the table is a preview of it.
  defaultSort: { sort_order: 1, label: 1 },
};

export interface ReportCategoryInput {
  label?: string | null;
  description?: string | null;
  requires_details?: boolean | null;
  sort_order?: number | null;
  is_active?: boolean | null;
}

const LABEL_MAX = 80;
const DESCRIPTION_MAX = 200;

/** "Copyright issue" becomes COPYRIGHT_ISSUE — the handle a report stores. */
const keyFromLabel = (label: string) => trimUnderscores(label.toUpperCase().replaceAll(/[^A-Z\d]+/g, '_'));

/**
 * Drop leading and trailing underscores. A plain scan rather than
 * `/^_+|_+$/`, which backtracks on long runs and is flagged as a ReDoS risk.
 */
function trimUnderscores(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && value[start] === '_') start += 1;
  while (end > start && value[end - 1] === '_') end -= 1;
  return value.slice(start, end);
}

function cleanLabel(value: string | null | undefined): string {
  const label = (value ?? '').trim();
  if (!label) fail('BAD_USER_INPUT', 'Give the category a name');
  if (label.length > LABEL_MAX) fail('BAD_USER_INPUT', 'Keep the category name under 80 characters');
  return label;
}

function cleanDescription(value: string | null | undefined): string {
  const description = (value ?? '').trim();
  if (description.length > DESCRIPTION_MAX) {
    fail('BAD_USER_INPUT', 'Keep the description under 200 characters');
  }
  return description;
}

async function findOrFail(id: string): Promise<IReportCategory> {
  if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid category id');
  const doc = await ReportCategoryModel.findById(id);
  if (!doc) fail('NOT_FOUND', 'Category not found');
  return doc;
}

/**
 * Two categories whose names differ only by case or punctuation mint the same
 * key, and would read as the same line twice in the dialog.
 */
async function assertNameFree(label: string, exceptId?: string) {
  const key = keyFromLabel(label);
  if (!key) fail('BAD_USER_INPUT', 'Use letters or numbers in the category name');
  const others = await ReportCategoryModel.find(exceptId ? { _id: { $ne: exceptId } } : {})
    .select('key label')
    .lean();
  const clash = others.some((other) => other.key === key || keyFromLabel(other.label) === key);
  if (clash) fail('CONFLICT', 'A category with that name already exists');
  return key;
}

export const reportCategoryService = {
  /**
   * Seed the starting list into an EMPTY collection only.
   *
   * Not an upsert per key: Legal owns this list, and a category they deleted
   * on purpose must not come back on the next deploy. An empty collection is
   * the one case that has to be repaired, because the report dialog has nothing
   * to offer without it.
   */
  async seedDefaults(): Promise<number> {
    if ((await ReportCategoryModel.estimatedDocumentCount()) > 0) return 0;
    await ReportCategoryModel.insertMany(
      DEFAULT_REPORT_CATEGORIES.map((category, index) => ({ ...category, sort_order: index + 1 }))
    );
    return DEFAULT_REPORT_CATEGORIES.length;
  },

  /** What the report dialog offers: the active ones, in Legal's order. */
  async listActive() {
    const docs = await ReportCategoryModel.find({ is_active: true }).sort({ sort_order: 1, label: 1 });
    return docs.map(toPub);
  },

  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IReportCategory>(
      ReportCategoryModel,
      {},
      input,
      CATEGORY_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  /**
   * The category a NEW report may be filed under.
   *
   * Refuses an inactive one as firmly as an unknown one: a dialog that was
   * open while Legal switched a category off must not file under it.
   */
  async requireActive(key: string | null | undefined): Promise<ReportCategoryPub> {
    const wanted = String(key ?? '').trim().toUpperCase();
    const doc = wanted ? await ReportCategoryModel.findOne({ key: wanted, is_active: true }) : null;
    if (!doc) fail('BAD_USER_INPUT', 'Pick a reason for the report');
    return toPub(doc);
  },

  /** key → label for every category, switched off or not — old reports still read. */
  async labelMap(): Promise<Map<string, string>> {
    const docs = await ReportCategoryModel.find({}).select('key label').lean();
    return new Map(docs.map((d) => [d.key, d.label]));
  },

  async create(input: ReportCategoryInput) {
    const label = cleanLabel(input.label);
    const key = await assertNameFree(label);
    const last = await ReportCategoryModel.findOne({}).sort({ sort_order: -1 }).select('sort_order');
    const doc = await ReportCategoryModel.create({
      key,
      label,
      description: cleanDescription(input.description),
      requires_details: input.requires_details === true,
      // A new one joins the end of the list unless Legal placed it.
      sort_order: input.sort_order ?? (last?.sort_order ?? 0) + 1,
      is_active: input.is_active !== false,
    });
    return toPub(doc);
  },

  /** `key` is never edited: reports already filed point at it. */
  async update(id: string, input: ReportCategoryInput) {
    const doc = await findOrFail(id);
    if (input.label !== undefined) {
      const label = cleanLabel(input.label);
      await assertNameFree(label, id);
      doc.label = label;
    }
    if (input.description !== undefined) doc.description = cleanDescription(input.description);
    if (typeof input.requires_details === 'boolean') doc.requires_details = input.requires_details;
    if (typeof input.sort_order === 'number') doc.sort_order = input.sort_order;
    if (typeof input.is_active === 'boolean') doc.is_active = input.is_active;
    await doc.save();
    return toPub(doc);
  },

  /**
   * Delete a category nobody has reported under.
   *
   * One that reports point at is refused: deleting it would leave those rows
   * naming a reason that no longer exists. Switching it off does what the
   * person wants — it leaves the dialog — and keeps the record readable.
   */
  async remove(id: string) {
    const doc = await findOrFail(id);
    const used = await ContentReportModel.countDocuments({ reason: doc.key });
    if (used > 0) {
      fail(
        'CONFLICT',
        'Reports were filed under this category. Switch it off instead of deleting it.'
      );
    }
    await doc.deleteOne();
    return true;
  },
};
