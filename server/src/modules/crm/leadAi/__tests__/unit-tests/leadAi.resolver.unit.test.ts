/**
 * Ask AI is CRM-manager work: every field refuses other roles, and each call
 * is scoped to the caller's own id so one agent never reads another's thread.
 */
jest.mock('../../leadAi.service', () => ({
  leadAiService: {
    thread: jest.fn().mockResolvedValue({ messages: [], context: {} }),
    ask: jest.fn().mockResolvedValue({}),
    setActionStatus: jest.fn().mockResolvedValue({}),
    clear: jest.fn().mockResolvedValue(true),
  },
}));

import { makeContext } from '@test/harness';
import { leadAiResolvers } from '../../leadAi.resolver';
import { leadAiService } from '../../leadAi.service';

const Q = leadAiResolvers.Query;
const M = leadAiResolvers.Mutation;
const lead = { entity: 'ECOMM_LEAD' as const, lead_id: 'lead-1' };
const manager = () => makeContext({ id: 'agent-7', roles: ['CRM_MANAGER'] } as never);
const outsider = () => makeContext({ id: 'u-1', roles: ['USER'] } as never);

describe('leadAiResolvers — access', () => {
  it.each([
    ['crmLeadAiThread', () => Q.crmLeadAiThread({}, lead, outsider())],
    ['askCrmLeadAi', () => M.askCrmLeadAi({}, { ...lead, message: 'hi' }, outsider())],
    [
      'setCrmLeadAiActionStatus',
      () => M.setCrmLeadAiActionStatus({}, { ...lead, message_id: 'm', action_index: 0, status: 'DONE' }, outsider()),
    ],
    ['clearCrmLeadAiThread', () => M.clearCrmLeadAiThread({}, lead, outsider())],
  ])('%s refuses a non-CRM role', async (_name, call) => {
    await expect((async () => call())()).rejects.toThrow(/access denied/i);
  });
});

describe('leadAiResolvers — scoping', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads the thread for the signed-in agent', async () => {
    await Q.crmLeadAiThread({}, lead, manager());
    expect(leadAiService.thread).toHaveBeenCalledWith('ECOMM_LEAD', 'lead-1', 'agent-7');
  });

  it('asks as the signed-in agent', async () => {
    await M.askCrmLeadAi({}, { ...lead, message: 'Summarise' }, manager());
    expect(leadAiService.ask).toHaveBeenCalledWith('ECOMM_LEAD', 'lead-1', 'agent-7', 'Summarise');
  });

  it('records an outcome on the agent’s own thread', async () => {
    const args = { ...lead, message_id: 'm-1', action_index: 1, status: 'DISMISSED' as const };
    await M.setCrmLeadAiActionStatus({}, args, manager());
    expect(leadAiService.setActionStatus).toHaveBeenCalledWith('ECOMM_LEAD', 'lead-1', 'agent-7', args);
  });

  it('clears only the agent’s own thread', async () => {
    await expect(M.clearCrmLeadAiThread({}, lead, manager())).resolves.toBe(true);
    expect(leadAiService.clear).toHaveBeenCalledWith('ECOMM_LEAD', 'lead-1', 'agent-7');
  });
});
