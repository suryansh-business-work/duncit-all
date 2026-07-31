import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { AudienceListModel } from './audienceList.model';
import { countAudience } from './audience.service';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const LIST_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['name', 'description', 'owner'],
  sortFields: {
    name: 'name',
    owner: 'owner',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    owner: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

export interface AudienceListInput {
  name: string;
  description?: string | null;
  owner: string;
  filters?: { field: string; op: string; value?: string | null; values?: string[] | null }[] | null;
  search?: string | null;
}

const notFound = () =>
  new GraphQLError('Audience list not found', { extensions: { code: 'NOT_FOUND' } });

const bad = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/**
 * The stored criteria as the shape the audience query expects. Every field the
 * mappers touch has a schema default, so no `??` guards here — the only real
 * conversion is a stored null `value` back to `undefined`, which is what the
 * shared filter engine treats as "not supplied".
 */
const toQueryInput = (doc: any): TableQueryInput => ({
  search: doc.search,
  filters: doc.filters.map((f: any) => ({
    field: f.field,
    op: f.op,
    value: f.value ?? undefined,
    values: f.values,
  })),
});

const toPub = (doc: any, memberCount: number) => ({
  id: String(doc._id),
  name: doc.name,
  description: doc.description,
  owner: doc.owner,
  filters: doc.filters.map((f: any) => ({
    field: f.field,
    op: f.op,
    value: f.value,
    values: f.values,
  })),
  search: doc.search,
  member_count: memberCount,
  created_at: doc.created_at.toISOString(),
  updated_at: doc.updated_at.toISOString(),
});

function assertInput(input: AudienceListInput) {
  if (!input.name.trim()) throw bad('List name is required');
  if (!input.owner.trim()) throw bad('List owner is required');
}

/** Counting is one query per list. The lists page is small (a page of 25), but
 * this is the thing to revisit first if it ever gets big. */
const withCounts = (docs: any[]) =>
  Promise.all(docs.map(async (doc) => toPub(doc, await countAudience(toQueryInput(doc)))));

export const audienceListService = {
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<any>(
      AudienceListModel,
      {},
      input,
      LIST_TABLE_CONFIG
    );
    return { rows: await withCounts(docs), total, page, page_size };
  },

  async get(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await AudienceListModel.findById(id);
    if (!doc) return null;
    return toPub(doc, await countAudience(toQueryInput(doc)));
  },

  async create(input: AudienceListInput, createdBy?: string | null) {
    assertInput(input);
    const doc = await AudienceListModel.create({
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      owner: input.owner.trim(),
      filters: input.filters ?? [],
      search: input.search?.trim() ?? '',
      created_by: createdBy && Types.ObjectId.isValid(createdBy) ? new Types.ObjectId(createdBy) : null,
    });
    return toPub(doc, await countAudience(toQueryInput(doc)));
  },

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) throw notFound();
    const deleted = await AudienceListModel.findByIdAndDelete(id);
    if (!deleted) throw notFound();
    return true;
  },
};
