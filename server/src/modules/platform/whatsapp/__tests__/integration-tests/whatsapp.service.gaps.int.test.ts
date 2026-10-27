/**
 * whatsappService.send — the paths the gate and dispatch suites leave out, against
 * a real database: the weekly marketing cap, a template's link button, a global
 * row written before the default-asset fields existed, a rejection no default
 * can answer, and the contract that send never throws.
 */
jest.mock('@modules/platform/aisensy/aisensy.gateway', () => ({
  ...jest.requireActual('@modules/platform/aisensy/aisensy.gateway'),
  sendCampaign: jest.fn(),
}));
jest.mock('@modules/platform/aisensy/aisensy.project', () => ({
  ...jest.requireActual('@modules/platform/aisensy/aisensy.project'),
  isProjectApiConfigured: jest.fn().mockResolvedValue(false),
}));
jest.mock('@modules/platform/e2eRun/e2eRun.mute', () => ({
  ...jest.requireActual('@modules/platform/e2eRun/e2eRun.mute'),
  communicationsMuted: jest.fn(),
}));
jest.mock('@modules/crm/marketing/waMarketingCap', () => ({
  ...jest.requireActual('@modules/crm/marketing/waMarketingCap'),
  marketingWeeklyCap: jest.fn().mockResolvedValue(3),
  overMarketingCap: jest.fn(),
}));

import { logs } from '@observability/log';
import { sendCampaign } from '@modules/platform/aisensy/aisensy.gateway';
import { communicationsMuted } from '@modules/platform/e2eRun/e2eRun.mute';
import { CAPPED_REASON, overMarketingCap } from '@modules/crm/marketing/waMarketingCap';
import { WA_EVENTS } from '../../whatsapp.events';
import { whatsappService } from '../../whatsapp.service';
import { WaEventSettingModel, WA_GLOBAL_KEY } from '../../waEventSetting.model';
import { WaMessageLogModel } from '../../waMessageLog.model';

const send = sendCampaign as jest.Mock;
const muted = communicationsMuted as jest.Mock;
const capped = overMarketingCap as jest.Mock;
const DEST = '919000000000';
const MEDIA_MISSING = new Error('AiSensy error: Media URL Missing (HTTP 400)');

const MARKETING = WA_EVENTS.find((e) => e.category === 'marketing') as (typeof WA_EVENTS)[number];
const input = (event: (typeof WA_EVENTS)[number], over: Record<string, unknown> = {}) => ({
  event: event.key, entityId: 'entity-1', destination: DEST, name: 'Meera', params: event.params.map((_, i) => `v${i + 1}`), ...over,
});

const globalOn = () => WaEventSettingModel.create({ event_key: WA_GLOBAL_KEY, enabled: true });
const synced = (eventKey: string, over: Record<string, unknown> = {}) =>
  WaEventSettingModel.create({ event_key: eventKey, media_synced_at: new Date('2026-01-01T00:00:00.000Z'), template_header_format: '', ...over });
const onlyRow = async () => {
  const rows = await WaMessageLogModel.find().lean();
  expect(rows).toHaveLength(1);
  return rows[0];
};

beforeEach(() => {
  send.mockReset().mockResolvedValue('msg-1');
  muted.mockReset().mockResolvedValue(false);
  capped.mockReset().mockResolvedValue(false);
});
afterEach(() => jest.restoreAllMocks());

describe('the weekly marketing cap', () => {
  it('holds an automatic marketing message back once the recipient is over it', async () => {
    await globalOn();
    await synced(MARKETING.key);
    capped.mockResolvedValue(true);
    await expect(whatsappService.send(input(MARKETING))).resolves.toMatchObject({ status: 'SKIPPED', reason: CAPPED_REASON });
    expect(send).not.toHaveBeenCalled();
    expect(capped).toHaveBeenCalledWith(DEST, 3);
    expect(await onlyRow()).toMatchObject({ status: 'SKIPPED', reason: CAPPED_REASON, holds_slot: false });
  });

  it('sends it while the recipient is under the cap', async () => {
    await globalOn();
    await synced(MARKETING.key);
    await expect(whatsappService.send(input(MARKETING))).resolves.toMatchObject({ status: 'SENT' });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('never asks about the cap for a message that is not marketing', async () => {
    const other = WA_EVENTS.find((e) => e.category !== 'marketing') as (typeof WA_EVENTS)[number];
    await globalOn();
    await synced(other.key);
    await whatsappService.send(input(other));
    expect(capped).not.toHaveBeenCalled();
  });
});

describe('a template with a dynamic link button', () => {
  const ev = WA_EVENTS[0];

  it('fills the button with the part of the link the template leaves open', async () => {
    await globalOn();
    await synced(ev.key, { template_link_url: 'https://mweb.duncit.com/p/{{1}}', template_link_index: 0 });
    await whatsappService.send(input(ev, { buttonUrl: 'https://mweb.duncit.com/p/jazz-night' }));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ buttons: [{ index: 0, value: 'jazz-night' }] }));
  });

  it('sends no buttons key when the link does not fit the template', async () => {
    await globalOn();
    await synced(ev.key, { template_link_url: 'https://mweb.duncit.com/p/{{1}}', template_link_index: 0 });
    await whatsappService.send(input(ev, { buttonUrl: 'https://elsewhere.example/x' }));
    expect(send.mock.calls[0][0]).not.toHaveProperty('buttons');
  });
});

describe('a global row written before the default-asset fields existed', () => {
  it('sends without a default asset instead of failing on the missing fields', async () => {
    await WaEventSettingModel.collection.insertOne({ event_key: WA_GLOBAL_KEY, enabled: true });
    const ev = WA_EVENTS[0];
    await synced(ev.key);
    await expect(whatsappService.send(input(ev))).resolves.toMatchObject({ status: 'SENT' });
    expect(send.mock.calls[0][0].media).toBeUndefined();
  });
});

describe('a header rejection nothing can answer', () => {
  it('fails with the setting to fix when the template wants an image and the platform holds none', async () => {
    const ev = WA_EVENTS[0];
    await globalOn();
    await synced(ev.key, { template_header_format: 'IMAGE' });
    send.mockRejectedValue(MEDIA_MISSING);
    const outcome = await whatsappService.send(input(ev));
    expect(outcome.status).toBe('FAILED');
    expect(outcome.reason).toContain('no default is set');
    expect(send).toHaveBeenCalledTimes(1);
    expect(await onlyRow()).toMatchObject({ status: 'FAILED', holds_slot: false });
  });
});

describe('bookkeeping that fails after the send', () => {
  const ev = WA_EVENTS[0];

  it('reports a rejection even when the row cannot be updated to say so, and logs it', async () => {
    await globalOn();
    await synced(ev.key);
    send.mockRejectedValue(new Error('AiSensy error: bad template (HTTP 400)'));
    jest.spyOn(WaMessageLogModel, 'updateOne').mockRejectedValue(new Error('db down') as never);
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined as never);
    await expect(whatsappService.send(input(ev))).resolves.toMatchObject({ status: 'FAILED', reason: 'AiSensy error: bad template (HTTP 400)' });
    expect(warn).toHaveBeenCalledWith('whatsapp', 'record', expect.objectContaining({ event: ev.key }));
  });

  it('still reports the send as made when the header kind it learned cannot be remembered', async () => {
    await WaEventSettingModel.create({ event_key: WA_GLOBAL_KEY, enabled: true, override_media_url: 'https://cdn.example.com/default.jpg', override_media_filename: 'default.jpg' });
    await WaEventSettingModel.create({ event_key: ev.key, media_synced_at: new Date('2026-01-01T00:00:00.000Z'), template_header_format: '' });
    // The header kind is not yet learned, so the first post carries nothing and is refused; the retry carries the platform default.
    send.mockRejectedValueOnce(MEDIA_MISSING).mockResolvedValueOnce('msg-2');
    jest.spyOn(WaEventSettingModel, 'updateOne').mockRejectedValue(new Error('db down') as never);
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined as never);
    await expect(whatsappService.send(input(ev))).resolves.toMatchObject({ status: 'SENT', message_id: 'msg-2' });
    expect(warn).toHaveBeenCalledWith('whatsapp', 'learnHeader', expect.objectContaining({ event: ev.key }));
  });
});

describe('send never throws', () => {
  it('files a failure under a generic reason when something throws that is not an Error', async () => {
    const ev = WA_EVENTS[0];
    muted.mockRejectedValue('plain string');
    const outcome = await whatsappService.send(input(ev));
    expect(outcome).toEqual({ status: 'FAILED', reason: 'Unexpected error', message_id: '' });
    expect(await onlyRow()).toMatchObject({ event_key: ev.key, status: 'FAILED', reason: 'Unexpected error' });
  });

  it('files the failure under the key it was asked for even when the event is unknown and the logger breaks', async () => {
    jest.spyOn(logs.server, 'error').mockImplementationOnce(() => {
      throw new Error('logger down');
    });
    const outcome = await whatsappService.send({ event: 'NOT_A_SCENARIO', destination: DEST, params: [] });
    expect(outcome).toMatchObject({ status: 'FAILED', reason: 'logger down' });
    expect(await onlyRow()).toMatchObject({ event_key: 'NOT_A_SCENARIO', status: 'FAILED', reason: 'logger down' });
  });

  it('treats a recipient whose number cannot even be read as having none, rather than throwing', async () => {
    const ev = WA_EVENTS[0];
    await globalOn();
    await synced(ev.key);
    const garbled = { communication: { whatsapp: { number: Object.create(null) } } };
    const outcome = await whatsappService.send(input(ev, { destination: undefined, user: garbled }));
    expect(outcome).toMatchObject({ status: 'SKIPPED', reason: 'No WhatsApp number' });
    expect(send).not.toHaveBeenCalled();
  });

  it('answers a failure even when a call site handed it parameters it cannot file', async () => {
    const ev = WA_EVENTS[0];
    muted.mockRejectedValue(new Error('mute check broke'));
    jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
    await expect(whatsappService.send({ ...input(ev), params: undefined as never })).resolves.toEqual({
      status: 'FAILED', reason: 'mute check broke', message_id: '',
    });
  });

  it('still answers when even filing the failure fails', async () => {
    const ev = WA_EVENTS[0];
    muted.mockRejectedValue(new Error('mute check broke'));
    jest.spyOn(WaMessageLogModel, 'create').mockRejectedValue(new Error('db down') as never);
    jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined as never);
    await expect(whatsappService.send(input(ev))).resolves.toMatchObject({ status: 'FAILED', reason: 'mute check broke' });
  });
});
