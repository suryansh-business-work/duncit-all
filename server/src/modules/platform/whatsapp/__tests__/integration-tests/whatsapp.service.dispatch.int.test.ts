/**
 * whatsappService.send — past the gates: the claim, the POST, and the two
 * recoveries (a missing header asset, a campaign nobody created yet), against a
 * real database.
 *
 * What is asserted is what an operator reads afterwards: the outcome, the ONE
 * log row and what it froze (status, reason, media, rate, holds_slot), the
 * header kind the row learned, and exactly what was POSTed to AiSensy. AiSensy
 * (both credentials) and the E2E mute switch are faked.
 */
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
import { sendCampaign } from '@modules/platform/aisensy/aisensy.gateway';
import {
  createCampaign,
  isProjectApiConfigured,
  listCampaigns,
  listTemplates,
} from '@modules/platform/aisensy/aisensy.project';
import { communicationsMuted } from '@modules/platform/e2eRun/e2eRun.mute';
import { whatsappService } from '../../whatsapp.service';
import { WaEventSettingModel, WA_GLOBAL_KEY } from '../../waEventSetting.model';
import { WaMessageLogModel } from '../../waMessageLog.model';

const send = sendCampaign as jest.Mock;
const muted = communicationsMuted as jest.Mock;
const projectApi = isProjectApiConfigured as jest.Mock;
const campaigns = listCampaigns as jest.Mock;
const templates = listTemplates as jest.Mock;
const provision = createCampaign as jest.Mock;
const log = logs.server as unknown as Record<'debug' | 'info' | 'warn' | 'error', jest.Mock>;

const DEST = '919000000000';
const DEFAULT_IMAGE = { url: 'https://cdn.example.com/wa/default.jpg', filename: 'default.jpg' };
const MEDIA_MISSING = new Error('AiSensy error: Media URL Missing (HTTP 400)');
const CAMPAIGN_MISSING = new Error('AiSensy error: Campaign does not exist. (HTTP 400)');

const globalOn = (over: Record<string, unknown> = {}) =>
  WaEventSettingModel.create({ event_key: WA_GLOBAL_KEY, enabled: true, ...over });

const synced = (eventKey: string, over: Record<string, unknown> = {}) =>
  WaEventSettingModel.create({
    event_key: eventKey,
    media_synced_at: new Date('2026-01-01T00:00:00.000Z'),
    template_header_format: '',
    ...over,
  });

const welcome = (over: Record<string, unknown> = {}) => ({
  event: 'USER_WELCOME',
  entityId: 'account-1',
  destination: DEST,
  name: 'Meera',
  params: ['Meera'],
  ...over,
});

const rejection = {
  event: 'HOST_ONBOARDING_REJECTED',
  destination: DEST,
  name: 'Meera',
  params: ['Meera', 'The plan did not cover group size'],
};

const onlyRow = async () => {
  const rows = await WaMessageLogModel.find().lean();
  expect(rows).toHaveLength(1);
  return rows[0];
};

const settingFor = (eventKey: string) => WaEventSettingModel.findOne({ event_key: eventKey }).lean();

beforeAll(async () => {
  await WaMessageLogModel.init();
});

beforeEach(() => {
  send.mockReset().mockResolvedValue('msg-1');
  muted.mockReset().mockResolvedValue(false);
  projectApi.mockReset().mockResolvedValue(false);
  campaigns.mockReset().mockResolvedValue([]);
  templates.mockReset().mockResolvedValue([]);
  provision.mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('a clean send', () => {
  it('posts the registry’s campaign and freezes what went out on the row', async () => {
    await globalOn();
    await synced('USER_WELCOME', { template_category: 'MARKETING' });

    const outcome = await whatsappService.send(welcome());

    expect(outcome).toEqual({ status: 'SENT', reason: '', message_id: 'msg-1' });
    expect(send).toHaveBeenCalledWith({
      campaign_name: 'welcome_to_duncit',
      destination: DEST,
      user_name: 'Meera',
      template_params: ['Meera'],
      media: undefined,
    });
    const row = await onlyRow();
    expect(row).toMatchObject({
      status: 'SENT',
      submitted_message_id: 'msg-1',
      holds_slot: true,
      template_category: 'MARKETING',
      // The default rate card's marketing price, frozen at send time.
      msg_rate: 1.09,
      media_url: '',
      user_name: 'Meera',
    });
  });

  it('prices an uncategorised template as UTILITY and files the contact as "there" with no name', async () => {
    await globalOn();
    await synced('USER_WELCOME');

    await whatsappService.send(welcome({ name: '  ' }));

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ user_name: 'there' }));
    expect(await onlyRow()).toMatchObject({ msg_rate: 0.145, user_name: 'there' });
  });

  it('refuses a second send of the same event about the same thing to the same number', async () => {
    await globalOn();
    await synced('USER_WELCOME');

    await whatsappService.send(welcome());
    const again = await whatsappService.send(welcome());

    expect(again).toEqual({ status: 'SKIPPED', reason: 'Already sent', message_id: '' });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('fails without sending when the claim cannot be written', async () => {
    await globalOn();
    await synced('USER_WELCOME');
    jest.spyOn(WaMessageLogModel, 'create').mockRejectedValue(new Error('disk full') as never);

    const outcome = await whatsappService.send(welcome());

    expect(outcome).toEqual({ status: 'FAILED', reason: 'Could not record the message', message_id: '' });
    expect(send).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith('whatsapp', 'claim', expect.objectContaining({ event: 'USER_WELCOME' }));
  });

  it('reports SENT even if stamping the row afterwards fails', async () => {
    await globalOn();
    await synced('USER_WELCOME');
    jest.spyOn(WaMessageLogModel, 'updateOne').mockRejectedValue(new Error('write conflict') as never);

    const outcome = await whatsappService.send(welcome());

    expect(outcome.status).toBe('SENT');
    expect(log.warn).toHaveBeenCalledWith('whatsapp', 'record', expect.objectContaining({ event: 'USER_WELCOME' }));
  });
});

describe('a rejected send', () => {
  beforeEach(async () => {
    await globalOn();
    await synced('USER_WELCOME');
  });

  it('records AiSensy’s own reason and gives the slot back', async () => {
    send.mockRejectedValue(new Error('AiSensy error: Invalid template (HTTP 400)'));

    const outcome = await whatsappService.send(welcome());

    expect(outcome).toEqual({
      status: 'FAILED',
      reason: 'AiSensy error: Invalid template (HTTP 400)',
      message_id: '',
    });
    expect(await onlyRow()).toMatchObject({ status: 'FAILED', holds_slot: false });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('can be sent again once AiSensy is back, because a failure holds no slot', async () => {
    send.mockRejectedValueOnce(new Error('AiSensy error: Server busy (HTTP 503)'));

    await whatsappService.send(welcome());
    const retry = await whatsappService.send(welcome());

    expect(retry.status).toBe('SENT');
    const statuses = (await WaMessageLogModel.find().lean()).map((row) => row.status).sort((a, b) => a.localeCompare(b));
    expect(statuses).toEqual(['FAILED', 'SENT']);
  });

  it('describes a non-Error rejection in a sentence', async () => {
    send.mockRejectedValue('socket hang up');

    const outcome = await whatsappService.send(welcome());

    expect(outcome.reason).toBe('AiSensy rejected the message');
  });
});

describe('header media', () => {
  it('sends this send’s own asset for the header kind the row has learned', async () => {
    await globalOn({ override_media_url: DEFAULT_IMAGE.url, override_media_filename: DEFAULT_IMAGE.filename });
    await synced('USER_WELCOME', { template_header_format: 'FILE' });
    const ticket = { url: 'https://cdn.example.com/tickets/t-1.pdf', filename: 't-1.pdf' };

    await whatsappService.send(welcome({ assets: { DOCUMENT: ticket, IMAGE: DEFAULT_IMAGE } }));

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ media: ticket }));
    expect(await onlyRow()).toMatchObject({ media_url: ticket.url, media_filename: 't-1.pdf' });
  });

  it('prefers the admin override to the campaign cache, filename and all', async () => {
    await globalOn();
    await synced('USER_WELCOME', {
      template_header_format: 'IMAGE',
      media_url: 'https://cdn.example.com/cached.jpg',
      media_filename: 'cached.jpg',
      override_media_url: 'https://cdn.example.com/override.jpg',
      override_media_filename: 'chosen.jpg',
    });

    await whatsappService.send(welcome());

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ media: { url: 'https://cdn.example.com/override.jpg', filename: 'chosen.jpg' } })
    );
  });

  it('falls back to the platform default for an IMAGE header with nothing of its own', async () => {
    await globalOn({ override_media_url: DEFAULT_IMAGE.url, override_media_filename: DEFAULT_IMAGE.filename });
    await synced('USER_WELCOME', { template_header_format: 'IMAGE' });

    await whatsappService.send(welcome());

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ media: DEFAULT_IMAGE }));
  });

  it('passes an explicit asset through untouched and never reads the catalogue for it', async () => {
    await globalOn();
    projectApi.mockResolvedValue(true);
    const explicit = { url: 'https://cdn.example.com/explicit.png', filename: 'explicit.png' };

    await whatsappService.send(welcome({ media: explicit }));

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ media: explicit }));
    expect(campaigns).not.toHaveBeenCalled();
  });
});

describe('binding an unsynced scenario off AiSensy', () => {
  beforeEach(async () => {
    await globalOn();
  });

  it('reads the campaign’s asset and header kind once, sends with it, and stamps the row', async () => {
    projectApi.mockResolvedValue(true);
    campaigns.mockResolvedValue([
      {
        name: 'welcome_to_duncit',
        template_name: 'welcome_v2',
        media_url: 'https://cdn.example.com/welcome.jpg',
        media_filename: 'welcome.jpg',
      },
    ]);
    templates.mockResolvedValue([{ name: 'welcome_v2', header_format: 'IMAGE' }]);

    await whatsappService.send(welcome());

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ media: { url: 'https://cdn.example.com/welcome.jpg', filename: 'welcome.jpg' } })
    );
    const row = await settingFor('USER_WELCOME');
    expect(row).toMatchObject({
      media_url: 'https://cdn.example.com/welcome.jpg',
      template_header_format: 'IMAGE',
    });
    expect(row?.media_synced_at).toBeInstanceOf(Date);
  });

  it('stamps a text campaign as synced with no asset, so it never pays for the read again', async () => {
    projectApi.mockResolvedValue(true);
    campaigns.mockResolvedValue([{ name: 'other_campaign', template_name: 'x' }]);

    await whatsappService.send(welcome());
    await whatsappService.send(welcome({ entityId: 'account-2' }));

    expect(campaigns).toHaveBeenCalledTimes(1);
    expect(await settingFor('USER_WELCOME')).toMatchObject({ media_url: '', template_header_format: '' });
  });

  it('skips the read entirely without a Project API', async () => {
    await whatsappService.send(welcome());

    expect(campaigns).not.toHaveBeenCalled();
    expect(await settingFor('USER_WELCOME')).toBeNull();
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ media: undefined }));
  });

  it('sends anyway, and writes no stamp, when the catalogue cannot be read', async () => {
    projectApi.mockResolvedValue(true);
    campaigns.mockRejectedValue(new Error('AiSensy Project API: HTTP 502'));

    const outcome = await whatsappService.send(welcome());

    expect(outcome.status).toBe('SENT');
    expect(await settingFor('USER_WELCOME')).toBeNull();
    expect(log.debug).toHaveBeenCalledWith('whatsapp', 'bindMedia', expect.objectContaining({ event: 'USER_WELCOME' }));
  });
});

describe('recovering from "Media URL Missing"', () => {
  it('retries once with the default image and remembers the header is an IMAGE', async () => {
    await globalOn({ override_media_url: DEFAULT_IMAGE.url, override_media_filename: DEFAULT_IMAGE.filename });
    await synced('USER_WELCOME');
    send.mockRejectedValueOnce(MEDIA_MISSING).mockResolvedValueOnce('msg-2');

    const outcome = await whatsappService.send(welcome());

    expect(outcome).toEqual({ status: 'SENT', reason: '', message_id: 'msg-2' });
    expect(send).toHaveBeenNthCalledWith(1, expect.objectContaining({ media: undefined }));
    expect(send).toHaveBeenNthCalledWith(2, expect.objectContaining({ media: DEFAULT_IMAGE }));
    expect((await settingFor('USER_WELCOME'))?.template_header_format).toBe('IMAGE');
    expect(await onlyRow()).toMatchObject({ status: 'SENT', media_url: DEFAULT_IMAGE.url });
  });

  it('offers the default DOCUMENT as a FILE header when that is the only default set', async () => {
    const doc = { url: 'https://cdn.example.com/wa/terms.pdf', filename: 'terms.pdf' };
    await globalOn({ default_document_url: doc.url, default_document_filename: doc.filename });
    await synced('USER_WELCOME');
    send.mockRejectedValueOnce(MEDIA_MISSING).mockResolvedValueOnce('msg-2');

    await whatsappService.send(welcome());

    expect(send).toHaveBeenNthCalledWith(2, expect.objectContaining({ media: doc }));
    expect((await settingFor('USER_WELCOME'))?.template_header_format).toBe('FILE');
  });

  it('answers a learned header kind exactly rather than guessing an image', async () => {
    const doc = { url: 'https://cdn.example.com/wa/terms.pdf', filename: 'terms.pdf' };
    await globalOn({
      override_media_url: DEFAULT_IMAGE.url,
      default_document_url: doc.url,
      default_document_filename: doc.filename,
    });
    // Both defaults are set, yet the row has learned its template wants a VIDEO:
    // an unlearned header would be retried with the image, a learned one is not.
    await synced('USER_WELCOME', { template_header_format: 'VIDEO' });
    send.mockRejectedValue(MEDIA_MISSING);

    const outcome = await whatsappService.send(welcome());

    // A video header has no platform default: nothing to retry with, and the
    // reason names the screen that can fix it.
    expect(send).toHaveBeenCalledTimes(1);
    expect(outcome.reason).toBe(
      'This campaign needs its own header video — set media on this scenario under Marketing > WhatsApp > Automation'
    );
  });

  it('names the Settings screen when no default exists for the header at all', async () => {
    await globalOn();
    await synced('USER_WELCOME');
    send.mockRejectedValue(MEDIA_MISSING);

    const outcome = await whatsappService.send(welcome());

    expect(send).toHaveBeenCalledTimes(1);
    expect(outcome.reason).toBe(
      'This campaign needs a header image and no default is set — add one under Marketing > WhatsApp > Settings'
    );
    expect((await settingFor('USER_WELCOME'))?.template_header_format).toBe('');
  });

  it('does not override an asset that was sent and still rejected — that is a bad URL', async () => {
    await globalOn({ override_media_url: DEFAULT_IMAGE.url, override_media_filename: DEFAULT_IMAGE.filename });
    await synced('USER_WELCOME', { template_header_format: 'IMAGE' });
    send.mockRejectedValue(MEDIA_MISSING);

    const outcome = await whatsappService.send(welcome());

    expect(send).toHaveBeenCalledTimes(1);
    expect(outcome.reason).toBe(MEDIA_MISSING.message);
  });

  it('records the retry’s own failure when the default is rejected too', async () => {
    await globalOn({ override_media_url: DEFAULT_IMAGE.url, override_media_filename: DEFAULT_IMAGE.filename });
    await synced('USER_WELCOME');
    send
      .mockRejectedValueOnce(MEDIA_MISSING)
      .mockRejectedValueOnce(new Error('AiSensy error: Media URL is not accessible (HTTP 400)'));

    const outcome = await whatsappService.send(welcome());

    expect(outcome.reason).toBe('AiSensy error: Media URL is not accessible (HTTP 400)');
    // Nothing was proven, so nothing is learned.
    expect((await settingFor('USER_WELCOME'))?.template_header_format).toBe('');
    expect(await onlyRow()).toMatchObject({ status: 'FAILED', media_url: DEFAULT_IMAGE.url });
  });
});

describe('a campaign nobody created yet', () => {
  it('names the screen that provisions it, for a scenario with no draft to provision', async () => {
    await globalOn();
    await synced('USER_WELCOME');
    projectApi.mockResolvedValue(true);
    send.mockRejectedValue(CAMPAIGN_MISSING);

    const outcome = await whatsappService.send(welcome());

    expect(outcome.reason).toBe(
      'No AiSensy campaign named "welcome_to_duncit" — provision it under Marketing > WhatsApp > Automation'
    );
    expect(provision).not.toHaveBeenCalled();
  });

  it('creates the campaign for an APPROVED drafted template and sends again', async () => {
    await globalOn();
    await synced('HOST_ONBOARDING_REJECTED');
    projectApi.mockResolvedValue(true);
    templates.mockResolvedValue([{ name: 'host_onboarding_rejection', status: 'APPROVED' }]);
    provision.mockResolvedValue({ name: 'host_onboarding_rejection', status: 'LIVE' });
    send.mockRejectedValueOnce(CAMPAIGN_MISSING).mockResolvedValueOnce('msg-2');

    const outcome = await whatsappService.send(rejection);

    expect(provision).toHaveBeenCalledWith('host_onboarding_rejection', 'host_onboarding_rejection');
    expect(outcome).toEqual({ status: 'SENT', reason: '', message_id: 'msg-2' });
    expect(log.info).toHaveBeenCalledWith(
      'whatsapp',
      'provision',
      expect.objectContaining({ event_key: 'HOST_ONBOARDING_REJECTED', campaign: 'host_onboarding_rejection' })
    );
  });

  it('leaves a template Meta has not approved alone', async () => {
    await globalOn();
    await synced('HOST_ONBOARDING_REJECTED');
    projectApi.mockResolvedValue(true);
    templates.mockResolvedValue([{ name: 'host_onboarding_rejection', status: 'PENDING' }]);
    send.mockRejectedValue(CAMPAIGN_MISSING);

    const outcome = await whatsappService.send(rejection);

    expect(provision).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
    expect(outcome.status).toBe('FAILED');
  });

  it('keeps the original reason when the Project API is not configured', async () => {
    await globalOn();
    await synced('HOST_ONBOARDING_REJECTED');
    send.mockRejectedValue(CAMPAIGN_MISSING);

    const outcome = await whatsappService.send(rejection);

    expect(templates).not.toHaveBeenCalled();
    expect(outcome.reason).toContain('No AiSensy campaign named "host_onboarding_rejection"');
  });

  it('keeps the original reason, and logs, when provisioning itself fails', async () => {
    await globalOn();
    await synced('HOST_ONBOARDING_REJECTED');
    projectApi.mockResolvedValue(true);
    templates.mockRejectedValue(new Error('AiSensy Project API: HTTP 500'));
    send.mockRejectedValue(CAMPAIGN_MISSING);

    const outcome = await whatsappService.send(rejection);

    expect(outcome.status).toBe('FAILED');
    expect(log.warn).toHaveBeenCalledWith(
      'whatsapp',
      'provision',
      expect.objectContaining({ event: 'HOST_ONBOARDING_REJECTED' })
    );
  });
});
