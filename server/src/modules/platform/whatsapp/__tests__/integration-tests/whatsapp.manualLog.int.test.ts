/**
 * A WhatsApp message a person sent by hand, filed in the log against a real
 * database: the clean send, the rejected one, and the write that fails without
 * taking the send down with it.
 */
import { logs } from '@observability/log';
import { recordManualSend, WA_MANUAL_EVENT_KEY } from '../../whatsapp.manualLog';
import { WaMessageLogModel } from '../../waMessageLog.model';

afterEach(() => jest.restoreAllMocks());

describe('recordManualSend', () => {
  it('files a clean send as SENT with everything it was given, never holding the slot', async () => {
    await recordManualSend({
      key: WA_MANUAL_EVENT_KEY, campaign: 'welcome', destination: '919876543210', template_category: 'MARKETING', msg_rate: 0.8,
      params: ['Asha', 'Pod'], media: { url: 'https://i/x.png', filename: 'x.png' }, submitted_message_id: 'mid-1', duration_ms: 120,
    });
    const row = await WaMessageLogModel.findOne().lean();
    expect(row).toMatchObject({
      event_key: WA_MANUAL_EVENT_KEY, campaign: 'welcome', category: 'support', audience: 'SUPPORT', destination: '919876543210',
      status: 'SENT', reason: '', params: ['Asha', 'Pod'], media_url: 'https://i/x.png', media_filename: 'x.png',
      submitted_message_id: 'mid-1', template_category: 'MARKETING', msg_rate: 0.8, duration_ms: 120, holds_slot: false,
    });
  });

  it('files a rejected send as FAILED with the vendor’s sentence, and defaults what it was not given', async () => {
    await recordManualSend({ key: WA_MANUAL_EVENT_KEY, campaign: 'welcome', destination: '919876543210', reason: 'Campaign does not exist.', duration_ms: 5 });
    expect(await WaMessageLogModel.findOne().lean()).toMatchObject({
      status: 'FAILED', reason: 'Campaign does not exist.', params: [], media_url: '', media_filename: '', submitted_message_id: '', template_category: '', msg_rate: 0,
    });
  });

  it('lets the same test be sent twice on purpose', async () => {
    const send = () => recordManualSend({ key: WA_MANUAL_EVENT_KEY, campaign: 'welcome', destination: '919876543210', duration_ms: 1, media: null });
    await send();
    await send();
    expect(await WaMessageLogModel.countDocuments()).toBe(2);
  });

  it('never throws when the log write fails, and says so in the log', async () => {
    jest.spyOn(WaMessageLogModel, 'create').mockRejectedValue(new Error('db down') as never);
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined as never);
    await expect(recordManualSend({ key: WA_MANUAL_EVENT_KEY, campaign: 'c', destination: '1', duration_ms: 1 })).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith('whatsapp', 'record', expect.objectContaining({ event: WA_MANUAL_EVENT_KEY }));
  });
});
