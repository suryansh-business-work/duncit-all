import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  LegalDocumentModel,
  SIGNATURE_METHODS,
  type ILegalDocument,
  type SignatureMethod,
} from './legalDocument.model';
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

/** The upload ceiling from the brief, enforced server-side as well as in the form. */
const MAX_SIGNATURE_BYTES = 5 * 1024 * 1024;

/**
 * The feature flag that switches each signing method on or off.
 *
 * Named rather than derived so the keys are greppable from the Admin screen
 * that toggles them.
 */
const SIGNATURE_METHOD_FLAG: Record<SignatureMethod, string> = {
  DRAW: 'legal_sign_draw',
  TYPE: 'legal_sign_type',
  UPLOAD: 'legal_sign_upload',
};

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
    signing_status: doc.signed_at ? 'SIGNED' : 'UNSIGNED',
    signed_at: doc.signed_at ? doc.signed_at.toISOString() : null,
    is_locked: !!doc.signed_at,
    signatories: [...doc.signatories].map((s) => ({
      id: String(s._id),
      full_name: s.full_name ?? '',
      designation: s.designation ?? '',
      email: s.email ?? '',
      initials: s.initials ?? '',
      signature_image: s.signature_image ?? '',
      signature_method: s.signature_method ?? null,
      signed_at: s.signed_at ? s.signed_at.toISOString() : null,
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
    // A signed contract is finished. Editing it would leave a signature
    // attached to words nobody agreed to.
    if (doc!.signed_at) {
      fail('FORBIDDEN', 'This contract is signed and can no longer be edited.');
    }
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

  /**
   * Which ways of signing this deployment allows.
   *
   * Read from the feature flags an admin already manages, so "respect system
   * configuration" is a switch somebody can throw rather than a redeploy. All
   * three are offered when nothing has been configured — a flag nobody has
   * created must not silently leave the portal with no way to sign at all.
   */
  async signatureMethods(): Promise<SignatureMethod[]> {
    const { settingsService } = await import('@modules/platform/settings/settings.service');
    const flags = await settingsService.listPublicFlags();
    const byKey = new Map(flags.map((f: any) => [f.key, !!f.enabled]));
    const allowed = SIGNATURE_METHODS.filter((method) => {
      const flag = SIGNATURE_METHOD_FLAG[method];
      return byKey.has(flag) ? byKey.get(flag) : true;
    });
    return allowed;
  },

  /**
   * Sign the contract as the acting user.
   *
   * Every field is required because a signature without a name, a role and a
   * date is not evidence of anything. The signing date is taken from the
   * server, not the form: a date the signer can type is a date the signer can
   * choose.
   *
   * Signing fills this person's row — creating one if they were not on the
   * list — and the contract locks only when NOBODY is left unsigned. Today
   * that is one person; the rule is already the multi-party one.
   */
  async sign(
    userId: string,
    id: string,
    input: {
      full_name?: string;
      designation?: string;
      initials?: string;
      signature_image?: string;
      signature_method?: string;
    }
  ) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid document id');
    const doc = await LegalDocumentModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Document not found');
    if (doc!.signed_at) fail('FORBIDDEN', 'This contract is already signed.');

    const fullName = String(input.full_name ?? '').trim();
    const designation = String(input.designation ?? '').trim();
    const initials = String(input.initials ?? '').trim();
    const image = String(input.signature_image ?? '').trim();
    const method = String(input.signature_method ?? '').toUpperCase() as SignatureMethod;

    if (!fullName) fail('BAD_USER_INPUT', 'Full name is required');
    if (!designation) fail('BAD_USER_INPUT', 'Designation is required');
    if (!initials) fail('BAD_USER_INPUT', 'Initials are required');
    if (!image) fail('BAD_USER_INPUT', 'A signature is required');
    if (!SIGNATURE_METHODS.includes(method)) fail('BAD_USER_INPUT', 'Unknown signature method');

    const allowed = await this.signatureMethods();
    if (!allowed.includes(method)) {
      fail('FORBIDDEN', `Signing by ${method.toLowerCase()} is switched off for this platform.`);
    }
    assertSignatureSize(image);

    const user = await UserModel.findById(userId).select('auth.email');
    const email = String((user as any)?.auth?.email ?? '');
    const mine = doc!.signatories.find(
      (s) => String(s.user_id ?? '') === String(userId) || (!!email && s.email === email)
    );
    const now = new Date();
    const filled = {
      user_id: new Types.ObjectId(userId),
      full_name: fullName,
      designation,
      email,
      initials,
      signature_image: image,
      signature_method: method,
      signed_at: now,
    };
    if (mine) Object.assign(mine, filled);
    else doc!.signatories.push(filled as any);

    // Finalised only when nobody is still owed a signature.
    const outstanding = doc!.signatories.some((s) => !s.signed_at);
    if (!outstanding) doc!.signed_at = now;

    await doc!.save();
    return toPub(doc);
  },

  /** The contract as PDF bytes — unsigned before signing, signed after. */
  async pdf(id: string): Promise<Buffer> {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid document id');
    const doc = await LegalDocumentModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Document not found');
    return renderPdf(doc!);
  },

  /**
   * Email the signed contract to somebody, with the PDF attached.
   *
   * Only once it is signed: sharing a draft as though it were executed is the
   * mistake this whole workflow exists to prevent.
   */
  async share(userId: string, id: string, to: string, message: string) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid document id');
    const recipient = String(to ?? '').trim();
    if (!/^\S+@\S+\.\S+$/.test(recipient)) fail('BAD_USER_INPUT', 'Enter a valid email address');

    const doc = await LegalDocumentModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Document not found');
    if (!doc!.signed_at) fail('FORBIDDEN', 'This contract has not been signed yet.');

    const pdf = await renderPdf(doc!);
    const { sendSignedContractEmail } = await import('@services/email/email.service');
    await sendSignedContractEmail({
      to: recipient,
      contract_name: doc!.name,
      sender_name: await actorName(userId),
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
    signatories: doc.signatories.map((s) => ({
      full_name: s.full_name,
      designation: s.designation,
      initials: s.initials,
      signature_image: s.signature_image,
      signed_at: s.signed_at,
    })),
  });
}

/** Roughly how many bytes a base64 payload decodes to, without decoding it. */
function assertSignatureSize(image: string) {
  const base64 = image.startsWith('data:') ? (image.split(',')[1] ?? '') : '';
  if (!base64) return; // A hosted URL carries no bytes here.
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > MAX_SIGNATURE_BYTES) {
    fail('BAD_USER_INPUT', 'Signature image must be smaller than 5 MB');
  }
}
