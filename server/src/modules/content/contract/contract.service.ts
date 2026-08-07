import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { nextEntityNo } from '@modules/venues/entityIdCounter';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
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
  created_by_name: c.created_by_name ?? '',
  updated_by_name: c.updated_by_name ?? '',
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

async function actorName(userId: string): Promise<string> {
  const user = await UserModel.findById(userId).select('profile.first_name profile.last_name').lean();
  const profile = (user as any)?.profile ?? {};
  return [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || 'Unknown';
}

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
    const who = await actorName(userId);
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
      created_by_name: who,
      updated_by: new Types.ObjectId(userId),
      updated_by_name: who,
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
    doc!.updated_by_name = await actorName(userId);
    await doc!.save();
    return toPub(doc);
  },

  async archive(userId: string, id: string) {
    return this.update(userId, id, { status: 'ARCHIVED' });
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
