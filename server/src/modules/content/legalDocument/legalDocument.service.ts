import { GraphQLError } from 'graphql';
import { userDisplayOf } from '@modules/access/user/user.display';
import { Types } from 'mongoose';
import { LegalDocumentModel, type ILegalDocument } from './legalDocument.model';
import type { SignatureMethod } from '@modules/content/signing/signing.model';
import {
  allowedSignatureMethods,
  applySignature,
  assertRecipient,
  signatoriesForPdf,
  signatoriesToPub,
  validateSignature,
  type SignatureInput,
} from '@modules/content/signing/signing.service';
import { nextEntityNo } from '@modules/venues/entityIdCounter';
import {
  applyTableQueryInMemory,
  runTableQuery,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

function toPub(doc: ILegalDocument) {
  return {
    id: String(doc._id),
    document_no: doc.document_no ?? '',
    name: doc.name,
    is_active: doc.is_active !== false,
    document_type: doc.document_type,
    description: doc.description ?? '',
    content: doc.content ?? '',
    // The ids the LegalDocument field resolvers turn into names.
    created_by: doc.created_by ?? null,
    updated_by: doc.updated_by ?? null,
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
        created_at: v.created_at?.toISOString?.() ?? '',
      })),
    signing_status: doc.signed_at ? 'SIGNED' : 'UNSIGNED',
    signed_at: doc.signed_at ? doc.signed_at.toISOString() : null,
    is_locked: !!doc.signed_at,
    signatories: signatoriesToPub(doc.signatories),
    created_at: doc.created_at?.toISOString?.() ?? '',
    updated_at: doc.updated_at?.toISOString?.() ?? '',
  };
}

function snapshot(doc: ILegalDocument, userId: string) {
  doc.versions.push({
    name: doc.name,
    document_type: doc.document_type,
    description: doc.description,
    content: doc.content,
    updated_by: new Types.ObjectId(userId),
  } as any);
  // Keep the last 50 snapshots so the history never grows unbounded.
  if (doc.versions.length > 50) doc.versions.splice(0, doc.versions.length - 50);
}

/** Allowlists for the shared table engine (legalDocumentsTable — DUNCIT TABLE CONTRACT v1). */
const LEGAL_DOCUMENT_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['document_no', 'name', 'description', 'document_type'],
  sortFields: {
    document_no: 'document_no',
    name: 'name',
    is_active: 'is_active',
    document_type: 'document_type',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    document_no: { type: 'string' },
    is_active: { type: 'boolean' },
    document_type: { type: 'string' },
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
    const doc = await LegalDocumentModel.create({
      name,
      document_type: documentType,
      description: (input.description ?? '').trim(),
      content: input.content ?? '',
      created_by: new Types.ObjectId(userId),
      updated_by: new Types.ObjectId(userId),
    });
    return toPub(doc);
  },

  async update(
    userId: string,
    id: string,
    input: {
      name?: string;
      document_type?: string;
      description?: string;
      content?: string;
      is_active?: boolean;
    }
  ) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid document id');
    const doc = await LegalDocumentModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Document not found');
    // A signed contract is finished. Editing it would leave a signature
    // attached to words nobody agreed to.
    if (doc!.signed_at) {
      fail('FORBIDDEN', 'This contract is signed and can no longer be edited.');
    }
    // Guard before the snapshot: a rejected edit must not leave a version
    // behind, and Mongoose's own required-error is not a sentence anyone wants
    // to read in a dialog.
    if (input.name !== undefined && !input.name.trim()) {
      fail('BAD_USER_INPUT', 'Title is required');
    }
    // Snapshot the current state into history before applying the edit.
    snapshot(doc, userId);
    if (input.name !== undefined) doc!.name = input.name.trim();
    if (input.document_type !== undefined) doc!.document_type = input.document_type.trim();
    if (input.description !== undefined) doc!.description = input.description.trim();
    if (input.content !== undefined) doc!.content = input.content;
    if (input.is_active !== undefined) doc!.is_active = !!input.is_active;
    doc!.updated_by = new Types.ObjectId(userId);
    await doc!.save();
    return toPub(doc);
  },

  /**
   * Show or hide a document, without touching a word of it.
   *
   * Its own mutation rather than a flag on `update`, because `update` refuses a
   * signed document and must keep refusing it: an edit after signature attaches
   * a signature to words nobody agreed to. Taking a document DOWN is the
   * opposite — it is the remedy you reach for precisely when something signed
   * turns out to be wrong, and a lock that blocks it makes the lock the problem.
   *
   * No snapshot is written: visibility is not wording, and a history full of
   * identical versions differing only by a boolean is a history nobody reads.
   */
  async setActive(userId: string, id: string, isActive: boolean) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid document id');
    const doc = await LegalDocumentModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Document not found');
    doc!.is_active = !!isActive;
    doc!.updated_by = new Types.ObjectId(userId);
    await doc!.save();
    return toPub(doc);
  },

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid document id');
    const res = await LegalDocumentModel.findByIdAndDelete(id);
    return !!res;
  },


  /**
   * Give an id to any record that has none.
   *
   * The hook that mints them fires on INSERT, so anything written before the
   * id existed keeps a blank one for good — a dash in the column meant to be
   * its permanent handle. Idempotent, and it only looks for the missing.
   */
  async backfillIds(): Promise<{ repaired: number }> {
    const idless = await LegalDocumentModel.find({
      $or: [{ document_no: null }, { document_no: { $exists: false } }, { document_no: '' }],
    }).select('_id');
    for (const doc of idless) {
      doc.document_no = await nextEntityNo('DOC', 'legal_document');
      await doc.save();
    }
    return { repaired: idless.length };
  },

  async clone(userId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid document id');
    const src = await LegalDocumentModel.findById(id);
    if (!src) fail('NOT_FOUND', 'Document not found');
    const doc = await LegalDocumentModel.create({
      name: `Copy of ${src!.name}`,
      document_type: src!.document_type,
      description: src!.description,
      content: src!.content,
      created_by: new Types.ObjectId(userId),
      updated_by: new Types.ObjectId(userId),
    });
    return toPub(doc);
  },

  /** Which ways of signing this deployment allows (Admin feature flags). */
  signatureMethods(): Promise<SignatureMethod[]> {
    return allowedSignatureMethods();
  },

  /**
   * Sign the document as the acting user.
   *
   * The rules themselves live in the shared signing service, because contracts
   * apply exactly the same ones (rule 34). What stays here is the part that is
   * about a DOCUMENT: finding it, and refusing one already signed.
   */
  async sign(userId: string, id: string, input: SignatureInput) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid document id');
    const doc = await LegalDocumentModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Document not found');
    if (doc!.signed_at) fail('FORBIDDEN', 'This contract is already signed.');

    const clean = await validateSignature(input);
    await applySignature(doc!, userId, clean);
    await doc!.save();
    return toPub(doc);
  },

  /** The contract as PDF bytes — unsigned before signing, signed after. */
  async pdf(id: string): Promise<Buffer> {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid document id');
    const doc = await LegalDocumentModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Document not found');
    return renderPdf(doc);
  },

  /**
   * Email the signed contract to somebody, with the PDF attached.
   *
   * Only once it is signed: sharing a draft as though it were executed is the
   * mistake this whole workflow exists to prevent.
   */
  async share(userId: string, id: string, to: string, message: string) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid document id');
    const recipient = assertRecipient(to);

    const doc = await LegalDocumentModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Document not found');
    if (!doc!.signed_at) fail('FORBIDDEN', 'This contract has not been signed yet.');

    const pdf = await renderPdf(doc);
    const { sendSignedContractEmail } = await import('@services/email/email.service');
    await sendSignedContractEmail({
      to: recipient,
      contract_name: doc!.name,
      sender_name: (await userDisplayOf(userId)).name,
      message: String(message ?? '').trim(),
      pdf,
    });
    return true;
  },
};

/**
 * The contract as a PDF.
 *
 * One function for both versions: before signing it is the contract, after
 * signing it is the same contract with the signature block appended. A separate
 * "unsigned renderer" would be a second document nobody agreed to.
 */
async function renderPdf(doc: ILegalDocument): Promise<Buffer> {
  const { generateContractPdf } = await import('@services/policy/contract.pdf');
  const { settingsService } = await import('@modules/platform/settings/settings.service');
  let brand = 'Duncit';
  try {
    brand = (await settingsService.getBranding()).app_name || brand;
  } catch {
    // Branding is decoration here; a contract still has to print.
  }
  return generateContractPdf({
    brand,
    title: doc.name,
    document_type: doc.document_type,
    content_html: doc.content ?? '',
    updated_at: doc.updated_at?.toISOString?.() ?? null,
    signatories: signatoriesForPdf(doc.signatories),
  });
}
