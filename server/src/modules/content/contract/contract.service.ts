import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { nextEntityNo } from '@modules/venues/entityIdCounter';
import { userDisplayOf } from '@modules/access/user/user.display';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
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
import { CONTRACT_STATUSES, ContractModel, type ContractStatus, type IContract } from './contract.model';

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

const toPub = (c: IContract) => ({
  id: String(c._id),
  contract_no: c.contract_no ?? '',
  title: c.title,
  description: c.description ?? '',
  content: c.content ?? '',
  status: c.status,
  counterparty: c.counterparty ?? '',
  effective_from: c.effective_from ? c.effective_from.toISOString() : null,
  effective_to: c.effective_to ? c.effective_to.toISOString() : null,
  signing_status: c.signed_at ? 'SIGNED' : 'UNSIGNED',
  signed_at: c.signed_at ? c.signed_at.toISOString() : null,
  is_locked: !!c.signed_at,
  signatories: signatoriesToPub(c.signatories),
  // The ids the Contract field resolvers turn into names. Not selectable
  // themselves — the schema exposes only the labels.
  created_by: c.created_by ?? null,
  updated_by: c.updated_by ?? null,
  created_at: c.created_at?.toISOString?.() ?? '',
  updated_at: c.updated_at?.toISOString?.() ?? '',
});

/**
 * Allowlists for the shared table engine (contractsTable — DUNCIT TABLE
 * CONTRACT v1). The id is searchable and filterable because it is the handle
 * people quote to each other; the export follows whatever the table shows.
 */
const CONTRACT_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['contract_no', 'title', 'counterparty', 'description'],
  sortFields: {
    contract_no: 'contract_no',
    title: 'title',
    status: 'status',
    counterparty: 'counterparty',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    contract_no: { type: 'string' },
    title: { type: 'string' },
    status: { type: 'string' },
    counterparty: { type: 'string' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
  },
  defaultSort: { updated_at: -1 },
};

const asStatus = (value: unknown): ContractStatus => {
  const status = String(value ?? '').toUpperCase() as ContractStatus;
  if (!CONTRACT_STATUSES.includes(status)) fail('BAD_USER_INPUT', 'Unknown contract status');
  return status;
};

const asDate = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) fail('BAD_USER_INPUT', 'Invalid date');
  return date;
};

export const contractService = {
  /** Server-side table page (search/filter/sort/paginate) for contractsTable. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IContract>(
      ContractModel,
      {},
      input,
      CONTRACT_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await ContractModel.findById(id);
    return doc ? toPub(doc) : null;
  },

  async create(
    userId: string,
    input: {
      title?: string;
      description?: string;
      content?: string;
      status?: string;
      counterparty?: string;
      effective_from?: string | null;
      effective_to?: string | null;
    }
  ) {
    const title = String(input.title ?? '').trim();
    if (!title) fail('BAD_USER_INPUT', 'Title is required');
    // `create` runs the pre-save hook, which is what mints the id. An
    // insertMany or an upsert would skip it and leave a contract with none.
    const doc = await ContractModel.create({
      title,
      description: String(input.description ?? '').trim(),
      content: input.content ?? '',
      status: input.status ? asStatus(input.status) : 'DRAFT',
      counterparty: String(input.counterparty ?? '').trim(),
      effective_from: asDate(input.effective_from),
      effective_to: asDate(input.effective_to),
      created_by: new Types.ObjectId(userId),
      updated_by: new Types.ObjectId(userId),
    });
    return toPub(doc);
  },

  async update(
    userId: string,
    id: string,
    input: {
      title?: string;
      description?: string;
      content?: string;
      status?: string;
      counterparty?: string;
      effective_from?: string | null;
      effective_to?: string | null;
    }
  ) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid contract id');
    const doc = await ContractModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Contract not found');
    // A signed contract is finished. Editing it would leave a signature
    // attached to words nobody agreed to — the same rule legal documents carry.
    if (doc!.signed_at) {
      fail('FORBIDDEN', 'This contract is signed and can no longer be edited.');
    }

    if (input.title !== undefined) {
      const title = String(input.title).trim();
      if (!title) fail('BAD_USER_INPUT', 'Title is required');
      doc!.title = title;
    }
    if (input.description !== undefined) doc!.description = String(input.description).trim();
    if (input.content !== undefined) doc!.content = input.content;
    if (input.status !== undefined) doc!.status = asStatus(input.status);
    if (input.counterparty !== undefined) doc!.counterparty = String(input.counterparty).trim();
    if (input.effective_from !== undefined) doc!.effective_from = asDate(input.effective_from);
    if (input.effective_to !== undefined) doc!.effective_to = asDate(input.effective_to);
    // The id is never among the editable fields — that is what "immutable" means.
    doc!.updated_by = new Types.ObjectId(userId);
    await doc!.save();
    return toPub(doc);
  },

  /**
   * File a contract away. Allowed on a SIGNED contract, unlike `update`.
   *
   * Archiving is not editing: it changes where a contract sits, not what it
   * says. A lock that blocked it would make the signature the reason an expired
   * contract has to stay in the live list forever, which is the opposite of
   * what the lock is for — so this writes the status itself rather than routing
   * through the guarded edit path.
   */
  async archive(userId: string, id: string) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid contract id');
    const doc = await ContractModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Contract not found');
    doc!.status = 'ARCHIVED';
    doc!.updated_by = new Types.ObjectId(userId);
    await doc!.save();
    return toPub(doc);
  },

  /** Which ways of signing this deployment allows (Admin feature flags). */
  signatureMethods(): Promise<SignatureMethod[]> {
    return allowedSignatureMethods();
  },

  /**
   * Sign the contract as the acting user.
   *
   * The rules live in the shared signing service, the same ones legal documents
   * apply (rule 34): every field required, the date taken from the server, only
   * the methods this platform allows, and the record locked once nobody is left
   * unsigned. What is here is the part that is about a CONTRACT.
   */
  async sign(userId: string, id: string, input: SignatureInput) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid contract id');
    const doc = await ContractModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Contract not found');
    if (doc!.signed_at) fail('FORBIDDEN', 'This contract is already signed.');

    const clean = await validateSignature(input);
    await applySignature(doc!, userId, clean);
    // A signed contract is in force, so it stops being a draft. An ARCHIVED or
    // EXPIRED one keeps the status it was deliberately given.
    if (doc!.status === 'DRAFT') doc!.status = 'ACTIVE';
    doc!.updated_by = new Types.ObjectId(userId);
    await doc!.save();
    return toPub(doc);
  },

  /** The contract as PDF bytes — unsigned before signing, signed after. */
  async pdf(id: string): Promise<Buffer> {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid contract id');
    const doc = await ContractModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Contract not found');
    return renderPdf(doc!);
  },

  /**
   * Email the signed contract to somebody, with the PDF attached.
   *
   * Only once it is signed: sharing a draft as though it were executed is the
   * mistake this whole workflow exists to prevent.
   */
  async share(userId: string, id: string, to: string, message: string) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid contract id');
    const recipient = assertRecipient(to);

    const doc = await ContractModel.findById(id);
    if (!doc) fail('NOT_FOUND', 'Contract not found');
    if (!doc!.signed_at) fail('FORBIDDEN', 'This contract has not been signed yet.');

    const pdf = await renderPdf(doc!);
    const { sendSignedContractEmail } = await import('@services/email/email.service');
    await sendSignedContractEmail({
      to: recipient,
      contract_name: doc!.title,
      sender_name: (await userDisplayOf(userId)).name,
      message: String(message ?? '').trim(),
      pdf,
    });
    return true;
  },

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid contract id');
    const res = await ContractModel.findByIdAndDelete(id);
    // The counter is not rewound: the deleted contract's id stays spent, so it
    // can never be handed to a different contract later.
    return !!res;
  },

  /**
   * Give an id to any contract that somehow has none.
   *
   * The hook that mints them fires on INSERT, so a row written before the id
   * existed — or by a path that bypassed the model — would keep a blank one
   * for good, in the column that is supposed to be its permanent handle.
   * Idempotent: a contract that already has one is left alone.
   */
  async backfillIds(): Promise<{ repaired: number }> {
    const idless = await ContractModel.find({
      $or: [{ contract_no: null }, { contract_no: { $exists: false } }, { contract_no: '' }],
    }).select('_id');
    for (const doc of idless) {
      doc.contract_no = await nextEntityNo('CTR', 'contract');
      await doc.save();
    }
    if (idless.length > 0) {
      logs.server.info('contract', 'backfillIds', { repaired: idless.length });
    }
    return { repaired: idless.length };
  },
};

/**
 * The contract as a PDF.
 *
 * One function for both versions: before signing it is the contract, after
 * signing it is the same contract with the signature block appended. A separate
 * "unsigned renderer" would be a second document nobody agreed to.
 *
 * The counterparty rides in as the document type line, because that is the one
 * thing a reader needs at the top of a contract that a legal document does not
 * have — who it is with.
 */
async function renderPdf(doc: IContract): Promise<Buffer> {
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
    title: doc.title,
    document_type: doc.counterparty || '',
    content_html: doc.content ?? '',
    updated_at: doc.updated_at?.toISOString?.() ?? null,
    signatories: signatoriesForPdf(doc.signatories),
  });
}
