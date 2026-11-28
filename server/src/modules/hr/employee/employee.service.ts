/**
 * HR console reads: the directory, one person's whole profile, the pickers
 * the forms need and the dashboard counts. Every read is HR-only (the
 * resolver gates it); the slices other consoles may see live in jobIndex.
 */
import { Types } from 'mongoose';
import { escapedSearchRegex, runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { UserModel } from '@modules/access/user/user.model';
import { consoleUrl } from '@modules/platform/portalMode/portalMode.links';
import { TeamStructureModel, TeamStructureNodeModel, type ITeamStructure, type ITeamStructureNode } from '@modules/hr/teamStructure/teamStructure.model';
import { employeeTargetService } from '@modules/targets/employeeTarget/employeeTarget.service';
import { HrEmployeeModel, type IHrEmployee } from './employee.model';
import { HR_GRANTED_ROLE } from './employee.account';
import { compensationView } from './employee.compensation';
import { eventsFor, todayKey } from './employee.events';
import { managersOf, toEmployee, toEvent, toManagerRef } from './employee.mapper';
import { loadEmployee } from './employee.store';

const PICKER_LIMIT = 20;
const SEARCH_MAX = 80;
const UNRECORDED_LIMIT = 100;

/** hrEmployeesTable — DUNCIT TABLE CONTRACT v1. */
export const HR_EMPLOYEE_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['employee_code', 'personal.first_name', 'personal.last_name', 'job.work_email', 'job.job_title', 'job.department'],
  sortFields: {
    employee_code: 'employee_code',
    full_name: 'personal.first_name',
    job_title: 'job.job_title',
    department: 'job.department',
    date_of_joining: 'job.date_of_joining',
    status: 'status',
    created_at: 'created_at',
  },
  filterFields: {
    employee_code: { type: 'string' },
    full_name: { path: 'personal.first_name', type: 'string' },
    job_title: { path: 'job.job_title', type: 'string' },
    department: { path: 'job.department', type: 'string' },
    work_location: { path: 'job.work_location', type: 'string' },
    employment_type: { path: 'job.employment_type', type: 'enum' },
    status: { type: 'enum' },
    date_of_joining: { path: 'job.date_of_joining', type: 'string' },
  },
  defaultSort: { 'job.date_of_joining': -1, _id: -1 },
};

type AccountRow = {
  _id: Types.ObjectId;
  profile?: { first_name?: string; last_name?: string; profile_photo?: string };
  auth?: { email?: string; phone?: { number?: string; extension?: string } };
  metadata?: { role_keys?: string[] };
};

const accountName = (u: AccountRow) => `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim();
const term = (search: string | null | undefined) => (search ?? '').trim().slice(0, SEARCH_MAX);

/** The org-chart seats this account sits in, across every team structure. */
async function seatsOf(userId: Types.ObjectId) {
  const nodes = await TeamStructureNodeModel.find({ user_id: userId }).select('structure_id title department').lean<ITeamStructureNode[]>();
  if (nodes.length === 0) return [];
  const structures = await TeamStructureModel.find({ _id: { $in: nodes.map((n) => n.structure_id) } })
    .select('name')
    .lean<ITeamStructure[]>();
  const names = new Map(structures.map((s) => [String(s._id), s.name]));
  return nodes.map((n) => ({
    structure_id: String(n.structure_id),
    structure_name: names.get(String(n.structure_id)) ?? '',
    node_id: String(n._id),
    title: n.title,
    department: n.department ?? null,
  }));
}

export async function employeeRow(doc: IHrEmployee) {
  return toEmployee(doc, await managersOf([doc]));
}

export const employeeService = {
  async table(query: TableQueryInput | undefined) {
    const page = await runTableQuery<IHrEmployee>(HrEmployeeModel, {}, query, HR_EMPLOYEE_TABLE_CONFIG, {
      projection: { bank: 0, client_request_id: 0 },
    });
    const managers = await managersOf(page.docs);
    return { rows: page.docs.map((doc) => toEmployee(doc, managers)), total: page.total, page: page.page, page_size: page.page_size };
  },

  /** Everything the profile page shows, in one round trip. */
  async profile(id: string) {
    const doc = await loadEmployee(id);
    const [managers, account, pay, reports, seats] = await Promise.all([
      managersOf([doc]),
      UserModel.findById(doc.user_id).select('auth.email metadata.role_keys').lean<AccountRow>(),
      compensationView(doc._id),
      HrEmployeeModel.find({ 'job.manager_id': doc._id, status: { $ne: 'EXITED' } })
        .select('employee_code personal.first_name personal.last_name job.job_title')
        .sort({ 'personal.first_name': 1 })
        .lean<IHrEmployee[]>(),
      seatsOf(doc.user_id),
    ]);
    return {
      employee: toEmployee(doc, managers, account?.auth?.email ?? null),
      has_employee_access: Boolean(account?.metadata?.role_keys?.includes(HR_GRANTED_ROLE)),
      compensation: pay.revisions,
      current_compensation: pay.current,
      direct_reports: reports.map(toManagerRef),
      seats,
      targets_console_url: consoleUrl('targets', '/employee-targets'),
    };
  },

  async history(id: string) {
    const doc = await loadEmployee(id);
    return (await eventsFor(doc._id)).map(toEvent);
  },

  /** The Targets console's monthly targets for this person — read-only here. */
  async targets(id: string) {
    const doc = await loadEmployee(id);
    return employeeTargetService.forEmployee(String(doc.user_id));
  },

  /** Current employees a record can report to, by name, code or title. */
  async managerOptions(search: string | null | undefined, excludeId: string | null | undefined) {
    const filter: Record<string, unknown> = { status: { $ne: 'EXITED' } };
    const text = term(search);
    if (text) {
      const rx = escapedSearchRegex(text);
      filter.$or = [{ employee_code: rx }, { 'personal.first_name': rx }, { 'personal.last_name': rx }, { 'job.job_title': rx }];
    }
    if (excludeId && Types.ObjectId.isValid(excludeId)) filter._id = { $ne: new Types.ObjectId(excludeId) };
    const docs = await HrEmployeeModel.find(filter)
      .select('employee_code personal.first_name personal.last_name job.job_title')
      .sort({ 'personal.first_name': 1, _id: 1 })
      .limit(PICKER_LIMIT)
      .lean<IHrEmployee[]>();
    return docs.map(toManagerRef);
  },

  /** Duncit accounts to hire into, by name, email or phone — each says whether HR already has it. */
  async accountOptions(search: string | null | undefined) {
    const text = term(search);
    if (text.length < 2) return [];
    const rx = escapedSearchRegex(text);
    const users = await UserModel.find({
      'metadata.status': 'ACTIVE',
      $or: [{ 'profile.first_name': rx }, { 'profile.last_name': rx }, { 'auth.email': rx }, { 'auth.phone.number': rx }],
    })
      .select('profile.first_name profile.last_name profile.profile_photo auth.email auth.phone')
      .limit(PICKER_LIMIT)
      .lean<AccountRow[]>();
    const recorded = await HrEmployeeModel.find({ user_id: { $in: users.map((u) => u._id) } })
      .select('user_id')
      .lean<Pick<IHrEmployee, 'user_id'>[]>();
    const onRecord = new Set(recorded.map((r) => String(r.user_id)));
    return users.map((u) => ({
      id: String(u._id),
      name: accountName(u),
      email: u.auth?.email ?? null,
      phone: u.auth?.phone?.number ? `${u.auth.phone.extension ?? ''} ${u.auth.phone.number}`.trim() : null,
      photo: u.profile?.profile_photo ?? null,
      has_hr_record: onRecord.has(String(u._id)),
    }));
  },

  /** Accounts holding Employee access with no HR record behind them — the gap HR should close. */
  async unrecorded() {
    const recorded = await HrEmployeeModel.distinct('user_id');
    const users = await UserModel.find({ 'metadata.role_keys': HR_GRANTED_ROLE, 'metadata.status': 'ACTIVE', _id: { $nin: recorded } })
      .select('profile.first_name profile.last_name profile.profile_photo auth.email')
      .sort({ 'profile.first_name': 1, _id: 1 })
      .limit(UNRECORDED_LIMIT)
      .lean<AccountRow[]>();
    return users.map((u) => ({ id: String(u._id), name: accountName(u), email: u.auth?.email ?? null, photo: u.profile?.profile_photo ?? null }));
  },

  /** The HR dashboard's head-count tiles, in one aggregation. */
  async stats(now: Date = new Date()) {
    const today = todayKey(now);
    const monthStart = `${today.slice(0, 7)}-01`;
    const [row] = await HrEmployeeModel.aggregate<{
      byStatus: { _id: string; count: number }[];
      joined: { count: number }[];
      exited: { count: number }[];
      byDepartment: { _id: string | null; count: number }[];
    }>([
      {
        $facet: {
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          joined: [{ $match: { 'job.date_of_joining': { $gte: monthStart, $lte: today } } }, { $count: 'count' }],
          exited: [{ $match: { status: 'EXITED', 'exit.last_working_day': { $gte: monthStart, $lte: today } } }, { $count: 'count' }],
          byDepartment: [
            { $match: { status: { $ne: 'EXITED' } } },
            { $group: { _id: '$job.department', count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
          ],
        },
      },
    ]);
    const status = new Map(row?.byStatus.map((s) => [s._id, s.count]) ?? []);
    return {
      active: status.get('ACTIVE') ?? 0,
      on_notice: status.get('ON_NOTICE') ?? 0,
      exited: status.get('EXITED') ?? 0,
      joined_this_month: row?.joined[0]?.count ?? 0,
      exited_this_month: row?.exited[0]?.count ?? 0,
      by_department: (row?.byDepartment ?? []).map((d) => ({ department: d._id ?? null, count: d.count })),
    };
  },
};
