/**
 * Mute, hold and end act on a stranger's live phone call, so each is refused
 * unless the call is a connected conference call and Twilio accepted the
 * change; only then does the log (and the agent's window) say it happened.
 * And an agent leg Twilio refuses must hang the lead up, not leave them on
 * hold music.
 */
jest.mock('@modules/crm/communicationLog/communicationLog.service', () => ({
  communicationLogService: { get: jest.fn(), getMetadata: jest.fn(), update: jest.fn() },
}));
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn() } } }));
jest.mock('./../../call.socket', () => ({ emitCallStatus: jest.fn() }));
jest.mock('./../../call.config', () => ({ twilioApi: jest.fn(), twilioCreds: jest.fn() }));

import { communicationLogService } from '@modules/crm/communicationLog/communicationLog.service';
import { emitCallStatus } from '../../call.socket';
import { twilioApi, twilioCreds } from '../../call.config';
import { addAgentToConference, controlCall, endCustomerLeg } from '../../call.conference';

const logs = communicationLogService as unknown as Record<string, jest.Mock>;
const api = twilioApi as jest.Mock;
const creds = twilioCreds as jest.Mock;
const emit = emitCallStatus as jest.Mock;

const CREDS = { accountSid: 'AC1', authToken: 't', fromNumber: '+15550001111', baseUrl: 'https://server.example.test' };
const liveLog = (over: Record<string, unknown> = {}) => ({
  id: 'log1',
  type: 'CALL',
  status: 'IN_PROGRESS',
  external_id: 'CA-lead',
  entity_type: 'VENUE_LEAD',
  entity_id: 'lead1',
  created_by: 'agent1',
  ...over,
});
const CONF_META = { bridge: 'CONFERENCE', agent_call_sid: 'CA-agent', conference_sid: 'CF1' };
const ok = (json: Record<string, unknown> = {}) => ({ ok: true, status: 200, json });

beforeEach(() => {
  creds.mockResolvedValue(CREDS);
  logs.get.mockResolvedValue(liveLog());
  logs.getMetadata.mockResolvedValue(CONF_META);
  logs.update.mockResolvedValue(null);
  api.mockResolvedValue(ok());
});

const lastBody = () => {
  const call = api.mock.calls.at(-1) as [unknown, string, URLSearchParams];
  return { path: call[1], body: Object.fromEntries(call[2]) };
};

describe('addAgentToConference', () => {
  it('rings the agent into the call conference and stores the leg and conference ids', async () => {
    api.mockResolvedValue(ok({ call_sid: 'CA-agent', conference_sid: 'CF1' }));

    await addAgentToConference({ creds: CREDS, logId: 'log1', userId: 'agent 1', agent: '+919800000000' });

    const { path, body } = lastBody();
    expect(path).toBe('/Conferences/crm-log1/Participants.json');
    expect(body).toMatchObject({
      From: '+15550001111',
      To: '+919800000000',
      StartConferenceOnEnter: 'true',
      EndConferenceOnExit: 'true',
      Timeout: '30',
      StatusCallback: 'https://server.example.test/twilio/call-status?logId=log1&userId=agent%201&mode=PORTAL&leg=agent',
    });
    expect(logs.update).toHaveBeenCalledWith('log1', { metadata: { agent_call_sid: 'CA-agent', conference_sid: 'CF1' } });
  });

  it('stores empty ids when Twilio answered without them', async () => {
    api.mockResolvedValue(ok({ call_sid: 42 }));

    await addAgentToConference({ creds: CREDS, logId: 'log1', userId: 'u', agent: '+919800000000' });

    expect(logs.update).toHaveBeenCalledWith('log1', { metadata: { agent_call_sid: '', conference_sid: '' } });
  });

  it("hangs the lead up with Twilio's reason when the agent leg is refused", async () => {
    api.mockResolvedValueOnce({ ok: false, status: 400, json: { message: 'Invalid To number' } }).mockResolvedValue(ok());

    await addAgentToConference({ creds: CREDS, logId: 'log1', userId: 'u', agent: '+919800000000' });

    expect(lastBody()).toEqual({ path: '/Calls/CA-lead.json', body: { Status: 'completed' } });
    expect(logs.update).toHaveBeenCalledWith('log1', { error_message: 'Invalid To number' });
  });

  it('names the HTTP status when the refusal has no reason', async () => {
    api.mockResolvedValueOnce({ ok: false, status: 503, json: {} }).mockResolvedValue(ok());

    await addAgentToConference({ creds: CREDS, logId: 'log1', userId: 'u', agent: '+919800000000' });

    expect(logs.update).toHaveBeenCalledWith('log1', { error_message: 'Could not ring the agent phone (HTTP 503)' });
  });
});

describe('endCustomerLeg', () => {
  it('cancels a call that is still ringing', async () => {
    logs.get.mockResolvedValue(liveLog({ status: 'RINGING' }));

    await expect(endCustomerLeg(CREDS, 'log1')).resolves.toBe(true);
    expect(lastBody().body).toEqual({ Status: 'canceled' });
    expect(logs.update).not.toHaveBeenCalled();
  });

  it('cancels a call that has not started ringing', async () => {
    logs.get.mockResolvedValue(liveLog({ status: 'INITIATED' }));
    await endCustomerLeg(CREDS, 'log1');
    expect(lastBody().body).toEqual({ Status: 'canceled' });
  });

  it('cannot end a call Twilio has no id for yet', async () => {
    logs.get.mockResolvedValue(liveLog({ external_id: '' }));

    await expect(endCustomerLeg(CREDS, 'log1')).resolves.toBe(false);
    expect(api).not.toHaveBeenCalled();
  });

  it('reports a refusal from Twilio', async () => {
    api.mockResolvedValue({ ok: false, status: 404, json: {} });
    await expect(endCustomerLeg(CREDS, 'log1', 'why')).resolves.toBe(false);
    expect(logs.update).toHaveBeenCalledWith('log1', { error_message: 'why' });
  });
});

describe('controlCall', () => {
  it('mutes the agent leg, records it and tells the agent window', async () => {
    const result = await controlCall('log1', 'MUTE');

    expect(lastBody()).toEqual({ path: '/Conferences/CF1/Participants/CA-agent.json', body: { Muted: 'true' } });
    expect(result).toEqual({ ok: true, message: 'Updated', log_id: 'log1', status: 'IN_PROGRESS', muted: true, on_hold: false });
    expect(logs.update).toHaveBeenCalledWith('log1', { metadata: { muted: true } });
    expect(emit).toHaveBeenCalledWith('agent1', expect.objectContaining({ log_id: 'log1', muted: true, on_hold: false }));
  });

  it('unmutes', async () => {
    logs.getMetadata.mockResolvedValue({ ...CONF_META, muted: true });
    const result = await controlCall('log1', 'UNMUTE');
    expect(lastBody().body).toEqual({ Muted: 'false' });
    expect(result.muted).toBe(false);
  });

  it('puts the lead (not the agent) on hold, and resumes', async () => {
    const held = await controlCall('log1', 'HOLD');
    expect(lastBody()).toEqual({ path: '/Conferences/CF1/Participants/CA-lead.json', body: { Hold: 'true' } });
    expect(held.on_hold).toBe(true);

    logs.getMetadata.mockResolvedValue({ ...CONF_META, on_hold: true });
    const resumed = await controlCall('log1', 'RESUME');
    expect(lastBody().body).toEqual({ Hold: 'false' });
    expect(resumed.on_hold).toBe(false);
  });

  it('looks the conference up by name when the log has no id for it yet', async () => {
    logs.getMetadata.mockResolvedValue({ bridge: 'CONFERENCE', agent_call_sid: 'CA-agent' });
    api.mockResolvedValueOnce(ok({ conferences: [{ sid: 'CF9' }] })).mockResolvedValue(ok());

    await controlCall('log1', 'MUTE');

    expect(api.mock.calls[0][1]).toBe('/Conferences.json?FriendlyName=crm-log1&Status=in-progress');
    expect(logs.update).toHaveBeenCalledWith('log1', { metadata: { conference_sid: 'CF9' } });
    expect(lastBody().path).toBe('/Conferences/CF9/Participants/CA-agent.json');
  });

  it('refuses when no conference can be found, and changes nothing', async () => {
    logs.getMetadata.mockResolvedValue({ bridge: 'CONFERENCE', agent_call_sid: 'CA-agent' });
    api.mockResolvedValue(ok({ conferences: 'nope' }));

    const result = await controlCall('log1', 'MUTE');

    expect(result).toEqual(expect.objectContaining({ ok: false, muted: false }));
    expect(logs.update).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('refuses when the agent leg has no id', async () => {
    logs.getMetadata.mockResolvedValue({ bridge: 'CONFERENCE', conference_sid: 'CF1' });
    const result = await controlCall('log1', 'MUTE');
    expect(result.ok).toBe(false);
  });

  it('says so when Twilio does not accept the change', async () => {
    api.mockResolvedValue({ ok: false, status: 400, json: {} });

    const result = await controlCall('log1', 'HOLD');

    expect(result).toEqual(expect.objectContaining({ ok: false, message: 'Twilio did not accept the change. Try again.', on_hold: false }));
  });

  it('ends the call by hanging the lead up', async () => {
    await expect(controlCall('log1', 'END')).resolves.toEqual(expect.objectContaining({ ok: true, message: 'Ending the call' }));
    expect(lastBody()).toEqual({ path: '/Calls/CA-lead.json', body: { Status: 'completed' } });
  });

  it('reports an end Twilio refused', async () => {
    api.mockResolvedValue({ ok: false, status: 400, json: {} });
    await expect(controlCall('log1', 'END')).resolves.toEqual(expect.objectContaining({ ok: false }));
  });

  it('ends an AI call too, which has no conference', async () => {
    logs.getMetadata.mockResolvedValue({ mode: 'AI' });
    await expect(controlCall('log1', 'END')).resolves.toEqual(expect.objectContaining({ ok: true }));
  });

  it.each([
    ['an AI call', { mode: 'AI' }, liveLog()],
    ['a call still ringing', CONF_META, liveLog({ status: 'RINGING' })],
  ])('refuses mute and hold on %s', async (_label, meta, log) => {
    logs.getMetadata.mockResolvedValue(meta);
    logs.get.mockResolvedValue(log);

    const result = await controlCall('log1', 'MUTE');

    expect(result).toEqual(expect.objectContaining({ ok: false, message: 'Mute and hold work once the call is connected.' }));
    expect(api).not.toHaveBeenCalled();
  });

  it('refuses a call that already ended', async () => {
    logs.get.mockResolvedValue(liveLog({ status: 'COMPLETED' }));
    await expect(controlCall('log1', 'END')).resolves.toEqual(expect.objectContaining({ ok: false, status: 'COMPLETED' }));
  });

  it('refuses a log that is not a call, or is missing', async () => {
    logs.get.mockResolvedValue(liveLog({ type: 'EMAIL' }));
    await expect(controlCall('log1', 'END')).resolves.toEqual(expect.objectContaining({ ok: false, message: 'Not a call' }));

    logs.get.mockResolvedValue(null);
    logs.getMetadata.mockResolvedValue(null);
    await expect(controlCall('log1', 'END')).resolves.toEqual({
      ok: false,
      message: 'Not a call',
      log_id: 'log1',
      status: null,
      muted: false,
      on_hold: false,
    });
  });

  it('refuses while Twilio is not configured', async () => {
    creds.mockResolvedValue(null);
    await expect(controlCall('log1', 'MUTE')).resolves.toEqual(expect.objectContaining({ ok: false, message: 'Twilio is not configured.' }));
  });

  it('still answers when the call has no owner to notify', async () => {
    logs.get.mockResolvedValue(liveLog({ created_by: null }));
    await controlCall('log1', 'MUTE');
    expect(emit).toHaveBeenCalledWith('', expect.objectContaining({ muted: true }));
  });
});
