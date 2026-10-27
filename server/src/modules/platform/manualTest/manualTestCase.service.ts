import type { Types } from 'mongoose';
import { logs } from '@observability/log';
import { validate } from '@utils/validate';
import { withTransaction } from '@utils/mongoTransaction';
import { escapedSearchRegex, runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { UserModel } from '@modules/access/user/user.model';
import { E2eFlowModel } from '@modules/platform/e2eFlow/e2eFlow.model';
import { PORTAL_REGISTRY } from '@modules/platform/portalMode/portalMode.registry';
import { MANUAL_TEST_LIMITS as L, MANUAL_TEST_ROLES } from './manualTest.constants';
import { ManualTestCaseModel, ManualTestColumnModel, ManualTestCommentModel } from './manualTest.model';
import {
  CARD_PROJECTION,
  badInput,
  cardPub,
  casePub,
  columnPub,
  conflict,
  notFound,
  peopleOf,
  requireId,
  type CardRecord,
  type CaseRecord,
  type LinkedFlow,
} from './manualTest.pub';
import { manualTestColumnService } from './manualTestColumn.service';
import { assertFlowLink, assertStaff, bottomRank, caseSet, isExecution, nextCaseKey } from './manualTestCase.rules';
import { caseCreateSchema, caseUpdateSchema, type CaseCreateInput, type CaseUpdateInput } from './manualTest.validator';

const TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['key', 'title', 'labels'],
  sortFields: {
    key: 'number',
    title: 'title',
    type: 'type',
    priority: 'priority_weight',
    surface: 'surface',
    environment: 'environment',
    due_date: 'due_date',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  filterFields: {
    key: { type: 'string' },
    title: { type: 'string' },
    type: { type: 'enum' },
    priority: { type: 'enum' },
    column_id: { type: 'enum' },
    assignee_id: { type: 'enum' },
    surface: { type: 'enum' },
    environment: { type: 'enum' },
    labels: { type: 'string' },
    due_date: { type: 'date' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
  },
  defaultSort: { updated_at: -1 },
};

const TABLE_PROJECTION: Record<string, 1> = Object.fromEntries(CARD_PROJECTION.split(' ').map((field) => [field, 1]));

/** The E2E journey a case points at, by name — one read of one flow. */
async function linkedFlow(doc: Pick<CaseRecord, 'e2e_flow_id' | 'e2e_sub_flow_id'>): Promise<LinkedFlow> {
  if (!doc.e2e_flow_id) return { flow: null, sub_flow: null };
  const flow = await E2eFlowModel.findById(doc.e2e_flow_id).select('name sub_flows._id sub_flows.name').lean();
  if (!flow) return { flow: null, sub_flow: null };
  const sub = (flow.sub_flows ?? []).find((item) => String(item._id) === String(doc.e2e_sub_flow_id));
  return {
    flow: { id: String(flow._id), name: flow.name },
    sub_flow: sub ? { id: String(sub._id), name: sub.name } : null,
  };
}

/** A whole case, as its page reads it. */
async function detail(doc: CaseRecord) {
  const [people, column, linked] = await Promise.all([
    peopleOf([doc.assignee_id, doc.reporter_id]),
    ManualTestColumnModel.findById(doc.column_id).lean(),
    linkedFlow(doc),
  ]);
  return casePub(doc, people, column ? columnPub(column) : null, linked);
}

/** A changed column: where the case lands, and whether that is an execution. */
async function columnChange(columnId: string, from: Types.ObjectId | null): Promise<Record<string, unknown>> {
  const [target, source] = await Promise.all([
    ManualTestColumnModel.findById(columnId).select('category').lean(),
    from ? ManualTestColumnModel.findById(from).select('category').lean() : null,
  ]);
  if (!target) throw notFound('Column');
  const set: Record<string, unknown> = { column_id: columnId, rank: await bottomRank(columnId) };
  if (isExecution(target.category, source?.category ?? null)) set.executed_at = new Date();
  return set;
}

export const manualTestCaseService = {
  /** One case by its key (`QA-12`, any case), or null. */
  async get(key: string) {
    const normalized = key.trim().toUpperCase();
    if (!normalized || normalized.length > 30) return null;
    const doc = await ManualTestCaseModel.findOne({ key: normalized }).lean();
    return doc ? detail(doc) : null;
  },

  async create(input: unknown, reporterId: string) {
    const data = await validate<CaseCreateInput>(caseCreateSchema, input);
    const column = data.column_id
      ? await ManualTestColumnModel.findById(data.column_id).select('_id').lean()
      : await ManualTestColumnModel.findOne().sort({ order: 1, _id: 1 }).select('_id').lean();
    if (!column) throw data.column_id ? notFound('Column') : badInput('The board has no columns yet');
    await Promise.all([
      assertStaff([data.assignee_id, data.reporter_id]),
      assertFlowLink(data.e2e_flow_id, data.e2e_sub_flow_id),
    ]);
    const placement = await columnChange(String(column._id), null);
    const { number, key } = await nextCaseKey();
    const doc = await ManualTestCaseModel.create({
      ...caseSet(data),
      // Whoever files a case reports it, unless they name someone else.
      reporter_id: data.reporter_id ?? reporterId,
      ...placement,
      number,
      key,
    });
    logs.server.info('manualTest', 'createCase', { key, type: doc.type });
    return detail(doc.toObject());
  },

  /**
   * Change some fields of a case. With `expectedUpdatedAt`, a case someone else
   * saved in the meantime is refused (CONFLICT) instead of silently overwritten.
   */
  async update(id: string, input: unknown, expectedUpdatedAt?: string | null) {
    requireId(id, 'Case');
    const data = await validate<CaseUpdateInput>(caseUpdateSchema, input);
    const current = await ManualTestCaseModel.findById(id).select('column_id e2e_flow_id updated_at').lean();
    if (!current) throw notFound('Case');
    if (expectedUpdatedAt && current.updated_at.toISOString() !== expectedUpdatedAt) {
      throw conflict('Someone else changed this case. Reload it to see their changes.');
    }
    const flowChanges = data.e2e_flow_id !== undefined || data.e2e_sub_flow_id !== undefined;
    const flowId = data.e2e_flow_id === undefined ? current.e2e_flow_id && String(current.e2e_flow_id) : data.e2e_flow_id;
    await Promise.all([
      assertStaff([data.assignee_id, data.reporter_id]),
      flowChanges ? assertFlowLink(flowId, data.e2e_sub_flow_id) : Promise.resolve(),
    ]);
    const moves = Boolean(data.column_id) && String(current.column_id) !== data.column_id;
    const set = { ...caseSet(data), ...(moves && data.column_id ? await columnChange(data.column_id, current.column_id) : {}) };
    const doc = await ManualTestCaseModel.findOneAndUpdate(
      { _id: id, updated_at: current.updated_at },
      { $set: set },
      { new: true }
    ).lean();
    if (!doc) throw conflict('Someone else changed this case. Reload it to see their changes.');
    return detail(doc);
  },

  /** Delete a case and its comments together. */
  async remove(id: string): Promise<boolean> {
    requireId(id, 'Case');
    const key = await withTransaction(async (session) => {
      const deleted = await ManualTestCaseModel.findOneAndDelete({ _id: id }, { session }).select('key').lean();
      if (!deleted) throw notFound('Case');
      await ManualTestCommentModel.deleteMany({ case_id: id }, { session });
      return deleted.key;
    });
    logs.server.info('manualTest', 'deleteCase', { key });
    return true;
  },

  /** Every case, as the Cases table pages through them. */
  async table(input?: TableQueryInput | null) {
    const page = await runTableQuery<CardRecord>(ManualTestCaseModel, {}, input, TABLE_CONFIG, {
      projection: TABLE_PROJECTION,
    });
    const [people, columns] = await Promise.all([
      peopleOf(page.docs.map((doc) => doc.assignee_id)),
      manualTestColumnService.byId(),
    ]);
    return {
      rows: page.docs.map((doc) => cardPub(doc, people, columns)),
      total: page.total,
      page: page.page,
      page_size: page.page_size,
    };
  },

  /** Labels already in use, for the label autocomplete. */
  async labels(search?: string | null): Promise<string[]> {
    const needle = (search ?? '').trim().slice(0, L.labelMax);
    const values: string[] = await ManualTestCaseModel.distinct(
      'labels',
      needle ? { labels: escapedSearchRegex(needle) } : {}
    );
    const lower = needle.toLowerCase();
    return values
      .filter((label) => !lower || label.toLowerCase().includes(lower))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, L.labelsListed);
  },

  /** Active Tests staff — who a case can be assigned to or reported by. */
  async assignees() {
    const staff = await UserModel.find({
      'metadata.role_keys': { $in: MANUAL_TEST_ROLES },
      'metadata.status': 'ACTIVE',
    })
      .select('_id')
      .limit(L.assigneesMax)
      .lean();
    const people = await peopleOf(staff.map((user) => user._id));
    return [...people.entries()]
      .map(([id, person]) => ({ id, name: person.name, photo: person.photo }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  },

  /** The consoles and apps a case can be about — the platform's surface registry. */
  surfaces() {
    return PORTAL_REGISTRY.map((entry) => ({ key: entry.key, name: entry.name, kind: entry.kind }));
  },
};
