/**
 * The call API the CRM portal drives: whether calling is set up (and who may
 * fix it in the Tech portal), the agent's live call after a reload, and the
 * controls — which only the agent who placed the call may use.
 */
jest.mock('@config/runtimeEnv', () => ({ getRuntimeEnvValue: jest.fn() }));
jest.mock('@modules/crm/communicationLog/communicationLog.service', () => ({
  communicationLogService: { get: jest.fn(), activeCallFor: jest.fn() },
}));
jest.mock('./../../call.config', () => ({
  callMediaSettings: jest.fn(),
  missingTwilioFields: jest.fn(),
  resolveAgentNumber: jest.fn(),
}));
jest.mock('./../../call.conference', () => ({
  CALL_ACTIONS: ['MUTE', 'UNMUTE', 'HOLD', 'RESUME', 'END'],
  controlCall: jest.fn(),
}));

import { makeContext } from '@test/harness';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { communicationLogService } from '@modules/crm/communicationLog/communicationLog.service';
import { callMediaSettings, missingTwilioFields, resolveAgentNumber } from '../../call.config';
import { controlCall } from '../../call.conference';
import { crmCallResolvers } from '../../call.resolver';

const env = getRuntimeEnvValue as jest.Mock;
const store = communicationLogService as unknown as Record<string, jest.Mock>;
const missing = missingTwilioFields as jest.Mock;
const agent = resolveAgentNumber as jest.Mock;
const media = callMediaSettings as jest.Mock;
const control = controlCall as jest.Mock;

const { Query, Mutation } = crmCallResolvers;
const crm = (id = 'agent1') => makeContext({ id, roles: ['CRM_MANAGER'] });

beforeEach(() => {
  env.mockResolvedValue(' +15550001111 ');
  missing.mockResolvedValue([]);
  agent.mockResolvedValue({ number: '+919800000000', source: 'PROFILE' });
  media.mockResolvedValue({ record: true, liveTranscription: false, language: 'en-IN', notice: 'n' });
  store.get.mockResolvedValue({ id: 'log1', type: 'CALL', created_by: 'agent1' });
  control.mockResolvedValue({ ok: true });
});

describe('crmCallSetup', () => {
  it('reports a ready setup with both numbers and the media switches', async () => {
    await expect(Query.crmCallSetup({}, {}, crm())).resolves.toEqual({
      configured: true,
      missing: [],
      from_number: '+15550001111',
      agent_number: '+919800000000',
      agent_source: 'PROFILE',
      recording_enabled: true,
      live_transcription: false,
      can_configure: false,
    });
    expect(agent).toHaveBeenCalledWith('agent1');
  });

  it('names what is missing, with no numbers to show', async () => {
    missing.mockResolvedValue(['phone_number']);
    env.mockResolvedValue('');
    agent.mockResolvedValue(null);

    const setup = await Query.crmCallSetup({}, {}, crm());

    expect(setup).toEqual(expect.objectContaining({ configured: false, missing: ['phone_number'], from_number: null, agent_number: null, agent_source: null }));
  });

  it('lets a super admin or tech manager configure Twilio', async () => {
    const admin = await Query.crmCallSetup({}, {}, makeContext({ roles: ['SUPER_ADMIN'] }));
    expect(admin.can_configure).toBe(true);
  });

  it('is closed to anyone outside CRM', async () => {
    await expect(Query.crmCallSetup({}, {}, makeContext({ roles: ['USER'] }))).rejects.toThrow(/access denied/i);
  });
});

describe('myActiveCrmCall', () => {
  it("returns the signed-in agent's own live call", async () => {
    store.activeCallFor.mockResolvedValue({ id: 'log1' });
    await expect(Query.myActiveCrmCall({}, {}, crm('agent7'))).resolves.toEqual({ id: 'log1' });
    expect(store.activeCallFor).toHaveBeenCalledWith('agent7');
  });
});

describe('controlCrmCall', () => {
  it('lets the agent who placed the call control it', async () => {
    await expect(Mutation.controlCrmCall({}, { log_id: 'log1', action: 'MUTE' }, crm())).resolves.toEqual({ ok: true });
    expect(control).toHaveBeenCalledWith('log1', 'MUTE');
  });

  it("refuses another agent's call", async () => {
    await expect(Mutation.controlCrmCall({}, { log_id: 'log1', action: 'END' }, crm('agent2'))).rejects.toThrow(/only the agent who placed this call/i);
    expect(control).not.toHaveBeenCalled();
  });

  it("lets a super admin end someone else's call", async () => {
    await Mutation.controlCrmCall({}, { log_id: 'log1', action: 'END' }, makeContext({ id: 'boss', roles: ['SUPER_ADMIN'] }));
    expect(control).toHaveBeenCalledWith('log1', 'END');
  });

  it('refuses an action it does not know', async () => {
    await expect(Mutation.controlCrmCall({}, { log_id: 'log1', action: 'TRANSFER' as never }, crm())).rejects.toThrow(/unknown call action/i);
  });

  it.each([
    ['a missing log', null],
    ['an email log', { id: 'log1', type: 'EMAIL', created_by: 'agent1' }],
  ])('answers NOT_FOUND for %s', async (_label, found) => {
    store.get.mockResolvedValue(found);
    await expect(Mutation.controlCrmCall({}, { log_id: 'log1', action: 'END' }, crm())).rejects.toThrow(/call not found/i);
  });

  it('answers NOT_FOUND for an id the database rejects', async () => {
    store.get.mockRejectedValue(new Error('Cast to ObjectId failed'));
    await expect(Mutation.controlCrmCall({}, { log_id: 'bad', action: 'END' }, crm())).rejects.toThrow(/call not found/i);
  });
});
