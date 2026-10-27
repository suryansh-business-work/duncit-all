import { mailAutomationService } from '../../mailAutomation.service';
import { mailAutomationResolvers } from '../../mailAutomation.resolver';
import { makeContext } from '@test/harness';

jest.mock('../../mailAutomation.service', () => ({
  mailAutomationService: {
    configured: jest.fn(), listAccounts: jest.fn(), recentThreads: jest.fn(), preview: jest.fn(),
    connectUrl: jest.fn(), disconnect: jest.fn(), updateRule: jest.fn(),
  },
}));

const svc = mailAutomationService as unknown as Record<string, jest.Mock>;
const Q = mailAutomationResolvers.Query as Record<string, (...a: any[]) => any>;
const M = mailAutomationResolvers.Mutation as Record<string, (...a: any[]) => any>;
const comms = makeContext({ id: 'c', roles: ['COMMUNICATIONS_MANAGER'] });
const support = makeContext({ id: 's', roles: ['SUPPORT_MANAGER'] });
const root = makeContext({ id: 'r', roles: ['SUPER_ADMIN'] });
const outsider = makeContext({ id: 'o', roles: ['USER'] });

beforeEach(() => jest.clearAllMocks());

describe('reads', () => {
  it('lets both Communications and Support read the mailboxes and their threads', () => {
    for (const ctx of [comms, support, root]) {
      svc.configured.mockReturnValue(true);
      expect(Q.mailAutomationConfigured({}, {}, ctx)).toBe(true);
      Q.mailAutomationAccounts({}, {}, ctx);
    }
    expect(svc.listAccounts).toHaveBeenCalledTimes(3);
  });

  it('defaults the thread list to twenty and passes a given limit through', () => {
    Q.mailAutomationThreads({}, { account_id: 'a1' }, comms);
    expect(svc.recentThreads).toHaveBeenLastCalledWith('a1', 20);
    Q.mailAutomationThreads({}, { account_id: 'a1', limit: 5 }, support);
    expect(svc.recentThreads).toHaveBeenLastCalledWith('a1', 5);
    Q.mailAutomationThreads({}, { account_id: 'a1', limit: null }, support);
    expect(svc.recentThreads).toHaveBeenLastCalledWith('a1', 20);
  });

  it('keeps the preview with Support, and refuses outsiders everywhere', () => {
    Q.mailAutomationPreview({}, { input: { a: 1 } }, support);
    expect(svc.preview).toHaveBeenCalledWith({ a: 1 });
    expect(() => Q.mailAutomationPreview({}, { input: {} }, comms)).toThrow();
    for (const name of ['mailAutomationConfigured', 'mailAutomationAccounts', 'mailAutomationThreads', 'mailAutomationPreview']) {
      expect(() => Q[name]({}, { account_id: 'a', input: {} }, outsider)).toThrow();
    }
  });
});

describe('writes', () => {
  it('connecting and disconnecting a mailbox belong to Communications', () => {
    M.mailAutomationConnectUrl({}, { login_hint: 'h@x.com' }, comms);
    expect(svc.connectUrl).toHaveBeenCalledWith('c', 'h@x.com');
    M.disconnectMailAutomationAccount({}, { id: 'a1' }, root);
    expect(svc.disconnect).toHaveBeenCalledWith('a1');
    expect(() => M.mailAutomationConnectUrl({}, {}, support)).toThrow();
    expect(() => M.disconnectMailAutomationAccount({}, { id: 'a1' }, support)).toThrow();
  });

  it('writing the rule belongs to Support', () => {
    M.updateMailAutomationRule({}, { input: { id: 'a1' } }, support);
    expect(svc.updateRule).toHaveBeenCalledWith({ id: 'a1' });
    expect(() => M.updateMailAutomationRule({}, { input: {} }, comms)).toThrow();
    expect(() => M.updateMailAutomationRule({}, { input: {} }, outsider)).toThrow();
  });
});
