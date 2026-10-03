/**
 * whatsappService.send — the gates in front of AiSensy, against a real database.
 *
 * Every outcome that never reaches AiSensy must still come back as a value AND
 * leave a WaMessageLog row (status, reason, holds_slot=false), because "we
 * never tried" and "we tried and it failed" are different bugs. AiSensy (both
 * the campaign key and the Project API) and the E2E mute switch are faked; the
 * settings rows, the preference rows and the log are real.
 */
import { Types } from 'mongoose';

jest.mock('@observability/log', () => ({
  logs: { server: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
}));
jest.mock('@modules/platform/aisensy/aisensy.gateway', () => ({
  ...jest.requireActual('@modules/platform/aisensy/aisensy.gateway'),
  sendCampaign: jest.fn(),
}));
jest.mock('@modules/platform/aisensy/aisensy.project', () => ({
  ...jest.requireActual('@modules/platform/aisensy/aisensy.project'),
  isProjectApiConfigured: jest.fn(),
  listCampaigns: jest.fn(),
  listTemplates: jest.fn(),
  createCampaign: jest.fn(),
}));
jest.mock('@modules/platform/e2eRun/e2eRun.mute', () => ({
  ...jest.requireActual('@modules/platform/e2eRun/e2eRun.mute'),
  communicationsMuted: jest.fn(),
}));

import { logs } from '@observability/log';
import { INVALID_NUMBER_REASON, sendCampaign } from '@modules/platform/aisensy/aisensy.gateway';
import { isProjectApiConfigured } from '@modules/platform/aisensy/aisensy.project';
import { communicationsMuted, MUTED_REASON } from '@modules/platform/e2eRun/e2eRun.mute';
import { waPreferenceAllows, whatsappService } from '../../whatsapp.service';
import { WaEventSettingModel, WA_GLOBAL_KEY } from '../../waEventSetting.model';
import { WaMessageLogModel } from '../../waMessageLog.model';
import { WaPreferenceModel } from '../../waPreference.model';

const send = sendCampaign as jest.Mock;
const muted = communicationsMuted as jest.Mock;
const projectApi = isProjectApiConfigured as jest.Mock;
const log = logs.server as unknown as Record<'debug' | 'info' | 'warn' | 'error', jest.Mock>;

/** Obviously fake, but a shape WhatsApp accepts: +91 then a mobile number. */
const DEST = '919000000000';

const globalOn = () => WaEventSettingModel.create({ event_key: WA_GLOBAL_KEY, enabled: true });

/** A scenario row the send path treats as already reconciled, so no catalogue read happens. */
const synced = (eventKey: string, over: Record<string, unknown> = {}) =>
  WaEventSettingModel.create({
    event_key: eventKey,
    media_synced_at: new Date('2026-01-01T00:00:00.000Z'),
    template_header_format: '',
    ...over,
  });

const welcome = (over: Record<string, unknown> = {}) => ({
  event: 'USER_WELCOME',
  destination: DEST,
  name: 'Meera',
  params: ['Meera'],
  ...over,
});

const onlyRow = async () => {
  const rows = await WaMessageLogModel.find().lean();
  expect(rows).toHaveLength(1);
  return rows[0];
};

beforeAll(async () => {
  await WaMessageLogModel.init();
});

beforeEach(() => {
  send.mockReset().mockResolvedValue('msg-1');
  muted.mockReset().mockResolvedValue(false);
  projectApi.mockReset().mockResolvedValue(false);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('an event the registry does not know', () => {
  it('is skipped, logged as a wiring mistake, and still filed under the key asked for', async () => {
    const outcome = await whatsappService.send(welcome({ event: 'NOT_A_SCENARIO' }));

    expect(outcome).toEqual({ status: 'SKIPPED', reason: 'Unknown event', message_id: '' });
    expect(log.error).toHaveBeenCalledWith('whatsapp', 'send', expect.any(Object));
    const row = await onlyRow();
    expect(row).toMatchObject({
      event_key: 'NOT_A_SCENARIO',
      campaign: '',
      status: 'SKIPPED',
      destination: DEST,
      holds_slot: false,
    });
    expect(send).not.toHaveBeenCalled();
  });
});

describe('the switches', () => {
  it('holds everything while an E2E run has communications muted', async () => {
    await globalOn();
    muted.mockResolvedValue(true);

    const outcome = await whatsappService.send(welcome());

    expect(outcome.reason).toBe(MUTED_REASON);
    expect((await onlyRow()).status).toBe('SKIPPED');
    expect(send).not.toHaveBeenCalled();
  });

  it('sends nothing when nobody has ever turned automatic WhatsApp on', async () => {
    const outcome = await whatsappService.send(welcome());

    expect(outcome).toMatchObject({ status: 'SKIPPED', reason: 'Automatic WhatsApp is switched off' });
    expect(send).not.toHaveBeenCalled();
  });

  it('sends nothing while the global switch is off', async () => {
    await WaEventSettingModel.create({ event_key: WA_GLOBAL_KEY, enabled: false });

    const outcome = await whatsappService.send(welcome());

    expect(outcome.reason).toBe('Automatic WhatsApp is switched off');
  });

  it('sends nothing for a scenario switched off on its own row', async () => {
    await globalOn();
    await synced('USER_WELCOME', { enabled: false });

    const outcome = await whatsappService.send(welcome());

    expect(outcome).toMatchObject({ status: 'SKIPPED', reason: 'This message is switched off' });
    expect((await onlyRow()).campaign).toBe('welcome_to_duncit');
  });
});

describe('the recipient', () => {
  beforeEach(async () => {
    await globalOn();
    await synced('USER_WELCOME');
  });

  it('is skipped without a number, and the row says so with no destination', async () => {
    const outcome = await whatsappService.send(
      welcome({ destination: null, user: { _id: new Types.ObjectId(), auth: {} } })
    );

    expect(outcome.reason).toBe('No WhatsApp number');
    expect((await onlyRow()).destination).toBe('');
  });

  it('refuses a number WhatsApp cannot live on before AiSensy is asked', async () => {
    const outcome = await whatsappService.send(welcome({ destination: '12345' }));

    expect(outcome).toMatchObject({ status: 'SKIPPED', reason: INVALID_NUMBER_REASON });
    expect((await onlyRow()).destination).toBe('12345');
    expect(send).not.toHaveBeenCalled();
  });

  it('reads an account’s number and files the account on the row', async () => {
    const userId = new Types.ObjectId();

    const outcome = await whatsappService.send(
      welcome({
        destination: null,
        user: { _id: userId, auth: { phone: { number: '9000000000', extension: '+91' } } },
      })
    );

    expect(outcome.status).toBe('SENT');
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ destination: DEST }));
    expect(String((await onlyRow()).recipient_user_id)).toBe(String(userId));
  });

  it('respects an opt-out from an optional category', async () => {
    await synced('USER_CONTACT_INVITE');
    await WaPreferenceModel.create({ destination: DEST, opted_out: ['marketing'] });

    const outcome = await whatsappService.send({
      event: 'USER_CONTACT_INVITE',
      destination: DEST,
      params: ['Meera', 'Vikram', '50', 'MEERA50', 'https://example.com/invite'],
    });

    expect(outcome).toMatchObject({ status: 'SKIPPED', reason: 'Recipient switched this off' });
    expect(send).not.toHaveBeenCalled();
  });
});

describe('the values', () => {
  beforeEach(async () => {
    await globalOn();
    await synced('USER_WELCOME');
  });

  it('fails a send carrying the wrong number of values, before it is billed', async () => {
    const outcome = await whatsappService.send(welcome({ params: ['Meera', 'extra'] }));

    expect(outcome).toEqual({ status: 'FAILED', reason: 'Expected 1 value(s), got 2', message_id: '' });
    const row = await onlyRow();
    expect(row).toMatchObject({ status: 'FAILED', holds_slot: false, params: ['Meera', 'extra'] });
    expect(send).not.toHaveBeenCalled();
  });

  it('names the blank value by its label — AiSensy would print a literal {{1}}', async () => {
    const outcome = await whatsappService.send(welcome({ params: ['   '] }));

    expect(outcome.reason).toBe('Value 1 (Recipient name) is empty');
  });
});

describe('waPreferenceAllows', () => {
  it('never reads Mongo for a category nobody can switch off', async () => {
    const findOne = jest.spyOn(WaPreferenceModel, 'findOne');

    await expect(waPreferenceAllows(DEST, 'billing')).resolves.toBe(true);
    expect(findOne).not.toHaveBeenCalled();
  });

  it('allows an optional category nobody opted out of, and refuses one they did', async () => {
    await WaPreferenceModel.create({ destination: DEST, opted_out: ['reminder'] });

    await expect(waPreferenceAllows(DEST, 'marketing')).resolves.toBe(true);
    await expect(waPreferenceAllows(DEST, 'reminder')).resolves.toBe(false);
    await expect(waPreferenceAllows('919111111111', 'reminder')).resolves.toBe(true);
  });

  it('fails OPEN on a database error, so a blip never loses a message', async () => {
    jest.spyOn(WaPreferenceModel, 'findOne').mockImplementation(() => {
      throw new Error('connection reset');
    });

    await expect(waPreferenceAllows(DEST, 'reminder')).resolves.toBe(true);
    expect(log.warn).toHaveBeenCalledWith('whatsapp', 'preference', expect.objectContaining({ destination: DEST }));
  });
});

describe('send never throws', () => {
  it('turns a failure before the claim into a FAILED outcome and a row', async () => {
    jest.spyOn(WaEventSettingModel, 'find').mockImplementation(() => {
      throw new Error('settings read failed');
    });

    const outcome = await whatsappService.send(welcome());

    expect(outcome).toEqual({ status: 'FAILED', reason: 'settings read failed', message_id: '' });
    expect(await onlyRow()).toMatchObject({ event_key: 'USER_WELCOME', status: 'FAILED', holds_slot: false });
    expect(log.error).toHaveBeenCalledWith('whatsapp', 'send', expect.objectContaining({ event: 'USER_WELCOME' }));
  });

  it('still answers when even the log row cannot be written', async () => {
    jest.spyOn(WaMessageLogModel, 'create').mockRejectedValue(new Error('log is down') as never);

    const outcome = await whatsappService.send(welcome({ event: 'NOT_A_SCENARIO' }));

    expect(outcome.reason).toBe('Unknown event');
    expect(log.warn).toHaveBeenCalledWith('whatsapp', 'record', expect.objectContaining({ event: 'NOT_A_SCENARIO' }));
  });
});

describe('sendEach', () => {
  it('sends one at a time and answers in the order it was given', async () => {
    await globalOn();
    await synced('USER_WELCOME');
    send.mockResolvedValueOnce('first').mockResolvedValueOnce('second');

    const outcomes = await whatsappService.sendEach([
      welcome({ entityId: 'a' }),
      welcome({ entityId: 'b', destination: '', user: null }),
      welcome({ entityId: 'c' }),
    ]);

    expect(outcomes.map((outcome) => outcome.status)).toEqual(['SENT', 'SKIPPED', 'SENT']);
    expect(outcomes.map((outcome) => outcome.message_id)).toEqual(['first', '', 'second']);
  });

  it('answers an empty fan-out with nothing', async () => {
    await expect(whatsappService.sendEach([])).resolves.toEqual([]);
  });
});
