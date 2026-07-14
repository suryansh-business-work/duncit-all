import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { LegalDocumentModel, type ILegalDocument } from './legalDocument.model';
import { UserModel } from '@modules/access/user/user.model';
import {
  applyTableQueryInMemory,
  runTableQuery,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

async function actorName(userId: string): Promise<string> {
  const u = await UserModel.findById(userId)
    .select('profile.first_name profile.last_name')
    .lean();
  if (!u) return 'Legal';
  return `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() || 'Legal';
}

function toPub(doc: ILegalDocument) {
  return {
    id: String(doc._id),
    name: doc.name,
    document_type: doc.document_type,
    description: doc.description ?? '',
    content: doc.content ?? '',
    created_by_name: doc.created_by_name ?? '',
    updated_by_name: doc.updated_by_name ?? '',
    version_count: doc.versions.length,
    versions: [...doc.versions]
      .sort((a, b) => (b.created_at?.getTime?.() ?? 0) - (a.created_at?.getTime?.() ?? 0))
      .map((v) => ({
        id: String(v._id),
        name: v.name ?? '',
        document_type: v.document_type ?? '',
        description: v.description ?? '',
        content: v.content ?? '',
        updated_by: v.updated_by ? String(v.updated_by) : null,
        updated_by_name: v.updated_by_name ?? '',
        created_at: v.created_at?.toISOString?.() ?? '',
      })),
    created_at: doc.created_at?.toISOString?.() ?? '',
    updated_at: doc.updated_at?.toISOString?.() ?? '',
  };
}

function snapshot(doc: ILegalDocument, userId: string, name: string) {
  doc.versions.push({
    name: doc.name,
    document_type: doc.document_type,
    description: doc.description,
    content: doc.content,
    updated_by: new Types.ObjectId(userId),
    updated_by_name: name,
  } as any);
  // Keep the last 50 snapshots so the history never grows unbounded.
  if (doc.versions.length > 50) doc.versions.splice(0, doc.versions.length - 50);
}

/** Allowlists for the shared table engine (legalDocumentsTable — DUNCIT TABLE CONTRACT v1). */
const LEGAL_DOCUMENT_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['name', 'description', 'document_type'],
  sortFields: {
    name: 'name',
    document_type: 'document_type',
    updated_by_name: 'updated_by_name',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    document_type: { type: 'string' },
    updated_by_name: { type: 'string' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
  },
  defaultSort: { updated_at: -1 },
};

/** The dashboard "Documents by type" rows are a computed aggregate, so its
 * table (legalDocumentStatsTable) pages in memory over the same array. */
const LEGAL_DOCUMENT_STATS_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['document_type'],
  sortFields: { document_type: 'document_type', count: 'count' },
  filterFields: {
    document_type: { type: 'string' },
    count: { type: 'number' },
  },
  defaultSort: { count: -1 },
};

export const legalDocumentService = {
  async list(filter?: { search?: string; document_type?: string }) {
    const q: any = {};
    if (filter?.document_type) q.document_type = filter.document_type;
    if (filter?.search?.trim()) {
      const rx = { $regex: filter.search.trim(), $options: 'i' };
      q.$or = [{ name: rx }, { description: rx }, { document_type: rx }];
    }
    const docs = await LegalDocumentModel.find(q).sort({ updated_at: -1 }).limit(500);
    return docs.map(toPub);
  },

  /** Server-side table page (search/filter/sort/paginate) for the legalDocumentsTable query. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<ILegalDocument>(
      LegalDocumentModel,
      {},
      input,
      LEGAL_DOCUMENT_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await LegalDocumentModel.findById(id);
    return doc ? toPub(doc) : null;
  },

  async stats() {
    const total = await LegalDocumentModel.estimatedDocumentCount();
    const grouped = await LegalDocumentModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$document_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return {
      total,
      by_type: grouped.map((g) => ({ document_type: g._id || 'Other', count: g.count })),
    };
  },

  /** In-memory table page over the computed by-type aggregate (legalDocumentStatsTable). */
  async statsTable(input?: TableQueryInput | null) {
    const { by_type } = await this.stats();
    return applyTableQueryInMemory(by_type, input, LEGAL_DOCUMENT_STATS_TABLE_CONFIG);
  },

  async create(
    userId: string,
    input: { name: string; document_type: string; description?: string; content?: string }
  ) {
    const name = (input.name || '').trim();
    const documentType = (input.document_type || '').trim();
    if (!name) fail('BAD_USER_INPUT', 'Document name is required');
    if (!documentType) fail('BAD_USER_INPUT', 'Document type is required');
    const who = await actorName(userId);
    const doc = await LegalDocumentModel.create({
      name,
      document_type: documentType,
      description: (input.description ?? '').trim(),
      content: input.content ?? '',
      created_by: new Types.ObjectId(userId),
      created_by_name: who,
      updated_by: new Types.ObjectId(userId),
      updated_by_name: who,
    });
    return toPub(doc);
  },

  async update(
    userId: string,
    id: string,
    input: { name?: string; document_type?: string; description?: string; content?: string }
  ) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid document id');
    const doc = await LegalDocumentModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Document not found');
    const who = await actorName(userId);
    // Snapshot the current state into history before applying the edit.
    snapshot(doc, userId, who);
    if (input.name !== undefined) doc!.name = input.name.trim();
    if (input.document_type !== undefined) doc!.document_type = input.document_type.trim();
    if (input.description !== undefined) doc!.description = input.description.trim();
    if (input.content !== undefined) doc!.content = input.content;
    doc!.updated_by = new Types.ObjectId(userId);
    doc!.updated_by_name = who;
    await doc!.save();
    return toPub(doc);
  },

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid document id');
    const res = await LegalDocumentModel.findByIdAndDelete(id);
    return !!res;
  },

  async clone(userId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid document id');
    const src = await LegalDocumentModel.findById(id);
    if (!src) fail('NOT_FOUND', 'Document not found');
    const who = await actorName(userId);
    const doc = await LegalDocumentModel.create({
      name: `Copy of ${src!.name}`,
      document_type: src!.document_type,
      description: src!.description,
      content: src!.content,
      created_by: new Types.ObjectId(userId),
      created_by_name: who,
      updated_by: new Types.ObjectId(userId),
      updated_by_name: who,
    });
    return toPub(doc);
  },
};
