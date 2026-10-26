import { statusReportResolvers } from '../../statusReport.resolver';
import { statusReportService } from '../../statusReport.service';
import { identityFromRequest } from '@observability/requestIdentity';
import { requireHuman } from '@modules/platform/captcha/captcha.guard';
import { makeContext } from '@test/harness';

jest.mock('../../statusReport.service', () => ({ statusReportService: { table: jest.fn(), submit: jest.fn(), updateStatus: jest.fn(), remove: jest.fn() } }));
jest.mock('@observability/requestIdentity', () => ({ identityFromRequest: jest.fn() }));
jest.mock('@modules/platform/captcha/captcha.guard', () => ({ requireHuman: jest.fn() }));

const svc = statusReportService as unknown as Record<string, jest.Mock>;
const Q = statusReportResolvers.Query as Record<string, (...a: any[]) => any>;
const M = statusReportResolvers.Mutation as Record<string, (...a: any[]) => any>;
const tech = makeContext({ id: 't1', roles: ['TECH_MANAGER'] });
const outsider = makeContext({ id: 'u1', roles: ['USER'] });
const anonymous = makeContext(null);

beforeEach(() => jest.clearAllMocks());

describe('submitStatusReport', () => {
  it('checks the visitor is human, then files the report with the origin read off the request', () => {
    (identityFromRequest as jest.Mock).mockReturnValue({ ip: '203.0.113.9', user_agent: 'UA/1', user: { id: 'user-1' } });
    M.submitStatusReport({}, { input: { name: 'A' } }, anonymous);
    expect(requireHuman).toHaveBeenCalledWith(anonymous, { name: 'A' });
    expect(svc.submit).toHaveBeenCalledWith({ name: 'A' }, { ip: '203.0.113.9', user_agent: 'UA/1', user_id: 'user-1' });
  });

  it('files an unattributed origin as nulls when the request carries nothing', () => {
    (identityFromRequest as jest.Mock).mockReturnValue({});
    M.submitStatusReport({}, { input: { name: 'A' } }, anonymous);
    expect(svc.submit).toHaveBeenCalledWith({ name: 'A' }, { ip: null, user_agent: null, user_id: null });
  });

  it('files nothing when the captcha check refuses', () => {
    (requireHuman as jest.Mock).mockImplementationOnce(() => {
      throw new Error('CAPTCHA_REQUIRED');
    });
    expect(() => M.submitStatusReport({}, { input: {} }, anonymous)).toThrow('CAPTCHA_REQUIRED');
    expect(svc.submit).not.toHaveBeenCalled();
  });
});

describe('triage', () => {
  it('is for Tech only: the table, the status change and the delete', () => {
    Q.statusReportsTable({}, { query: { page: 2 } }, tech);
    M.updateStatusReport({}, { report_id: 'r1', status: 'RESOLVED', note: 'n', staff_images: ['u'] }, tech);
    M.deleteStatusReports({}, { ids: ['r1'] }, tech);
    expect(svc.table).toHaveBeenCalledWith({ page: 2 });
    expect(svc.updateStatus).toHaveBeenCalledWith('r1', 'RESOLVED', 'n', ['u']);
    expect(svc.remove).toHaveBeenCalledWith(['r1']);
    for (const ctx of [outsider, anonymous]) {
      expect(() => Q.statusReportsTable({}, {}, ctx)).toThrow();
      expect(() => M.updateStatusReport({}, { report_id: 'r1', status: 'NEW' }, ctx)).toThrow();
      expect(() => M.deleteStatusReports({}, { ids: [] }, ctx)).toThrow();
    }
    expect(svc.remove).toHaveBeenCalledTimes(1);
  });
});
