import { e2eRunResolvers } from '../../e2eRun.resolver';
import { e2eRunService } from '../../e2eRun.service';
import { purgeE2eRunData } from '../../e2eRun.purge';
import { latestRunAccountCode } from '../../e2eRun.codes';
import { trafficKeyForRun } from '../../e2eRun.traffic';
import { mintE2eGoogleCredential } from '../../e2eRun.google';
import { grantRunAccountRoles } from '../../e2eRun.staff';
import { normaliseSuites } from '../../e2eRun.suites';
import { makeContext } from '@test/harness';

jest.mock('../../e2eRun.service', () => ({
  e2eRunService: {
    table: jest.fn(), settings: jest.fn(), suiteCatalogue: jest.fn(), triggerConfig: jest.fn(), trigger: jest.fn(),
    start: jest.fn(), report: jest.fn(), videoUploadAuth: jest.fn(), attachVideos: jest.fn(), updateSettings: jest.fn(), remove: jest.fn(),
  },
}));
jest.mock('../../e2eRun.purge', () => ({ purgeE2eRunData: jest.fn() }));
jest.mock('../../e2eRun.codes', () => ({ latestRunAccountCode: jest.fn() }));
jest.mock('../../e2eRun.traffic', () => ({ trafficKeyForRun: jest.fn() }));
jest.mock('../../e2eRun.google', () => ({ mintE2eGoogleCredential: jest.fn() }));
jest.mock('../../e2eRun.staff', () => ({ grantRunAccountRoles: jest.fn() }));

const Q = e2eRunResolvers.Query as Record<string, (...a: any[]) => any>;
const M = e2eRunResolvers.Mutation as Record<string, (...a: any[]) => any>;
const tech = makeContext({ id: 'tech-1', email: 'tech@duncit.com', roles: ['TECH_MANAGER'] });
const ciToken = makeContext({ id: 'ci-1', roles: ['TECH_MANAGER'] });
const outsider = makeContext({ id: 'u', roles: ['USER'] });

beforeEach(() => jest.clearAllMocks());

describe('queries', () => {
  const cases: Array<[string, unknown, jest.Mock, unknown[]]> = [
    ['e2eRunsTable', { query: { page: 2 } }, e2eRunService.table as jest.Mock, [{ page: 2 }]],
    ['e2eRunSettings', {}, e2eRunService.settings as jest.Mock, []],
    ['e2eSuiteCatalogue', {}, e2eRunService.suiteCatalogue as jest.Mock, []],
    ['e2eTriggerConfig', {}, e2eRunService.triggerConfig as jest.Mock, []],
    ['e2eOneTimeCode', { purpose: 'LOGIN', email: 'a@b.c' }, latestRunAccountCode as jest.Mock, [{ purpose: 'LOGIN', email: 'a@b.c' }]],
    ['e2eTrafficKey', { stamp: '2603011200' }, trafficKeyForRun as jest.Mock, ['2603011200']],
    ['e2eGoogleCredential', { email: 'a@b.c', given_name: 'A', family_name: 'B' }, mintE2eGoogleCredential as jest.Mock, [{ email: 'a@b.c', given_name: 'A', family_name: 'B' }]],
  ];

  it.each(cases)('%s hands the arguments to its service for a tech manager', (name, args, target, expected) => {
    target.mockReturnValue('answer');
    expect(Q[name]({}, args, tech)).toBe('answer');
    expect(target).toHaveBeenCalledWith(...expected);
  });

  it.each(cases)('%s refuses everyone else without calling the service', (name, args, target) => {
    expect(() => Q[name]({}, args, outsider)).toThrow();
    expect(() => Q[name]({}, args, makeContext(null))).toThrow();
    expect(target).not.toHaveBeenCalled();
  });
});

describe('mutations', () => {
  it.each([
    ['videoUploadAuth', 'e2eVideoUploadAuth', e2eRunService.videoUploadAuth],
    ['attachVideos', 'attachE2eRunVideos', e2eRunService.attachVideos],
    ['purge', 'purgeE2eRunData', purgeE2eRunData],
    ['grant', 'grantE2eRunAccountRoles', grantRunAccountRoles],
    ['updateSettings', 'updateE2eRunSettings', e2eRunService.updateSettings],
  ])('%s passes the input through for a tech manager and refuses an outsider', (_label, name, target) => {
    (target as jest.Mock).mockReturnValue('ok');
    expect(M[name]({}, { input: { a: 1 } }, tech)).toBe('ok');
    expect(target).toHaveBeenCalledWith({ a: 1 });
    (target as jest.Mock).mockClear();
    expect(() => M[name]({}, { input: {} }, outsider)).toThrow();
    expect(target).not.toHaveBeenCalled();
  });

  it('deleteE2eRun removes by id', () => {
    (e2eRunService.remove as jest.Mock).mockReturnValue(true);
    expect(M.deleteE2eRun({}, { id: 'r1' }, tech)).toBe(true);
    expect(e2eRunService.remove).toHaveBeenCalledWith('r1');
    expect(() => M.deleteE2eRun({}, { id: 'r1' }, outsider)).toThrow();
  });

  it('triggerE2eRun runs as the signed-in user', () => {
    M.triggerE2eRun({}, { input: { ref: 'staging' } }, tech);
    expect(e2eRunService.trigger).toHaveBeenCalledWith({ ref: 'staging' }, expect.objectContaining({ id: 'tech-1', email: 'tech@duncit.com' }));
    expect(() => M.triggerE2eRun({}, { input: {} }, outsider)).toThrow();
  });

  it.each([['startE2eRun', e2eRunService.start], ['reportE2eRun', e2eRunService.report]])(
    '%s records who reported: the email when the token has one, else the user id',
    (name, target) => {
      M[name]({}, { input: { x: 1 } }, tech);
      expect(target).toHaveBeenLastCalledWith({ x: 1 }, 'tech@duncit.com');
      M[name]({}, { input: { x: 1 } }, ciToken);
      expect(target).toHaveBeenLastCalledWith({ x: 1 }, 'ci-1');
      expect(() => M[name]({}, { input: {} }, outsider)).toThrow();
    },
  );
});

describe('normaliseSuites', () => {
  it('ignores blank and null entries in the list the client sent', () => {
    expect(normaliseSuites([null, undefined, '  ', 'accounts'])).toEqual(['accounts']);
  });
});
