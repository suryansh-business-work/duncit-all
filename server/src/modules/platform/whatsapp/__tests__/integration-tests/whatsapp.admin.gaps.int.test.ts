/**
 * The Marketing > WhatsApp board's remaining corners, against a real database:
 * submitting a template without an actor on record, clearing a scenario's own
 * header asset, and opening a message log row written before the later fields
 * (media, rate, duration) were added to it.
 */
jest.mock('@observability/log', () => ({
  logs: { server: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
}));
jest.mock('@modules/platform/aisensy/aisensy.project', () => ({
  ...jest.requireActual('@modules/platform/aisensy/aisensy.project'),
  isProjectApiConfigured: jest.fn(),
  listCampaigns: jest.fn(),
  listTemplates: jest.fn(),
  createTemplate: jest.fn(),
  createCampaign: jest.fn(),
}));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { createTemplate, isProjectApiConfigured, listCampaigns, listTemplates } from '@modules/platform/aisensy/aisensy.project';
import { whatsappAdminService } from '../../whatsapp.admin';
import { WaEventSettingModel } from '../../waEventSetting.model';
import { WaMessageLogModel } from '../../waMessageLog.model';

const info = logs.server.info as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (isProjectApiConfigured as jest.Mock).mockResolvedValue(true);
  // Something else at AiSensy, so the catalogue reads as live but holds nothing for the scenario.
  (listCampaigns as jest.Mock).mockResolvedValue([{ name: 'some_other_campaign', status: 'LIVE', template_name: 'other_tpl' }]);
  (listTemplates as jest.Mock).mockResolvedValue([{ name: 'other_tpl', status: 'APPROVED', param_count: 1, header_format: '' }]);
  (createTemplate as jest.Mock).mockResolvedValue({ name: 'host_onboarding_rejection', status: 'PENDING', reason: '' });
});

describe('provision without an actor', () => {
  it('still submits the drafted template and records an empty actor in the log', async () => {
    await whatsappAdminService.provision('HOST_ONBOARDING_REJECTED');
    expect(createTemplate).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('whatsapp', 'provision', expect.objectContaining({ event_key: 'HOST_ONBOARDING_REJECTED', actor: '' }));
  });
});

describe('setMedia', () => {
  it('sets a scenario’s own header asset with a trimmed filename, then clears both halves with an empty url', async () => {
    await whatsappAdminService.setMedia('USER_WELCOME', 'https://cdn.example.com/own.jpg', ' own.jpg ');
    expect(await WaEventSettingModel.findOne({ event_key: 'USER_WELCOME' }).lean()).toMatchObject({
      override_media_url: 'https://cdn.example.com/own.jpg', override_media_filename: 'own.jpg', enabled: true,
    });
    await whatsappAdminService.setMedia('USER_WELCOME', '  ', 'leftover.jpg');
    expect(await WaEventSettingModel.findOne({ event_key: 'USER_WELCOME' }).lean()).toMatchObject({
      override_media_url: '', override_media_filename: '',
    });
  });

  it('refuses a link that is not a public http(s) address', async () => {
    await expect(whatsappAdminService.setMedia('USER_WELCOME', 'ftp://x/y.jpg', 'y.jpg')).rejects.toMatchObject({ extensions: { code: 'BAD_REQUEST' } });
    expect(await WaEventSettingModel.countDocuments()).toBe(0);
  });
});

describe('logById', () => {
  it('opens a row written before the later fields existed with blanks for what it never recorded', async () => {
    const { insertedId } = await WaMessageLogModel.collection.insertOne({
      event_key: 'USER_WELCOME', campaign: 'welcome', category: 'billing', audience: 'USER', status: 'SENT', created_at: new Date('2026-01-02T03:04:05.000Z'),
    });
    expect(await whatsappAdminService.logById(String(insertedId))).toEqual({
      id: String(insertedId), event_key: 'USER_WELCOME', campaign: 'welcome', category: 'billing', audience: 'USER', entity_id: '',
      recipient_user_id: null, destination: '', status: 'SENT', reason: '', params: [], media_url: '', media_filename: '',
      submitted_message_id: '', template_category: '', msg_rate: 0, duration_ms: 0, created_at: '2026-01-02T03:04:05.000Z',
    });
  });

  it('opens a fully recorded row as it was written, including the recipient', async () => {
    const recipient = new Types.ObjectId();
    const row = await WaMessageLogModel.create({
      event_key: 'USER_WELCOME', campaign: 'welcome', category: 'billing', audience: 'USER', entity_id: 'e1', recipient_user_id: recipient,
      destination: '919000000000', status: 'FAILED', reason: 'boom', params: ['Meera'], media_url: 'https://i/x.png', media_filename: 'x.png',
      submitted_message_id: 'mid-1', template_category: 'UTILITY', msg_rate: 0.35, duration_ms: 420,
    });
    expect(await whatsappAdminService.logById(String(row._id))).toMatchObject({
      recipient_user_id: String(recipient), destination: '919000000000', reason: 'boom', params: ['Meera'], media_url: 'https://i/x.png',
      submitted_message_id: 'mid-1', template_category: 'UTILITY', msg_rate: 0.35, duration_ms: 420,
    });
  });

  it('answers null for an id that is malformed or names no row', async () => {
    await expect(whatsappAdminService.logById('not-an-id')).resolves.toBeNull();
    await expect(whatsappAdminService.logById(String(new Types.ObjectId()))).resolves.toBeNull();
  });
});
