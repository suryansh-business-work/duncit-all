/**
 * Re-sending what the last hour failed to deliver for want of a connection,
 * against a real database. AiSensy and the E2E mute switch are faked; the log
 * rows, the scenario switches, the consent lookup and the one-message slot
 * index are real.
 */
jest.mock('@observability/log', () => ({
  logs: { server: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
}));
jest.mock('@modules/platform/aisensy/aisensy.gateway', () => ({
  ...jest.requireActual('@modules/platform/aisensy/aisensy.gateway'),
  sendCampaign: jest.fn(),
}));
jest.mock('@modules/platform/e2eRun/e2eRun.mute', () => ({
  ...jest.requireActual('@modules/platform/e2eRun/e2eRun.mute'),
  communicationsMuted: jest.fn(),
}));

import { sendCampaign } from '@modules/platform/aisensy/aisensy.gateway';
import { communicationsMuted } from '@modules/platform/e2eRun/e2eRun.mute';
import { WA_EVENTS } from '../../whatsapp.events';
import { retryUnreachedMessages } from '../../whatsapp.retry';
import { WaEventSettingModel } from '../../waEventSetting.model';
import { WaMessageLogModel } from '../../waMessageLog.model';
import { WaPreferenceModel } from '../../waPreference.model';

const send = sendCampaign as jest.Mock;
const muted = communicationsMuted as jest.Mock;
const EVENT = WA_EVENTS[0];
const UNREACHED = 'Could not reach AiSensy after 3 attempt(s): UND_ERR_CONNECT_TIMEOUT (Connect Timeout Error)';

let seq = 0;
const failed = (over: Record<string, unknown> = {}) => {
  seq += 1;
  return WaMessageLogModel.create({
    event_key: EVENT.key, campaign: 'welcome_v1', category: EVENT.category, destination: `9190000000${seq}`, entity_id: `e${seq}`,
    user_name: 'Meera', status: 'FAILED', reason: UNREACHED, params: ['Meera'], holds_slot: false,
    // Oldest first by construction: the sweep reads rows in this order.
    created_at: new Date(Date.now() - 60_000 + seq * 1000),
    ...over,
  });
};
const reload = (id: unknown) => WaMessageLogModel.findById(id).lean();

beforeEach(() => {
  send.mockReset().mockResolvedValue('mid-new');
  muted.mockReset().mockResolvedValue(false);
});

describe('retryUnreachedMessages', () => {
  it('sends again what never reached AiSensy, with the frozen values, and records the new outcome', async () => {
    const row = await failed({ media_url: 'https://i/x.png', media_filename: 'x.png' });
    await retryUnreachedMessages();
    expect(send).toHaveBeenCalledWith({
      campaign_name: 'welcome_v1', destination: row.destination, user_name: 'Meera', template_params: ['Meera'], media: { url: 'https://i/x.png', filename: 'x.png' },
    });
    expect(await reload(row._id)).toMatchObject({ status: 'SENT', reason: '', submitted_message_id: 'mid-new', holds_slot: true });
  });

  it('sends without media when the message carried none, and as "there" for a row written before names were kept', async () => {
    const row = await failed();
    await WaMessageLogModel.collection.updateOne({ _id: row._id }, { $unset: { user_name: 1 } });
    await retryUnreachedMessages();
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ user_name: 'there', media: undefined }));
  });

  it('does nothing while communications are muted', async () => {
    await failed();
    muted.mockResolvedValue(true);
    await retryUnreachedMessages();
    expect(send).not.toHaveBeenCalled();
  });

  it('leaves alone what AiSensy answered, what is older than an hour, and what was not a registry scenario', async () => {
    await failed({ reason: 'AiSensy error: Campaign does not exist. (HTTP 400)' });
    const old = await failed();
    await WaMessageLogModel.collection.updateOne({ _id: old._id }, { $set: { created_at: new Date(Date.now() - 2 * 3_600_000) } });
    await failed({ event_key: 'MANUAL_TEST_SEND' });
    await retryUnreachedMessages();
    expect(send).not.toHaveBeenCalled();
  });

  it('skips a scenario that has been switched off, and a recipient who opted out of its category', async () => {
    await failed();
    await WaEventSettingModel.create({ event_key: EVENT.key, enabled: false });
    await retryUnreachedMessages();
    expect(send).not.toHaveBeenCalled();
    await WaEventSettingModel.deleteMany({});
    const optional = WA_EVENTS.find((e) => e.category === 'marketing') ?? WA_EVENTS.find((e) => e.category !== 'billing');
    const row = await failed({ event_key: optional?.key ?? EVENT.key, category: 'marketing', destination: '919000000777' });
    await WaPreferenceModel.create({ destination: '919000000777', opted_out: ['marketing'] });
    await retryUnreachedMessages();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalledWith(expect.objectContaining({ destination: row.destination }));
  });

  it('records a rejection with its reason, frees the slot, and carries on to the next row', async () => {
    const first = await failed({ destination: '919000000001' });
    const second = await failed({ destination: '919000000002' });
    send.mockRejectedValueOnce(new Error('AiSensy error: bad template (HTTP 400)')).mockResolvedValueOnce('mid-2');
    await retryUnreachedMessages();
    expect(await reload(first._id)).toMatchObject({ status: 'FAILED', reason: 'AiSensy error: bad template (HTTP 400)', holds_slot: false });
    expect(await reload(second._id)).toMatchObject({ status: 'SENT' });
  });

  it('records a rejection that was not an Error under a generic reason', async () => {
    const row = await failed();
    send.mockRejectedValueOnce('plain');
    await retryUnreachedMessages();
    expect(await reload(row._id)).toMatchObject({ status: 'FAILED', reason: 'AiSensy rejected the message' });
  });

  it('stops the sweep as soon as the connection is still down', async () => {
    await failed({ destination: '919000000001' });
    await failed({ destination: '919000000002' });
    send.mockRejectedValue(new Error(UNREACHED));
    await retryUnreachedMessages();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('marks a message skipped when a later trigger of the same event already got through', async () => {
    const row = await failed({ entity_id: 'same', destination: '919000000500' });
    await WaMessageLogModel.create({
      event_key: EVENT.key, campaign: 'welcome_v1', category: EVENT.category, destination: '919000000500', entity_id: 'same', status: 'SENT', holds_slot: true,
    });
    await retryUnreachedMessages();
    expect(send).not.toHaveBeenCalled();
    expect(await reload(row._id)).toMatchObject({ status: 'SKIPPED', reason: 'Already sent' });
  });

  it('does not send a row that another sweep already claimed', async () => {
    const row = await failed();
    const spy = jest.spyOn(WaMessageLogModel, 'updateOne').mockResolvedValueOnce({ modifiedCount: 0 } as never);
    await retryUnreachedMessages();
    spy.mockRestore();
    expect(send).not.toHaveBeenCalled();
    expect((await reload(row._id))?.status).toBe('FAILED');
  });

  it('lets an unexpected database error out of the sweep rather than sending blind', async () => {
    await failed();
    const spy = jest.spyOn(WaMessageLogModel, 'updateOne').mockRejectedValueOnce(new Error('db down') as never);
    await expect(retryUnreachedMessages()).rejects.toThrow('db down');
    spy.mockRestore();
    expect(send).not.toHaveBeenCalled();
  });
});
