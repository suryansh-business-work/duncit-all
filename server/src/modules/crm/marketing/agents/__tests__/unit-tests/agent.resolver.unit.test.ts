/**
 * The agents' gate: everyone with a Marketing seat reads them, an editor
 * read-only; switching, rescheduling and running one is a manager's call.
 * The service is faked; only the gate and what it is handed are under test.
 */
jest.mock('@modules/crm/marketing/agents/agent.service', () => ({
  marketingAgentService: { list: jest.fn(), update: jest.fn(), runNow: jest.fn() },
}));

import { makeContext } from '@test/harness';
import { marketingAgentService } from '../../agent.service';
import { marketingAgentResolvers } from '../../agent.resolver';

const svc = marketingAgentService as unknown as Record<string, jest.Mock>;
const Q = marketingAgentResolvers.Query;
const M = marketingAgentResolvers.Mutation;
const input = { enabled: true, schedule: { every: 'DAY' as const, hour: 8 }, params: { brief: 'Pets' } };

beforeEach(() => {
  svc.list.mockResolvedValue([{ key: 'ACCOUNT_DOCTOR' }]);
  svc.update.mockResolvedValue({ key: 'ACCOUNT_DOCTOR', enabled: true });
  svc.runNow.mockResolvedValue('run-1');
});

describe('reading the agents', () => {
  it.each(['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER', 'MARKETING_EDITOR'])('lets a %s read', async (role) => {
    await expect(Q.marketingAgents({}, {}, makeContext({ roles: [role] }))).resolves.toEqual([{ key: 'ACCOUNT_DOCTOR' }]);
  });

  it('keeps a reader seat, a member and a stranger out', () => {
    expect(() => Q.marketingAgents({}, {}, makeContext({ roles: ['MARKETING_READER'] }))).toThrow(/access denied/i);
    expect(() => Q.marketingAgents({}, {}, makeContext({ roles: ['USER'] }))).toThrow(/access denied/i);
    expect(() => Q.marketingAgents({}, {}, makeContext(null))).toThrow(/auth|access denied/i);
    expect(svc.list).not.toHaveBeenCalled();
  });
});

describe('changing and running an agent', () => {
  it('hands a manager’s update to the service in the manager’s name', async () => {
    const ctx = makeContext({ roles: ['MARKETING_MANAGER'] });
    await expect(M.updateMarketingAgent({}, { key: 'ACCOUNT_DOCTOR', input }, ctx)).resolves.toEqual({ key: 'ACCOUNT_DOCTOR', enabled: true });
    expect(svc.update).toHaveBeenCalledWith('ACCOUNT_DOCTOR', input, ctx.user?.id);
  });

  it('runs an agent now as the signed-in manager or super admin and answers with the run id', async () => {
    const boss = makeContext({ roles: ['SUPER_ADMIN'] });
    await expect(M.runMarketingAgent({}, { key: 'CONTENT_PLANNER' }, boss)).resolves.toBe('run-1');
    expect(svc.runNow).toHaveBeenCalledWith('CONTENT_PLANNER', boss.user);
    await M.runMarketingAgent({}, { key: 'CONTENT_PLANNER' }, makeContext({ roles: ['MARKETING_MANAGER'] }));
    expect(svc.runNow).toHaveBeenCalledTimes(2);
  });

  it('lets an editor and a city admin look but not touch', () => {
    for (const role of ['MARKETING_EDITOR', 'CITY_ADMIN']) {
      const ctx = makeContext({ roles: [role] });
      expect(() => M.updateMarketingAgent({}, { key: 'ACCOUNT_DOCTOR', input }, ctx)).toThrow(/access denied/i);
      expect(() => M.runMarketingAgent({}, { key: 'ACCOUNT_DOCTOR' }, ctx)).toThrow(/access denied/i);
    }
    expect(svc.update).not.toHaveBeenCalled();
    expect(svc.runNow).not.toHaveBeenCalled();
  });
});
