/**
 * whatsappAdminService — the Marketing > WhatsApp Automation board, against a
 * real database.
 *
 * The board joins the code registry with what AiSensy holds right now, so the
 * assertions are about that join: which scenarios it says cannot send and why,
 * which provisioning press it offers, and what each write leaves on the
 * settings rows (the kill switch, the cutoff stamp, the admin-owned override
 * pair vs the reconcile-owned cache). The AiSensy Project API is faked;
 * templates and campaigns themselves are managed through the Communications
 * Portal, and nothing here changes that.
 */
import { Types } from 'mongoose';

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

import { logs } from '@observability/log';
import {
  createCampaign,
  createTemplate,
  isProjectApiConfigured,
  listCampaigns,
  listTemplates,
} from '@modules/platform/aisensy/aisensy.project';
import { whatsappAdminService } from '../../whatsapp.admin';
import { WA_EVENTS } from '../../whatsapp.events';
import { WA_TEMPLATE_DRAFTS } from '../../whatsapp.drafts';
import { WaEventSettingModel, WA_GLOBAL_KEY } from '../../waEventSetting.model';
import { WaMessageLogModel } from '../../waMessageLog.model';

const projectApi = isProjectApiConfigured as jest.Mock;
const campaigns = listCampaigns as jest.Mock;
const templates = listTemplates as jest.Mock;
const submitTemplate = createTemplate as jest.Mock;
const bindCampaign = createCampaign as jest.Mock;
const warn = logs.server.warn as jest.Mock;

const ACTOR = '64b0000000000000000000aa';

type Board = Awaited<ReturnType<typeof whatsappAdminService.scenarios>>;
const rowFor = (board: Board, key: string) => {
  const row = board.rows.find((entry) => entry.event_key === key);
  if (!row) throw new Error(`no row for ${key}`);
  return row;
};

const campaign = (over: Record<string, unknown> = {}) => ({
  name: 'welcome_to_duncit',
  status: 'LIVE',
  template_name: 'welcome_tpl',
  type: 'API',
  media_url: '',
  media_filename: '',
  ...over,
});

const template = (over: Record<string, unknown> = {}) => ({
  id: 'tpl-1',
  name: 'welcome_tpl',
  status: 'APPROVED',
  category: 'UTILITY',
  language: 'en',
  body: 'Hi {{1}}',
  param_count: 1,
  header: '',
  header_format: '',
  needs_media: false,
  footer: '',
  buttons: [],
  cta_buttons: [],
  ...over,
});

/** A readable catalogue holding exactly these rows. */
const catalogue = (campaignRows: unknown[], templateRows: unknown[]) => {
  projectApi.mockResolvedValue(true);
  campaigns.mockResolvedValue(campaignRows);
  templates.mockResolvedValue(templateRows);
};

const globalRow = () => WaEventSettingModel.findOne({ event_key: WA_GLOBAL_KEY }).lean();
const settingFor = (key: string) => WaEventSettingModel.findOne({ event_key: key }).lean();

beforeEach(() => {
  projectApi.mockReset().mockResolvedValue(false);
  campaigns.mockReset().mockResolvedValue([]);
  templates.mockReset().mockResolvedValue([]);
  submitTemplate.mockReset();
  bindCampaign.mockReset();
});

describe('scenarios — reading the catalogue', () => {
  it('still renders every registry row, unblocked, when the Project API is not configured', async () => {
    const board = await whatsappAdminService.scenarios();

    expect(board.catalogue_ok).toBe(false);
    expect(board.catalogue_error).toBe('AiSensy Project API is not configured in the Tech portal');
    expect(board.rows).toHaveLength(WA_EVENTS.length);
    expect(board.rows.every((row) => row.blocker === '' && row.provision_step === '')).toBe(true);
    // No global row: nobody has turned automatic WhatsApp on.
    expect(board.global_enabled).toBe(false);
    expect(campaigns).not.toHaveBeenCalled();
  });

  it('marks the row switches: absent means ON, and only optional categories can be disabled', async () => {
    await WaEventSettingModel.create({ event_key: 'USER_CONTACT_INVITE', enabled: false });

    const board = await whatsappAdminService.scenarios();

    expect(rowFor(board, 'USER_WELCOME')).toMatchObject({ enabled: true, can_disable: false });
    expect(rowFor(board, 'USER_CONTACT_INVITE')).toMatchObject({ enabled: false, can_disable: true });
  });

  it('refuses an answer with no campaigns and no templates as an unreadable payload', async () => {
    catalogue([], []);

    const board = await whatsappAdminService.scenarios();

    expect(board.catalogue_ok).toBe(false);
    expect(board.catalogue_error).toBe('AiSensy returned no campaigns and no templates');
  });

  it('reports a failed read in AiSensy’s words and logs it', async () => {
    projectApi.mockResolvedValue(true);
    campaigns.mockRejectedValue(new Error('AiSensy Project API: HTTP 401'));

    const board = await whatsappAdminService.scenarios();

    expect(board.catalogue_error).toBe('AiSensy Project API: HTTP 401');
    expect(warn).toHaveBeenCalledWith('whatsapp', 'catalogue', expect.any(Object));
  });

  it('falls back to a generic sentence for a non-Error failure', async () => {
    projectApi.mockResolvedValue(true);
    templates.mockRejectedValue('boom');

    const board = await whatsappAdminService.scenarios();

    expect(board.catalogue_error).toBe('AiSensy read failed');
  });

  it('uses the row’s own learned header kind when AiSensy cannot be read', async () => {
    await WaEventSettingModel.create({ event_key: 'USER_WELCOME', template_header_format: 'IMAGE' });

    const row = rowFor(await whatsappAdminService.scenarios(), 'USER_WELCOME');

    expect(row).toMatchObject({ template_header_format: 'IMAGE', needs_media: true, blocker: '' });
  });

  it('joins the live campaign and template onto the row', async () => {
    catalogue([campaign({ media_url: 'https://cdn.example.com/w.jpg' })], [template()]);

    const row = rowFor(await whatsappAdminService.scenarios(), 'USER_WELCOME');

    expect(row).toMatchObject({
      campaign_status: 'LIVE',
      template_name: 'welcome_tpl',
      template_status: 'APPROVED',
      template_category: 'UTILITY',
      template_params: 1,
      media_url: 'https://cdn.example.com/w.jpg',
      needs_media: false,
      blocker: '',
    });
  });
});

describe('scenarios — why a row cannot send', () => {
  const blockerWith = async (campaignRows: unknown[], templateRows: unknown[]) => {
    // A second, unrelated campaign keeps the catalogue "readable" even when the
    // welcome campaign itself is the thing that is missing.
    catalogue([...campaignRows, campaign({ name: 'unrelated' })], templateRows);
    return rowFor(await whatsappAdminService.scenarios(), 'USER_WELCOME').blocker;
  };

  it.each([
    ['no campaign', [], [], 'No AiSensy campaign named "welcome_to_duncit"'],
    ['a stopped campaign', [campaign({ status: 'STOPPED' })], [template()], 'Campaign is STOPPED'],
    [
      'a deleted template',
      [campaign()],
      [],
      'Campaign points at a template that no longer exists (welcome_tpl)',
    ],
    ['an unapproved template', [campaign()], [template({ status: 'REJECTED' })], 'Template is REJECTED'],
    [
      'a template that takes another number of values',
      [campaign()],
      [template({ param_count: 2 })],
      'Template takes 2 value(s), the code sends 1',
    ],
    [
      'an image header with no asset anywhere',
      [campaign()],
      [template({ header_format: 'IMAGE', needs_media: true })],
      'Template needs a header image — set the default under Settings, or set media on this row',
    ],
    [
      'a video header, which no default covers',
      [campaign()],
      [template({ header_format: 'VIDEO', needs_media: true })],
      'Template needs its own header video — set media on this row',
    ],
  ])('blocks %s', async (_label, campaignRows, templateRows, expected) => {
    expect(await blockerWith(campaignRows, templateRows)).toBe(expected);
  });

  it('treats a campaign with no status as live', async () => {
    expect(await blockerWith([campaign({ status: '' })], [template()])).toBe('');
  });

  it('clears a media header the platform default covers', async () => {
    await whatsappAdminService.setDefaultMedia('IMAGE', 'https://cdn.example.com/d.jpg', 'd.jpg');

    const blocker = await blockerWith([campaign()], [template({ header_format: 'IMAGE', needs_media: true })]);

    expect(blocker).toBe('');
  });

  it('clears a media header the row’s cache or override already covers', async () => {
    await WaEventSettingModel.create({
      event_key: 'USER_WELCOME',
      override_media_url: 'https://cdn.example.com/own.jpg',
    });

    const blocker = await blockerWith([campaign()], [template({ header_format: 'IMAGE', needs_media: true })]);

    expect(blocker).toBe('');
  });
});

describe('scenarios — the provisioning step', () => {
  const stepWith = async (templateRows: unknown[]) => {
    catalogue([campaign()], [template(), ...templateRows]);
    return rowFor(await whatsappAdminService.scenarios(), 'HOST_ONBOARDING_REJECTED').provision_step;
  };

  it('offers TEMPLATE when the drafted template has never been submitted', async () => {
    expect(await stepWith([])).toBe('TEMPLATE');
  });

  it('offers CAMPAIGN once Meta has approved the drafted template', async () => {
    expect(await stepWith([template({ name: 'host_onboarding_rejection', param_count: 2 })])).toBe('CAMPAIGN');
  });

  it('offers nothing while the template waits on Meta', async () => {
    expect(await stepWith([template({ name: 'host_onboarding_rejection', status: 'PENDING' })])).toBe('');
  });

  it('offers nothing for a scenario without a draft', async () => {
    catalogue([campaign({ name: 'unrelated' })], [template()]);

    const row = rowFor(await whatsappAdminService.scenarios(), 'USER_WELCOME');

    expect(row.provision_step).toBe('');
  });
});

describe('default media', () => {
  it('reads blanks before anything is set', async () => {
    await expect(whatsappAdminService.defaultMedia()).resolves.toEqual({
      url: '',
      filename: '',
      document_url: '',
      document_filename: '',
    });
  });

  it('stores the IMAGE default on the global row without switching WhatsApp on', async () => {
    const board = await whatsappAdminService.setDefaultMedia(
      'IMAGE',
      '  https://cdn.example.com/d.jpg ',
      ' d.jpg ',
      ACTOR
    );

    expect(board).toMatchObject({
      default_media_url: 'https://cdn.example.com/d.jpg',
      default_media_filename: 'd.jpg',
      global_enabled: false,
    });
    const row = await globalRow();
    expect(row?.enabled).toBe(false);
    expect(String(row?.updated_by)).toBe(ACTOR);
  });

  it('stores the DOCUMENT default in its own pair, and reads both back', async () => {
    await whatsappAdminService.setDefaultMedia('IMAGE', 'https://cdn.example.com/d.jpg', 'd.jpg');
    await whatsappAdminService.setDefaultMedia('DOCUMENT', 'https://cdn.example.com/t.pdf', 't.pdf');

    await expect(whatsappAdminService.defaultMedia()).resolves.toEqual({
      url: 'https://cdn.example.com/d.jpg',
      filename: 'd.jpg',
      document_url: 'https://cdn.example.com/t.pdf',
      document_filename: 't.pdf',
    });
  });

  it('clears the filename with the url', async () => {
    await whatsappAdminService.setDefaultMedia('DOCUMENT', 'https://cdn.example.com/t.pdf', 't.pdf');
    await whatsappAdminService.setDefaultMedia('DOCUMENT', '', 'left-behind.pdf');

    const row = await globalRow();
    expect(row).toMatchObject({ default_document_url: '', default_document_filename: '' });
    expect(row?.updated_by).toBeNull();
  });

  it('refuses a link AiSensy could not fetch, and writes nothing', async () => {
    await expect(
      whatsappAdminService.setDefaultMedia('IMAGE', 'ftp://cdn.example.com/d.jpg', 'd.jpg')
    ).rejects.toMatchObject({
      message: 'Media URL must be a full public link that starts with http:// or https://',
      extensions: { code: 'BAD_REQUEST' },
    });
    expect(await globalRow()).toBeNull();
  });
});

describe('setMedia', () => {
  it('writes only the admin override pair on a scenario row, which reads as ON', async () => {
    await WaEventSettingModel.create({
      event_key: 'USER_WELCOME',
      media_url: 'https://cdn.example.com/cached.jpg',
    });

    await whatsappAdminService.setMedia('USER_WELCOME', 'https://cdn.example.com/own.jpg', 'own.jpg', ACTOR);
    await whatsappAdminService.setMedia('USER_CONTACT_INVITE', 'https://cdn.example.com/i.jpg', 'i.jpg');

    expect(await settingFor('USER_WELCOME')).toMatchObject({
      media_url: 'https://cdn.example.com/cached.jpg',
      override_media_url: 'https://cdn.example.com/own.jpg',
      override_media_filename: 'own.jpg',
    });
    expect((await settingFor('USER_CONTACT_INVITE'))?.enabled).toBe(true);
  });

  it('hands the global key to the IMAGE default', async () => {
    const board = await whatsappAdminService.setMedia(WA_GLOBAL_KEY, 'https://cdn.example.com/d.jpg', 'd.jpg');

    expect(board.default_media_url).toBe('https://cdn.example.com/d.jpg');
    expect((await globalRow())?.enabled).toBe(false);
  });

  it('refuses a relative link', async () => {
    await expect(whatsappAdminService.setMedia('USER_WELCOME', '/uploads/x.jpg', 'x.jpg')).rejects.toMatchObject({
      extensions: { code: 'BAD_REQUEST' },
    });
    expect(await settingFor('USER_WELCOME')).toBeNull();
  });
});

describe('setEnabled and the sweep cutoff', () => {
  it('stamps enabled_at when the global switch goes on for the first time', async () => {
    const board = await whatsappAdminService.setEnabled(WA_GLOBAL_KEY, true, ACTOR);

    expect(board.global_enabled).toBe(true);
    const row = await globalRow();
    expect(row?.enabled_at).toBeInstanceOf(Date);
    expect(String(row?.updated_by)).toBe(ACTOR);
  });

  it('does not move the cutoff when "on" is saved again', async () => {
    await whatsappAdminService.setEnabled(WA_GLOBAL_KEY, true);
    const first = (await globalRow())?.enabled_at;

    await whatsappAdminService.setEnabled(WA_GLOBAL_KEY, true);

    expect((await globalRow())?.enabled_at?.getTime()).toBe(first?.getTime());
  });

  it('moves the cutoff forward after a pause, so the pause is a gap and not a backlog', async () => {
    const stale = new Date('2026-01-01T00:00:00.000Z');
    await WaEventSettingModel.create({ event_key: WA_GLOBAL_KEY, enabled: false, enabled_at: stale });

    await whatsappAdminService.setEnabled(WA_GLOBAL_KEY, true);

    expect((await globalRow())?.enabled_at?.getTime()).toBeGreaterThan(stale.getTime());
  });

  it('turns a scenario off without touching any cutoff', async () => {
    const board = await whatsappAdminService.setEnabled('USER_CONTACT_INVITE', false);

    expect(rowFor(board, 'USER_CONTACT_INVITE').enabled).toBe(false);
    expect((await settingFor('USER_CONTACT_INVITE'))?.enabled_at).toBeNull();
  });
});

describe('seedGlobalEnabledAt', () => {
  it('pins a switched-on legacy row’s cutoff to its updated_at, once', async () => {
    await WaEventSettingModel.create({ event_key: WA_GLOBAL_KEY, enabled: true });
    const before = await globalRow();

    await expect(whatsappAdminService.seedGlobalEnabledAt()).resolves.toEqual({ pinned: 1 });
    await expect(whatsappAdminService.seedGlobalEnabledAt()).resolves.toEqual({ pinned: 0 });

    const after = await globalRow();
    expect(after?.enabled_at?.getTime()).toBe(before?.updated_at.getTime());
    // The copy must not itself move updated_at.
    expect(after?.updated_at.getTime()).toBe(before?.updated_at.getTime());
  });

  it('leaves a switched-off row and a fresh database alone', async () => {
    await expect(whatsappAdminService.seedGlobalEnabledAt()).resolves.toEqual({ pinned: 0 });

    await WaEventSettingModel.create({ event_key: WA_GLOBAL_KEY, enabled: false });
    await expect(whatsappAdminService.seedGlobalEnabledAt()).resolves.toEqual({ pinned: 0 });
    expect((await globalRow())?.enabled_at).toBeNull();
  });
});

describe('provision', () => {
  it('refuses a scenario with no draft, and an unknown key', async () => {
    await expect(whatsappAdminService.provision('USER_WELCOME')).rejects.toThrow(
      'This scenario has no template draft to provision'
    );
    await expect(whatsappAdminService.provision('NOT_A_SCENARIO')).rejects.toThrow(
      'This scenario has no template draft to provision'
    );
  });

  it('refuses while the catalogue cannot be read, in the catalogue’s words', async () => {
    await expect(whatsappAdminService.provision('HOST_ONBOARDING_REJECTED')).rejects.toMatchObject({
      message: 'AiSensy Project API is not configured in the Tech portal',
      extensions: { code: 'BAD_REQUEST' },
    });
  });

  it('refuses a scenario whose campaign already exists', async () => {
    catalogue([campaign({ name: 'host_onboarding_rejection' })], [template()]);

    await expect(whatsappAdminService.provision('HOST_ONBOARDING_REJECTED')).rejects.toThrow(
      'Campaign "host_onboarding_rejection" already exists at AiSensy'
    );
    expect(submitTemplate).not.toHaveBeenCalled();
  });

  it('submits the drafted template when there is none yet', async () => {
    catalogue([campaign()], [template()]);
    submitTemplate.mockResolvedValue({ name: 'host_onboarding_rejection', status: 'PENDING', reason: '' });
    const draft = WA_TEMPLATE_DRAFTS.HOST_ONBOARDING_REJECTED;

    const board = await whatsappAdminService.provision('HOST_ONBOARDING_REJECTED', ACTOR);

    expect(submitTemplate).toHaveBeenCalledWith({
      name: 'host_onboarding_rejection',
      category: draft.category,
      language: draft.language,
      type: 'TEXT',
      body: draft.body,
      sample: draft.sample,
    });
    expect(bindCampaign).not.toHaveBeenCalled();
    expect(board.rows).toHaveLength(WA_EVENTS.length);
  });

  it('refuses to bind a template Meta has not approved', async () => {
    catalogue([campaign()], [template({ name: 'host_onboarding_rejection', status: 'PENDING' })]);

    await expect(whatsappAdminService.provision('HOST_ONBOARDING_REJECTED')).rejects.toThrow(
      'Template "host_onboarding_rejection" is PENDING — Meta has not approved it yet'
    );
    expect(bindCampaign).not.toHaveBeenCalled();
  });

  it('binds the campaign to an approved template', async () => {
    catalogue([campaign()], [template({ name: 'host_onboarding_rejection', param_count: 2 })]);
    bindCampaign.mockResolvedValue({ name: 'host_onboarding_rejection', status: 'LIVE', template_name: 'x' });

    await whatsappAdminService.provision('HOST_ONBOARDING_REJECTED');

    expect(bindCampaign).toHaveBeenCalledWith('host_onboarding_rejection', 'host_onboarding_rejection');
    expect(submitTemplate).not.toHaveBeenCalled();
  });
});

describe('reconcile', () => {
  it('writes nothing while the catalogue cannot be read', async () => {
    await whatsappAdminService.reconcile();

    expect(await WaEventSettingModel.countDocuments()).toBe(0);
  });

  it('caches each campaign’s category, asset and header kind, and leaves the override alone', async () => {
    await WaEventSettingModel.create({
      event_key: 'USER_WELCOME',
      override_media_url: 'https://cdn.example.com/own.jpg',
      override_media_filename: 'own.jpg',
    });
    catalogue(
      [campaign({ media_url: 'https://cdn.example.com/c.jpg', media_filename: 'c.jpg' })],
      [template({ category: 'MARKETING', header_format: 'IMAGE', needs_media: true })]
    );

    await whatsappAdminService.reconcile(ACTOR);

    expect(await WaEventSettingModel.countDocuments({ event_key: { $ne: WA_GLOBAL_KEY } })).toBe(WA_EVENTS.length);
    const welcome = await settingFor('USER_WELCOME');
    expect(welcome).toMatchObject({
      template_category: 'MARKETING',
      media_url: 'https://cdn.example.com/c.jpg',
      media_filename: 'c.jpg',
      template_header_format: 'IMAGE',
      override_media_url: 'https://cdn.example.com/own.jpg',
      override_media_filename: 'own.jpg',
    });
    expect(welcome?.media_synced_at).toBeInstanceOf(Date);
    expect(String(welcome?.updated_by)).toBe(ACTOR);
    // A scenario with no campaign is stamped blank, not skipped.
    expect(await settingFor('USER_CONTACT_INVITE')).toMatchObject({
      template_category: '',
      media_url: '',
      template_header_format: '',
    });
  });
});

describe('logById', () => {
  it('answers null for a malformed id and for one that does not exist', async () => {
    await expect(whatsappAdminService.logById('not-an-id')).resolves.toBeNull();
    await expect(whatsappAdminService.logById(new Types.ObjectId().toString())).resolves.toBeNull();
  });

  it('returns one attempt in full', async () => {
    const recipient = new Types.ObjectId();
    const doc = await WaMessageLogModel.create({
      event_key: 'USER_WELCOME',
      campaign: 'welcome_to_duncit',
      category: 'account',
      audience: 'USER',
      entity_id: 'account-1',
      recipient_user_id: recipient,
      destination: '919000000000',
      status: 'SENT',
      params: ['Meera'],
      submitted_message_id: 'msg-1',
      template_category: 'UTILITY',
      msg_rate: 0.145,
      duration_ms: 320,
    });

    const detail = await whatsappAdminService.logById(String(doc._id));

    expect(detail).toMatchObject({
      id: String(doc._id),
      event_key: 'USER_WELCOME',
      recipient_user_id: String(recipient),
      destination: '919000000000',
      status: 'SENT',
      reason: '',
      params: ['Meera'],
      media_url: '',
      submitted_message_id: 'msg-1',
      msg_rate: 0.145,
      duration_ms: 320,
      created_at: doc.created_at.toISOString(),
    });
  });

  it('reads an account-less attempt with a null recipient', async () => {
    const doc = await WaMessageLogModel.create({ event_key: 'USER_WELCOME', status: 'SKIPPED' });

    expect((await whatsappAdminService.logById(String(doc._id)))?.recipient_user_id).toBeNull();
  });
});
