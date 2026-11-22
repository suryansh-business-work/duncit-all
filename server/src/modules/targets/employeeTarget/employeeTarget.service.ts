/**
 * Monthly employee targets — the Targets console sets them, the employee
 * reports against them, the console reviews the report.
 *
 * Two audiences, one record. Every employee-side read and write is scoped to
 * the caller's OWN id from the verified session (never an id from the client),
 * so an employee cannot reach anybody else's month by asking for it. Every
 * write names the revision it was made against: a report and a review racing
 * each other cannot silently overwrite one another.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { logs } from '@observability/log';
import { appFormat } from '@utils/app-time';
import { isDuplicateKeyError } from '@utils/mongo-error';
import { escapedSearchRegex, runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { UserModel } from '@modules/access/user/user.model';
import { userDisplayOf } from '@modules/access/user/user.display';
import { EmployeeTargetModel, type IEmployeeTarget, type ITargetPerson } from './employeeTarget.model';
import { toTargetRow } from './employeeTarget.mapper';
import { employeeTargetSettingsService } from './employeeTarget.settings';
import {
  assignSchema,
  canEditGoals,
  canReopen,
  canReview,
  canSubmit,
  parseInput,
  reminderMonthsFor,
  reviewSchema,
  submitSchema,
  updateSchema,
} from './employeeTarget.rules';

const LIVE = { live: true };
const ASSIGNABLE_LIMIT = 20;
const SEARCH_MAX = 80;

function fail(code: string, message: string): never {
  throw new GraphQLError(message, { extensions: { code } });
}

/** employeeTargetsTable / myEmployeeTargetsTable — DUNCIT TABLE CONTRACT v1. */
export const EMPLOYEE_TARGET_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['employee.name', 'employee.email', 'goals.title', 'notes'],
  sortFields: {
    month: 'month',
    employee_name: 'employee.name',
    status: 'status',
    completion_percent: 'submission.completion_percent',
    submitted_at: 'submission.submitted_at',
    created_at: 'created_at',
  },
  filterFields: {
    month: { type: 'string' },
    status: { type: 'enum' },
    employee_name: { path: 'employee.name', type: 'string' },
    employee_email: { path: 'employee.email', type: 'string' },
    completion_percent: { path: 'submission.completion_percent', type: 'number' },
    submitted_at: { path: 'submission.submitted_at', type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { month: -1, created_at: -1 },
};

function objectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid target id');
  return new Types.ObjectId(id);
}

/** Today in the admin's time zone, as `YYYY-MM-DD` — never the container's UTC day. */
export const todayKey = (now: Date = new Date()): string => appFormat(now, 'yyyy-MM-dd');

/** The months whose reminder window is open today. */
async function dueMonths(): Promise<Set<string>> {
  return new Set(reminderMonthsFor(todayKey(), await employeeTargetSettingsService.window()));
}

/** The signed-in person as the record names them — read from their account, never the payload. */
async function actorOf(user: AuthUser): Promise<ITargetPerson> {
  const display = await userDisplayOf(user.id);
  return { user_id: new Types.ObjectId(user.id), name: display.name, email: user.email ?? null };
}

/** The employee a target is for: an ACTIVE account holding the EMPLOYEE role. */
async function assignee(employeeId: string): Promise<ITargetPerson> {
  if (!Types.ObjectId.isValid(employeeId)) fail('BAD_USER_INPUT', 'Invalid employee id');
  const user = await UserModel.findOne({
    _id: new Types.ObjectId(employeeId),
    'metadata.role_keys': 'EMPLOYEE',
    'metadata.status': 'ACTIVE',
  })
    .select('profile.first_name profile.last_name auth.email')
    .lean<{ _id: Types.ObjectId; profile?: { first_name?: string; last_name?: string }; auth?: { email?: string } }>();
  if (!user) fail('BAD_USER_INPUT', 'Choose an active employee');
  const name = `${user.profile?.first_name ?? ''} ${user.profile?.last_name ?? ''}`.trim();
  return { user_id: user._id, name, email: user.auth?.email ?? null };
}

async function liveDoc(id: string, ownerId?: string): Promise<IEmployeeTarget> {
  const scope = ownerId ? { 'employee.user_id': new Types.ObjectId(ownerId) } : {};
  const doc = await EmployeeTargetModel.findOne({ _id: objectId(id), ...LIVE, ...scope }).lean<IEmployeeTarget>();
  if (!doc) fail('NOT_FOUND', 'Target not found');
  return doc;
}

const conflict = (): never => fail('CONFLICT', 'This target was changed by someone else. Reload it and try again.');

/** Apply `update` only if the record is still at `revision`; CONFLICT otherwise. */
async function writeAt(doc: IEmployeeTarget, revision: number, update: Record<string, unknown>): Promise<IEmployeeTarget> {
  const updated = await EmployeeTargetModel.findOneAndUpdate(
    { _id: doc._id, ...LIVE, revision },
    { $set: update, $inc: { revision: 1 } },
    { new: true }
  ).lean<IEmployeeTarget>();
  return updated ?? conflict();
}

async function byRequest(userId: string, requestId: string | null): Promise<IEmployeeTarget | null> {
  if (!requestId) return null;
  return EmployeeTargetModel.findOne({
    'assigned_by.user_id': new Types.ObjectId(userId),
    client_request_id: requestId,
  }).lean<IEmployeeTarget>();
}

const duplicateMonth = (): never =>
  fail('CONFLICT', 'This employee already has a target for that month. Open it to change the goals.');

async function rows(docs: IEmployeeTarget[]) {
  const due = await dueMonths();
  return docs.map((doc) => toTargetRow(doc, due));
}

async function tablePage(base: Record<string, unknown>, query: TableQueryInput | undefined) {
  const page = await runTableQuery<IEmployeeTarget>(EmployeeTargetModel, base, query, EMPLOYEE_TARGET_TABLE_CONFIG, {
    projection: { client_request_id: 0 },
  });
  return { rows: await rows(page.docs), total: page.total, page: page.page, page_size: page.page_size };
}

async function one(doc: IEmployeeTarget) {
  return toTargetRow(doc, await dueMonths());
}

export const employeeTargetService = {
  // ---- Targets console --------------------------------------------------
  table: (query: TableQueryInput | undefined) => tablePage(LIVE, query),

  byId: async (id: string) => one(await liveDoc(id)),

  /** ACTIVE accounts with the EMPLOYEE role, for the Assign picker — minimal fields, a short list. */
  async assignable(search: string | null | undefined) {
    const term = (search ?? '').trim().slice(0, SEARCH_MAX);
    const filter: Record<string, unknown> = { 'metadata.role_keys': 'EMPLOYEE', 'metadata.status': 'ACTIVE' };
    if (term) {
      const rx = escapedSearchRegex(term);
      filter.$or = [{ 'profile.first_name': rx }, { 'profile.last_name': rx }, { 'auth.email': rx }];
    }
    const users = await UserModel.find(filter)
      .select('profile.first_name profile.last_name profile.profile_photo auth.email')
      .sort({ 'profile.first_name': 1, _id: 1 })
      .limit(ASSIGNABLE_LIMIT)
      .lean<
        { _id: Types.ObjectId; profile?: { first_name?: string; last_name?: string; profile_photo?: string }; auth?: { email?: string } }[]
      >();
    return users.map((u) => ({
      id: String(u._id),
      name: `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim(),
      email: u.auth?.email ?? null,
      photo: u.profile?.profile_photo ?? null,
    }));
  },

  /** One target per employee per month; a repeated press of Assign returns the first record. */
  async assign(raw: unknown, user: AuthUser) {
    const input = parseInput(assignSchema, raw);
    const prior = await byRequest(user.id, input.client_request_id);
    if (prior) return one(prior);
    const employee = await assignee(input.employee_id);
    const taken = await EmployeeTargetModel.exists({ 'employee.user_id': employee.user_id, month: input.month, ...LIVE });
    if (taken) {
      // The month may be taken by this very press, landed a moment ago by a racing twin.
      const twin = await byRequest(user.id, input.client_request_id);
      return twin ? one(twin) : duplicateMonth();
    }
    try {
      const doc = await EmployeeTargetModel.create({
        employee,
        month: input.month,
        goals: input.goals,
        notes: input.notes,
        assigned_by: await actorOf(user),
        client_request_id: input.client_request_id,
      });
      logs.server.info('employeeTarget.service', 'assigned', { id: String(doc._id), userId: user.id, month: input.month });
      return one(doc.toObject() as IEmployeeTarget);
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      // Two presses raced past the lookups; the unique indexes let one through.
      const winner = await byRequest(user.id, input.client_request_id);
      return winner ? one(winner) : duplicateMonth();
    }
  },

  /** Goals and notes, only while nothing has been reported against them. */
  async update(id: string, raw: unknown, user: AuthUser) {
    const input = parseInput(updateSchema, raw);
    const current = await liveDoc(id);
    if (!canEditGoals(current.status)) {
      fail('BAD_REQUEST', 'Goals cannot change once the employee has reported progress.');
    }
    const updated = await writeAt(current, input.expected_revision, {
      goals: input.goals,
      notes: input.notes,
      last_edited_by: await actorOf(user),
      last_edited_at: new Date(),
    });
    logs.server.info('employeeTarget.service', 'updated', { id, userId: user.id });
    return one(updated);
  },

  async review(id: string, raw: unknown, user: AuthUser) {
    const input = parseInput(reviewSchema, raw);
    const current = await liveDoc(id);
    if (!canReview(current.status)) fail('BAD_REQUEST', 'Only a submitted target can be reviewed.');
    const updated = await writeAt(current, input.expected_revision, {
      status: 'REVIEWED',
      review: { comment: input.comment, reviewed_by: await actorOf(user), reviewed_at: new Date() },
    });
    logs.server.info('employeeTarget.service', 'reviewed', { id, userId: user.id });
    return one(updated);
  },

  /** Hands a reviewed month back to the employee to correct; the review is cleared. */
  async reopen(id: string, expectedRevision: number, user: AuthUser) {
    const { expected_revision: revision } = parseInput(reviewSchema, { expected_revision: expectedRevision });
    const current = await liveDoc(id);
    if (!canReopen(current.status)) fail('BAD_REQUEST', 'Only a reviewed target can be reopened.');
    const updated = await writeAt(current, revision, { status: 'SUBMITTED', review: null });
    logs.server.info('employeeTarget.service', 'reopened', { id, userId: user.id });
    return one(updated);
  },

  /** Hidden from both consoles, never erased. */
  async remove(id: string, user: AuthUser): Promise<boolean> {
    const current = await liveDoc(id);
    await EmployeeTargetModel.updateOne(
      { _id: current._id, ...LIVE },
      { $set: { live: false, deleted_at: new Date(), deleted_by: new Types.ObjectId(user.id) }, $inc: { revision: 1 } }
    );
    logs.server.info('employeeTarget.service', 'deleted', { id, userId: user.id });
    return true;
  },

  // ---- Employee console (always the caller's own) -----------------------
  myTable: (userId: string, query: TableQueryInput | undefined) =>
    tablePage({ ...LIVE, 'employee.user_id': new Types.ObjectId(userId) }, query),

  myById: async (id: string, userId: string) => one(await liveDoc(id, userId)),

  /** The caller's targets still unsubmitted inside an open reminder window — the banner's source. */
  async myDue(userId: string) {
    const due = await dueMonths();
    if (due.size === 0) return [];
    const docs = await EmployeeTargetModel.find({
      ...LIVE,
      'employee.user_id': new Types.ObjectId(userId),
      status: 'ASSIGNED',
      month: { $in: [...due] },
    })
      .sort({ month: 1 })
      .lean<IEmployeeTarget[]>();
    return docs.map((doc) => toTargetRow(doc, due));
  },

  /** Report (or correct the report) until an admin has reviewed it. */
  async submit(id: string, raw: unknown, userId: string) {
    const input = parseInput(submitSchema, raw);
    const current = await liveDoc(id, userId);
    if (!canSubmit(current.status)) fail('BAD_REQUEST', 'This month has been reviewed and can no longer be changed.');
    const updated = await writeAt(current, input.expected_revision, {
      status: 'SUBMITTED',
      submission: {
        completion_percent: input.completion_percent,
        achievements: input.achievements,
        updates: input.updates,
        submitted_at: new Date(),
        submitted_by: new Types.ObjectId(userId),
        submission_count: (current.submission?.submission_count ?? 0) + 1,
      },
    });
    logs.server.info('employeeTarget.service', 'submitted', { id, userId, percent: input.completion_percent });
    return one(updated);
  },

  syncIndexes: () => EmployeeTargetModel.syncIndexes(),
};
