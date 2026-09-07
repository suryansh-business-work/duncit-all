/**
 * The Expense form's dropdowns, and the screen that edits them.
 *
 * Two reads with different rules, on purpose:
 *  - {@link expenseOptionService.active} is what the FORM offers. Active rows
 *    only, in order.
 *  - {@link expenseOptionService.all} is what SETTINGS shows. Everything,
 *    including the switched-off rows, because switching one back on is the
 *    reason the screen exists.
 *
 * Labels for STORED keys always resolve through {@link labelMap}, which reads
 * inactive rows too. An expense filed under a category Finance later retired
 * still has to say what it was spent on.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ExpenseModel } from '@modules/finance/expense/expense.model';
import {
  ExpenseOptionModel,
  EXPENSE_OPTION_KINDS,
  type ExpenseOptionKind,
  type IExpenseOption,
} from './expenseOption.model';
import { EXPENSE_OPTION_SEEDS } from './expenseOption.defaults';
import { EXPENSE_ENTITY_SOURCES } from './expenseOption.sources';

const KIND_SET = new Set<string>(EXPENSE_OPTION_KINDS);
const SOURCE_SET = new Set<string>(EXPENSE_ENTITY_SOURCES);

/** The expense field each list fills, for the in-use check before a delete. */
const KIND_FIELD: Record<ExpenseOptionKind, string> = {
  RELATED_FROM_TYPE: 'related_from_type',
  CATEGORY: 'category',
  PAYMENT_METHOD: 'payment_method',
  COMPENSATION_METHOD: 'compensation_method',
};

const clean = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);

/** CONSTANT_CASE, because the key is what an expense row carries forever. */
const toKey = (value: unknown) =>
  clean(value, 60)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

function assertKind(kind: string): ExpenseOptionKind {
  if (!KIND_SET.has(kind)) {
    throw new GraphQLError('Unknown expense option list', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return kind as ExpenseOptionKind;
}

function toPub(doc: IExpenseOption) {
  return {
    id: doc._id.toString(),
    kind: doc.kind,
    key: doc.key,
    label: doc.label,
    entity_source: doc.entity_source ?? '',
    sort_order: doc.sort_order ?? 0,
    is_active: doc.is_active,
    is_system: doc.is_system,
    created_at: doc.created_at?.toISOString?.() ?? '',
    updated_at: doc.updated_at?.toISOString?.() ?? '',
  };
}

/** How many expenses point at this option — what makes a delete safe or not. */
function usageCount(kind: ExpenseOptionKind, key: string) {
  return ExpenseModel.countDocuments({ [KIND_FIELD[kind]]: key });
}

export const expenseOptionService = {
  /** The form's dropdown: active rows of one list, in order. */
  async active(kind: string) {
    const docs = await ExpenseOptionModel.find({ kind: assertKind(kind), is_active: true }).sort({
      sort_order: 1,
      label: 1,
    });
    return docs.map(toPub);
  },

  /** The settings table: one whole list, switched-off rows included. */
  async all(kind: string) {
    const docs = await ExpenseOptionModel.find({ kind: assertKind(kind) }).sort({
      sort_order: 1,
      label: 1,
    });
    const rows = docs.map(toPub);
    const counts = await Promise.all(rows.map((row) => usageCount(row.kind, row.key)));
    return rows.map((row, index) => ({ ...row, usage_count: counts[index] }));
  },

  /**
   * key -> label for one list, INCLUDING switched-off rows.
   *
   * Every screen that renders a stored key goes through this. A key with no row
   * at all (typed straight into the database, or an option deleted before this
   * guard existed) is left as its own label rather than blanked — an unhandled
   * FOOD_AND_BEVERAGE on screen is legible, and an empty cell is not.
   */
  async labelMap(kind: string): Promise<Record<string, string>> {
    const docs = await ExpenseOptionModel.find({ kind: assertKind(kind) }).select('key label');
    return Object.fromEntries(docs.map((doc) => [doc.key, doc.label]));
  },

  /** The entity source a RELATED_FROM_TYPE points at, or '' if unknown. */
  async entitySource(typeKey: string): Promise<string> {
    if (!typeKey) return '';
    const doc = await ExpenseOptionModel.findOne({
      kind: 'RELATED_FROM_TYPE',
      key: typeKey.toUpperCase(),
    }).select('entity_source');
    return doc?.entity_source ?? '';
  },

  async create(input: Record<string, unknown>) {
    const kind = assertKind(String(input.kind));
    const key = toKey(input.key ?? input.label);
    if (!key) {
      throw new GraphQLError('Give the option a key', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const label = clean(input.label, 120);
    if (!label) {
      throw new GraphQLError('Give the option a display name', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const exists = await ExpenseOptionModel.exists({ kind, key });
    if (exists) {
      throw new GraphQLError('That key is already used in this list', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const last = await ExpenseOptionModel.findOne({ kind }).sort({ sort_order: -1 }).select('sort_order');
    const doc = await ExpenseOptionModel.create({
      kind,
      key,
      label,
      entity_source: normalizeSource(kind, input.entity_source),
      sort_order: (last?.sort_order ?? -1) + 1,
      is_active: input.is_active !== false,
      is_system: false,
    });
    return toPub(doc);
  },

  /**
   * Everything about an option is editable EXCEPT its key. The key is what
   * every expense filed under this option stores; changing it would silently
   * orphan all of them.
   */
  async update(id: string, input: Record<string, unknown>) {
    const doc = await findOption(id);
    if (input.label !== undefined) {
      const label = clean(input.label, 120);
      if (!label) {
        throw new GraphQLError('Give the option a display name', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      doc.label = label;
    }
    if (input.entity_source !== undefined) {
      doc.entity_source = normalizeSource(doc.kind, input.entity_source);
    }
    if (input.sort_order !== undefined) doc.sort_order = Number(input.sort_order) || 0;
    if (input.is_active !== undefined) doc.is_active = input.is_active !== false;
    await doc.save();
    return toPub(doc);
  },

  /**
   * Delete refuses twice: a seeded row is never deletable (the next boot puts
   * it back), and a row any expense points at is never deletable (that expense
   * would lose the word for what it was). Switching it off is the answer to
   * both — it leaves the list and keeps labelling history.
   */
  async remove(id: string) {
    const doc = await findOption(id);
    if (doc.is_system) {
      throw new GraphQLError('A built-in option cannot be deleted — switch it off instead', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    const used = await usageCount(doc.kind, doc.key);
    if (used > 0) {
      throw new GraphQLError(
        `${used} expense(s) use this option — switch it off instead of deleting it`,
        { extensions: { code: 'BAD_USER_INPUT' } }
      );
    }
    await doc.deleteOne();
    return true;
  },

  /**
   * Boot seed. `$setOnInsert` on everything an operator can change, so a
   * relabelled or switched-off option survives every redeploy; only a row that
   * does not exist yet is written.
   */
  async seedDefaults() {
    const ops = EXPENSE_OPTION_SEEDS.map((seed, index) => ({
      updateOne: {
        filter: { kind: seed.kind, key: seed.key },
        update: {
          $setOnInsert: {
            kind: seed.kind,
            key: seed.key,
            label: seed.label,
            entity_source: seed.entity_source ?? '',
            sort_order: index,
            is_active: seed.inactive !== true,
            is_system: true,
          },
        },
        upsert: true,
      },
    }));
    const result = await ExpenseOptionModel.bulkWrite(ops, { ordered: false });
    return result.upsertedCount ?? 0;
  },

  syncIndexes() {
    return ExpenseOptionModel.syncIndexes();
  },
};

async function findOption(id: string) {
  if (!Types.ObjectId.isValid(id)) {
    throw new GraphQLError('Option not found', { extensions: { code: 'NOT_FOUND' } });
  }
  const doc = await ExpenseOptionModel.findById(id);
  if (!doc) throw new GraphQLError('Option not found', { extensions: { code: 'NOT_FOUND' } });
  return doc;
}

/**
 * Only a RELATED_FROM_TYPE has an entity list, and only one the registry knows.
 * An unrecognised name is dropped rather than saved, so Settings cannot point a
 * picker at something no code can search.
 */
function normalizeSource(kind: ExpenseOptionKind, raw: unknown): string {
  if (kind !== 'RELATED_FROM_TYPE') return '';
  const source = clean(raw, 60).toUpperCase();
  return SOURCE_SET.has(source) ? source : '';
}
