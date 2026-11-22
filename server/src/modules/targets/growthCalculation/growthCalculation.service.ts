import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { logs } from '@observability/log';
import { isDuplicateKeyError } from '@utils/mongo-error';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { userDisplayOf } from '@modules/access/user/user.display';
import { GrowthCalculationModel, type IGrowthActor, type IGrowthCalculation } from './growthCalculation.model';
import { canEditGrowth, outputsForWrite, toGrowthRow } from './growthCalculation.mapper';
import {
  GROWTH_FORMULA_VERSION,
  computeGrowth,
  validateGrowthInputs,
  type GrowthInputs,
} from './growthCalculation.rules';
import { GROWTH_DESCRIPTION_MAX, GROWTH_TITLE_MAX } from './growthCalculation.formula';

const REQUEST_ID_MAX = 100;

export interface GrowthSaveInput {
  title: string;
  description?: string | null;
  inputs: Partial<Record<keyof GrowthInputs, unknown>>;
  client_request_id?: string | null;
}

export interface GrowthUpdateInput extends Omit<GrowthSaveInput, 'client_request_id'> {
  expected_revision: number;
}

function fail(code: string, message: string): never {
  throw new GraphQLError(message, { extensions: { code } });
}

/** Saved Calculations (growthCalculationsTable — DUNCIT TABLE CONTRACT v1). */
export const GROWTH_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['title', 'description', 'calculated_by.name'],
  sortFields: {
    title: 'title',
    created_at: 'created_at',
    calculated_by_name: 'calculated_by.name',
    cities: 'totals.cities',
    venues: 'totals.venues',
    hosts: 'totals.hosts',
    monthly_pods: 'totals.monthly_pods',
    host_leads: 'totals.host_leads',
    venue_leads: 'totals.venue_leads',
    monthly_gmv: 'totals.monthly_gmv',
    monthly_earnings: 'totals.monthly_earnings',
  },
  filterFields: {
    title: { type: 'string' },
    calculated_by_name: { path: 'calculated_by.name', type: 'string' },
    created_at: { type: 'date' },
    cities: { path: 'totals.cities', type: 'number' },
    venues: { path: 'totals.venues', type: 'number' },
    hosts: { path: 'totals.hosts', type: 'number' },
    monthly_pods: { path: 'totals.monthly_pods', type: 'number' },
    host_leads: { path: 'totals.host_leads', type: 'number' },
    venue_leads: { path: 'totals.venue_leads', type: 'number' },
    monthly_gmv: { path: 'totals.monthly_gmv', type: 'number' },
    monthly_earnings: { path: 'totals.monthly_earnings', type: 'number' },
  },
  defaultSort: { created_at: -1 },
};

const LIVE = { deleted_at: null };

function cleanTitle(raw: unknown): string {
  const title = typeof raw === 'string' ? raw.trim() : '';
  if (!title) fail('BAD_USER_INPUT', 'Title is required');
  if (title.length > GROWTH_TITLE_MAX) fail('BAD_USER_INPUT', `Title must be at most ${GROWTH_TITLE_MAX} characters`);
  return title;
}

function cleanDescription(raw: unknown): string {
  const description = typeof raw === 'string' ? raw.trim() : '';
  if (description.length > GROWTH_DESCRIPTION_MAX) {
    fail('BAD_USER_INPUT', `Description must be at most ${GROWTH_DESCRIPTION_MAX} characters`);
  }
  return description;
}

function cleanRequestId(raw: unknown): string | null {
  const id = typeof raw === 'string' ? raw.trim() : '';
  if (!id) return null;
  if (id.length > REQUEST_ID_MAX) fail('BAD_USER_INPUT', 'client_request_id is too long');
  return id;
}

function objectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid calculation id');
  return new Types.ObjectId(id);
}

/** The signed-in person as the record names them — read from their account, never the payload. */
async function actorOf(user: AuthUser): Promise<IGrowthActor> {
  const display = await userDisplayOf(user.id);
  return {
    user_id: new Types.ObjectId(user.id),
    name: display.name,
    email: user.email ?? null,
    roles: [...user.roles],
  };
}

/** Title, description and the inputs checked, with every output recalculated here. */
function prepare(input: GrowthSaveInput) {
  const title = cleanTitle(input.title);
  const description = cleanDescription(input.description);
  const inputs = validateGrowthInputs(input.inputs ?? {});
  return { title, description, inputs, ...outputsForWrite(computeGrowth(inputs)), formula_version: GROWTH_FORMULA_VERSION };
}

async function liveDoc(id: string): Promise<IGrowthCalculation> {
  const doc = await GrowthCalculationModel.findOne({ _id: objectId(id), ...LIVE }).lean<IGrowthCalculation>();
  if (!doc) fail('NOT_FOUND', 'Calculation not found');
  return doc;
}

function assertCanEdit(doc: IGrowthCalculation, user: AuthUser): void {
  if (!canEditGrowth(doc, user)) fail('FORBIDDEN', 'Only the person who saved this calculation can change it');
}

async function existingRequest(userId: string, requestId: string | null): Promise<IGrowthCalculation | null> {
  if (!requestId) return null;
  return GrowthCalculationModel.findOne({
    'calculated_by.user_id': new Types.ObjectId(userId),
    client_request_id: requestId,
  }).lean<IGrowthCalculation>();
}

async function create(
  input: GrowthSaveInput,
  user: AuthUser,
  duplicatedFrom: Types.ObjectId | null
): Promise<IGrowthCalculation> {
  const fields = prepare(input);
  const requestId = cleanRequestId(input.client_request_id);
  // A repeated press of the same Save — a double click, a retried request.
  const prior = await existingRequest(user.id, requestId);
  if (prior) return prior;
  try {
    const doc = await GrowthCalculationModel.create({
      ...fields,
      calculated_by: await actorOf(user),
      duplicated_from: duplicatedFrom,
      client_request_id: requestId,
    });
    logs.server.info('growthCalculation.service', 'saved', { id: String(doc._id), userId: user.id, duplicatedFrom });
    return doc.toObject() as IGrowthCalculation;
  } catch (error) {
    // Two presses raced past the lookup; the unique index let exactly one through.
    if (isDuplicateKeyError(error)) {
      const winner = await existingRequest(user.id, requestId);
      if (winner) return winner;
    }
    throw error;
  }
}

export const growthCalculationService = {
  preview(inputs: GrowthSaveInput['inputs']) {
    return computeGrowth(validateGrowthInputs(inputs ?? {}));
  },

  async table(query: TableQueryInput | undefined, viewer: AuthUser) {
    const page = await runTableQuery<IGrowthCalculation>(GrowthCalculationModel, LIVE, query, GROWTH_TABLE_CONFIG, {
      projection: { client_request_id: 0 },
    });
    return {
      rows: page.docs.map((doc) => toGrowthRow(doc, viewer)),
      total: page.total,
      page: page.page,
      page_size: page.page_size,
    };
  },

  async byId(id: string, viewer: AuthUser) {
    return toGrowthRow(await liveDoc(id), viewer);
  },

  async save(input: GrowthSaveInput, user: AuthUser) {
    return toGrowthRow(await create(input, user, null), user);
  },

  /**
   * Recalculates the record from the edited inputs. The creator and creation
   * date never change; the editor is stamped beside them, and the write only
   * lands if nobody else saved the record since this editor loaded it.
   */
  async update(id: string, input: GrowthUpdateInput, user: AuthUser) {
    const current = await liveDoc(id);
    assertCanEdit(current, user);
    const expected = input.expected_revision;
    if (!Number.isInteger(expected) || expected < 0) fail('BAD_USER_INPUT', 'expected_revision must be a whole number');
    const fields = prepare(input);
    const updated = await GrowthCalculationModel.findOneAndUpdate(
      { _id: current._id, ...LIVE, revision: expected },
      { $set: { ...fields, last_edited_by: await actorOf(user), last_edited_at: new Date() }, $inc: { revision: 1 } },
      { new: true }
    ).lean<IGrowthCalculation>();
    if (!updated) fail('CONFLICT', 'This calculation was changed by someone else. Reload it and try again.');
    logs.server.info('growthCalculation.service', 'updated', { id, userId: user.id });
    return toGrowthRow(updated, user);
  },

  /** A separate record from another one's inputs, recalculated under today's rules. */
  async duplicate(id: string, title: string, requestId: string | null | undefined, user: AuthUser) {
    const source = await liveDoc(id);
    const copy = await create(
      { title, description: source.description, inputs: source.inputs, client_request_id: requestId },
      user,
      source._id
    );
    return toGrowthRow(copy, user);
  },

  /** Hidden from the list, never erased: a target set against it can still be traced. */
  async remove(id: string, user: AuthUser): Promise<boolean> {
    const current = await liveDoc(id);
    assertCanEdit(current, user);
    await GrowthCalculationModel.updateOne(
      { _id: current._id, ...LIVE },
      { $set: { deleted_at: new Date(), deleted_by: new Types.ObjectId(user.id) } }
    );
    logs.server.info('growthCalculation.service', 'deleted', { id, userId: user.id });
    return true;
  },

  syncIndexes: () => GrowthCalculationModel.syncIndexes(),
};
