import { telemetryResolvers } from '../../telemetry.resolver';
import { telemetryService, telemetryDeleteIsUnscoped } from '../../telemetry.service';
import { describeLogUser } from '../../telemetryUser';
import { LOGS_READER } from '@middleware/rbac';
import { makeContext } from '@test/harness';

jest.mock('../../telemetry.service', () => ({
  telemetryDeleteIsUnscoped: jest.fn(),
  telemetryService: {
    getSettings: jest.fn(), dashboard: jest.fn(), logsTable: jest.fn(), telemetryLog: jest.fn(), bugsTable: jest.fn(), bug: jest.fn(),
    bugOccurrences: jest.fn(), bugsExport: jest.fn(), logsExport: jest.fn(), telemetryDeleteCount: jest.fn(), updateSettings: jest.fn(),
    updateBugStatus: jest.fn(), deleteBugs: jest.fn(), deleteTelemetryRecords: jest.fn(), importBugs: jest.fn(), importLogs: jest.fn(),
    rotatePublicApiKey: jest.fn(),
  },
}));
jest.mock('../../telemetryUser', () => ({ describeLogUser: jest.fn() }));

const Q = telemetryResolvers.Query as Record<string, (...a: any[]) => any>;
const M = telemetryResolvers.Mutation as Record<string, (...a: any[]) => any>;
const svc = telemetryService as unknown as Record<string, jest.Mock>;
const root = makeContext({ id: 'root', roles: ['SUPER_ADMIN'] });
const tech = makeContext({ id: 'tech', roles: ['TECH_MANAGER'] });
const logsReader = makeContext({ id: 'logs', roles: [LOGS_READER] });
const outsider = makeContext({ id: 'u', roles: ['USER'] });

beforeEach(() => jest.clearAllMocks());

describe('TelemetryUser fields', () => {
  it('look the person up at read time and answer null for what the account does not have', async () => {
    (describeLogUser as jest.Mock).mockResolvedValue({ name: 'Asha', email: null });
    const fields = telemetryResolvers.TelemetryUser;
    await expect(fields.name({ id: 'u1' })).resolves.toBe('Asha');
    await expect(fields.email({ id: 'u1' })).resolves.toBeNull();
    await expect(fields.phone({ id: 'u1' })).resolves.toBeNull();
    expect(describeLogUser).toHaveBeenCalledWith('u1');
  });
});

describe('reads', () => {
  const both: Array<[string, string, unknown, unknown[]]> = [
    ['telemetrySettings', 'getSettings', {}, []],
    ['telemetryLogsTable', 'logsTable', { query: { page: 1 } }, [{ page: 1 }]],
    ['telemetryLog', 'telemetryLog', { id: 'l1' }, ['l1']],
    ['telemetryLogsExport', 'logsExport', { level: 'ERROR', limit: 5 }, ['ERROR', 5]],
  ];
  const techOnly: Array<[string, string, unknown, unknown[]]> = [
    ['telemetryDashboard', 'dashboard', { range_days: 7 }, [7]],
    ['bugsTable', 'bugsTable', { query: null }, [null]],
    ['bug', 'bug', { id: 'b1' }, ['b1']],
    ['bugOccurrences', 'bugOccurrences', { bug_id: 'b1', limit: 3 }, ['b1', 3]],
    ['bugsExport', 'bugsExport', {}, []],
    ['telemetryDeleteCount', 'telemetryDeleteCount', { target: 'LOGS', scope: { all: true } }, ['LOGS', { all: true }]],
  ];

  it.each([...both, ...techOnly])('%s forwards its arguments for a tech manager', (query, method, args, expected) => {
    svc[method].mockReturnValue('answer');
    expect(Q[query]({}, args, tech)).toBe('answer');
    expect(svc[method]).toHaveBeenCalledWith(...expected);
  });

  it.each(both)('%s is open to the Logs console too', (query, method, args) => {
    svc[method].mockReturnValue('answer');
    expect(Q[query]({}, args, logsReader)).toBe('answer');
  });

  it.each(techOnly)('%s stays with Tech', (query, _method, args) => {
    expect(() => Q[query]({}, args, logsReader)).toThrow();
  });

  it.each([...both, ...techOnly])('%s refuses an outsider and a signed-out caller', (query, method, args) => {
    expect(() => Q[query]({}, args, outsider)).toThrow();
    expect(() => Q[query]({}, args, makeContext(null))).toThrow();
    expect(svc[method]).not.toHaveBeenCalled();
  });
});

describe('writes', () => {
  it('updateTelemetrySettings forwards the input for Tech only', () => {
    M.updateTelemetrySettings({}, { input: { retention_days: 30 } }, tech);
    expect(svc.updateSettings).toHaveBeenCalledWith({ retention_days: 30 });
    expect(() => M.updateTelemetrySettings({}, { input: {} }, logsReader)).toThrow();
  });

  it('records who changed a bug status, who deleted bugs and who imported', () => {
    M.updateBugStatus({}, { bug_id: 'b1', status: 'RESOLVED' }, tech);
    expect(svc.updateBugStatus).toHaveBeenCalledWith('b1', 'RESOLVED', 'tech');
    M.deleteBugs({}, { ids: ['b1'] }, tech);
    expect(svc.deleteBugs).toHaveBeenCalledWith(['b1'], expect.objectContaining({ id: 'tech' }));
    M.importBugs({}, { bugs: [{ title: 'x' }] }, tech);
    expect(svc.importBugs).toHaveBeenCalledWith([{ title: 'x' }], expect.objectContaining({ id: 'tech' }));
    M.importTelemetryLogs({}, { logs: [{ message: 'm' }] }, tech);
    expect(svc.importLogs).toHaveBeenCalledWith([{ message: 'm' }], expect.objectContaining({ id: 'tech' }));
    for (const [name, args] of [['updateBugStatus', { bug_id: 'b', status: 'x' }], ['deleteBugs', { ids: [] }], ['importBugs', { bugs: [] }], ['importTelemetryLogs', { logs: [] }]] as const) {
      expect(() => M[name]({}, args, logsReader)).toThrow();
    }
  });

  it('lets a tech manager delete a scoped selection but only the super admin an unscoped one', () => {
    const args = { target: 'LOGS', scope: { ids: ['a'] } };
    (telemetryDeleteIsUnscoped as jest.Mock).mockReturnValue(false);
    M.deleteTelemetryRecords({}, args, tech);
    expect(svc.deleteTelemetryRecords).toHaveBeenCalledWith('LOGS', { ids: ['a'] }, expect.objectContaining({ id: 'tech' }));
    (telemetryDeleteIsUnscoped as jest.Mock).mockReturnValue(true);
    svc.deleteTelemetryRecords.mockClear();
    expect(() => M.deleteTelemetryRecords({}, args, tech)).toThrow();
    expect(svc.deleteTelemetryRecords).not.toHaveBeenCalled();
    M.deleteTelemetryRecords({}, args, root);
    expect(svc.deleteTelemetryRecords).toHaveBeenCalledTimes(1);
    expect(() => M.deleteTelemetryRecords({}, args, outsider)).toThrow();
  });

  it('rotating the feed key is the super admin alone', () => {
    M.rotateTelemetryApiKey({}, {}, root);
    expect(svc.rotatePublicApiKey).toHaveBeenCalledWith(expect.objectContaining({ id: 'root' }));
    svc.rotatePublicApiKey.mockClear();
    expect(() => M.rotateTelemetryApiKey({}, {}, tech)).toThrow();
    expect(svc.rotatePublicApiKey).not.toHaveBeenCalled();
  });
});
