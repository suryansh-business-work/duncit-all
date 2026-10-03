jest.mock('@modules/platform/aisensy/aisensy.gateway', () => ({
  ...jest.requireActual('@modules/platform/aisensy/aisensy.gateway'),
  isAisensyConfigured: jest.fn(),
}));
jest.mock('@modules/platform/aisensy/aisensy.project', () => ({
  ...jest.requireActual('@modules/platform/aisensy/aisensy.project'),
  isProjectApiConfigured: jest.fn(),
  listCampaigns: jest.fn(),
  listTemplates: jest.fn(),
}));
jest.mock('../../waCampaign.dashboard', () => ({ waDashboard: jest.fn() }));

import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { isAisensyConfigured } from '@modules/platform/aisensy/aisensy.gateway';
import { isProjectApiConfigured, listCampaigns, listTemplates } from '@modules/platform/aisensy/aisensy.project';
import { aisensyService } from '@modules/platform/aisensy/aisensy.service';
import { WaMessageLogModel } from '@modules/platform/whatsapp/waMessageLog.model';
import { waDashboard } from '../../waCampaign.dashboard';
import { WaCampaignModel } from '../../waCampaign.model';
import { WaCampaignNameModel } from '../../waCampaignName.model';
import { WaCampaignRecipientModel } from '../../waCampaignRecipient.model';
import { waCampaignService } from '../../waCampaign.service';

/**
 * The WhatsApp console around a send: the saved campaign names, the rate card,
 * the campaign table, the reach count, test messages, scheduling and removal.
 */

const mockConfigured = jest.mocked(isAisensyConfigured);
const mockCampaigns = jest.mocked(listCampaigns);
const mockTemplates = jest.mocked(listTemplates);
const realSetTimeout = globalThis.setTimeout;
const pause = (ms: number) => new Promise((resolve) => realSetTimeout(resolve, ms));
const DAY = 86_400_000;
const MAX_TIMER_DELAY = 2_147_483_647;

const CAMPAIGN = {
  name: 'welcome_back',
  status: 'LIVE',
  template_name: 'welcome_tpl',
  type: 'API',
  media_url: 'https://ik.imagekit.io/duncit/welcome.jpg',
  media_filename: 'welcome.jpg',
};
const TEMPLATE = {
  id: 'tpl_w',
  name: 'welcome_tpl',
  status: 'APPROVED',
  category: 'UTILITY',
  language: 'en',
  body: 'Hi {{1}}',
  param_count: 1,
  header: '',
  header_format: 'IMAGE',
  needs_media: true,
  footer: '',
  buttons: ['Open'],
  cta_buttons: [{ type: 'URL', text: 'Open', url: 'https://duncit.com/{{2}}', url_param: 2 }],
};

/**
 * The scheduler arms a real setTimeout for a send days away. Those calls (and
 * only those — nothing else in the process asks for a timer of 11+ days) are
 * captured so a test can fire them on demand instead of waiting for them.
 */
function captureLongTimers() {
  const captured: { fire: () => void; ms: number }[] = [];
  jest.spyOn(globalThis, 'setTimeout').mockImplementation(((handler: () => void, ms?: number, ...args: unknown[]) => {
    if ((ms ?? 0) > 1_000_000_000) {
      captured.push({ fire: handler, ms: ms ?? 0 });
      return realSetTimeout(() => undefined, 0);
    }
    return realSetTimeout(handler, ms, ...args);
  }) as unknown as typeof setTimeout);
  return captured;
}

async function settledStatus(campaignId: string, from = 'SENDING') {
  for (let i = 0; i < 250; i++) {
    const doc = await WaCampaignModel.findOne({ campaign_id: campaignId }).lean();
    if (doc && doc.status !== from) return doc;
    await pause(20);
  }
  throw new Error(`campaign ${campaignId} stayed ${from}`);
}

const scheduledInput = (inMs: number) => ({
  name: 'Weekend nudge',
  wa_campaign_name: 'welcome_back',
  template_params: ['{{first_name}}'],
  buttons: [{ index: 0, value: 'pods' }],
  audience: 'MANUAL_NUMBERS' as const,
  contacts: [{ name: 'Ravi Kumar', extension: '91', number: '9876543210' }],
  scheduled_at: new Date(Date.now() + inMs).toISOString(),
});

beforeEach(() => {
  mockConfigured.mockResolvedValue(true);
  mockCampaigns.mockResolvedValue([CAMPAIGN]);
  mockTemplates.mockResolvedValue([TEMPLATE]);
  jest.spyOn(aisensyService, 'send').mockRejectedValue(new Error('unexpected AiSensy call'));
});

afterEach(() => jest.restoreAllMocks());

describe('waCampaignService pass-throughs', () => {
  it('reports both AiSensy credentials and the live catalogue as AiSensy has them', async () => {
    jest.mocked(isProjectApiConfigured).mockResolvedValue(false);
    expect(await waCampaignService.configured()).toBe(true);
    expect(await waCampaignService.projectConfigured()).toBe(false);
    expect(await waCampaignService.aisensyCampaigns()).toEqual([CAMPAIGN]);
    expect(await waCampaignService.aisensyTemplates()).toEqual([TEMPLATE]);
  });

  it('lists the template variables without their resolvers', () => {
    const vars = waCampaignService.variables();
    expect(vars.map((v) => v.name)).toEqual(['first_name', 'last_name', 'full_name', 'city', 'state']);
    expect(Object.keys(vars[0])).toEqual(['name', 'description']);
  });

  it('hands the dashboard its range', async () => {
    jest.mocked(waDashboard).mockResolvedValue({ total_cost: 12 } as never);
    expect(await waCampaignService.dashboard('LAST_30_DAYS' as never)).toEqual({ total_cost: 12 });
    expect(waDashboard).toHaveBeenCalledWith('LAST_30_DAYS');
  });
});

describe('waCampaignService saved campaign names', () => {
  it('adds a trimmed name with its author, lists names alphabetically and refuses a repeat', async () => {
    const author = new Types.ObjectId().toHexString();
    const created = await waCampaignService.createName({ name: '  welcome_back ', description: ' New user nudge ' }, author);
    await waCampaignService.createName({ name: 'abandoned_cart' });

    expect(created).toMatchObject({ name: 'welcome_back', description: 'New user nudge' });
    expect((await WaCampaignNameModel.findById(created.id).lean())!.created_by!.toString()).toBe(author);
    expect((await waCampaignService.names()).map((n) => n.name)).toEqual(['abandoned_cart', 'welcome_back']);
    await expect(waCampaignService.createName({ name: 'welcome_back' })).rejects.toThrow('"welcome_back" is already in the list');
    await expect(waCampaignService.createName({ name: '   ' })).rejects.toThrow('Campaign name is required');
  });

  it('removes a name, and reports one that is not there', async () => {
    const created = await waCampaignService.createName({ name: 'old_campaign' });
    expect(await waCampaignService.removeName(created.id)).toBe(true);
    await expect(waCampaignService.removeName(created.id)).rejects.toMatchObject({
      message: 'Campaign name not found',
      extensions: { code: 'NOT_FOUND' },
    });
  });
});

describe('waCampaignService rate card', () => {
  it('serves the default rates the first time it is asked', async () => {
    expect(await waCampaignService.pricing()).toEqual({
      marketing_per_msg: 1.09,
      utility_per_msg: 0.145,
      authentication_per_msg: 0,
      service_per_msg: 0,
      currency_symbol: '₹',
    });
  });

  it('saves new rates, defaulting a blank currency to ₹', async () => {
    const saved = await waCampaignService.updatePricing({
      marketing_per_msg: '0.88',
      utility_per_msg: 0.12,
      authentication_per_msg: 0,
      service_per_msg: 0.05,
      currency_symbol: '  ',
    });
    expect(saved).toEqual({
      marketing_per_msg: 0.88,
      utility_per_msg: 0.12,
      authentication_per_msg: 0,
      service_per_msg: 0.05,
      currency_symbol: '₹',
    });
    expect(await waCampaignService.pricing()).toEqual(saved);
  });

  it.each([
    [{ marketing_per_msg: -0.01 }, 'Marketing rate must be zero or more'],
    [{ utility_per_msg: 'free' }, 'Utility rate must be zero or more'],
    [{ authentication_per_msg: Number.POSITIVE_INFINITY }, 'Authentication rate must be zero or more'],
    [{ service_per_msg: undefined }, 'Service rate must be zero or more'],
  ])('refuses %p — a negative rate would turn a bill into a credit', async (bad, message) => {
    const input = { marketing_per_msg: 1, utility_per_msg: 1, authentication_per_msg: 1, service_per_msg: 1, ...bad };
    await expect(waCampaignService.updatePricing(input)).rejects.toThrow(message);
    expect((await waCampaignService.pricing()).marketing_per_msg).toBe(1.09);
  });
});

describe('waCampaignService reach and people search', () => {
  it('counts typed-in contacts WhatsApp can be given, and live accounts that carry a number', async () => {
    expect(
      await waCampaignService.reach('MANUAL_NUMBERS', {
        contacts: [
          { name: 'Ravi', extension: '91', number: '9876543210' },
          { name: 'Nope', extension: '', number: '98765' },
        ],
      })
    ).toBe(1);

    await UserModel.create({ auth: { email: 'r1@example.com', phone: { extension: '+91', number: '9811100001' } }, profile: { first_name: 'Asha' }, metadata: { status: 'ACTIVE' } });
    await UserModel.create({ auth: { email: 'r2@example.com' }, profile: { first_name: 'No Phone' }, metadata: { status: 'ACTIVE' } });
    expect(await waCampaignService.reach('ALL_USERS', {})).toBe(1);
  });

  it('finds reachable people by name, ignoring a search too short to mean anything', async () => {
    const asha = await UserModel.create({
      auth: { email: 'asha.s@example.com', phone: { extension: '+91', number: '9811100002' } },
      profile: { first_name: 'Asha', last_name: 'Singh' },
      metadata: { status: 'ACTIVE' },
    });
    expect(await waCampaignService.userSearch('  a ')).toEqual([]);
    expect(await waCampaignService.userSearch('asha')).toEqual([
      { id: String(asha._id), name: 'Asha Singh', destination: '919811100002' },
    ]);
  });
});

describe('waCampaignService.testSend', () => {
  it('sends one message with the campaign’s own asset and files it in the WhatsApp log', async () => {
    const send = jest
      .spyOn(aisensyService, 'send')
      .mockResolvedValue({ ok: true, submitted_message_id: 'msg-test-1', message: 'Campaign "welcome_back" submitted' });

    const result = await waCampaignService.testSend({
      wa_campaign_name: 'welcome_back',
      destination: '919876543210',
      user_name: 'Ravi',
      template_params: [' Ravi '],
      buttons: [{ index: 0, value: 'pods' }],
    });

    expect(result).toMatchObject({ ok: true, submitted_message_id: 'msg-test-1' });
    expect(send).toHaveBeenCalledWith({
      campaign_name: 'welcome_back',
      destination: '919876543210',
      user_name: 'Ravi',
      template_params: ['Ravi'],
      media: { url: 'https://ik.imagekit.io/duncit/welcome.jpg', filename: 'welcome.jpg' },
      buttons: [{ index: 0, value: 'pods' }],
    });
    const log = await WaMessageLogModel.findOne({ campaign: 'welcome_back' }).lean();
    expect(log).toMatchObject({
      status: 'SENT',
      destination: '919876543210',
      reason: '',
      submitted_message_id: 'msg-test-1',
      template_category: 'UTILITY',
      msg_rate: 0.145,
      params: ['Ravi'],
      media_url: 'https://ik.imagekit.io/duncit/welcome.jpg',
    });
  });

  it('files a refused test as FAILED and re-throws AiSensy’s own sentence', async () => {
    jest.spyOn(aisensyService, 'send').mockRejectedValue(new Error('Invalid Number (HTTP 400)'));

    await expect(
      waCampaignService.testSend({
        wa_campaign_name: 'welcome_back',
        destination: '910000000000',
        user_name: 'Test',
        template_params: ['x'],
        buttons: [{ index: 0, value: 'pods' }],
      })
    ).rejects.toThrow('Invalid Number (HTTP 400)');

    const log = await WaMessageLogModel.findOne({ campaign: 'welcome_back' }).lean();
    expect(log).toMatchObject({ status: 'FAILED', reason: 'Invalid Number (HTTP 400)', submitted_message_id: '' });
  });

  it('refuses a test the template cannot take, before anything is sent', async () => {
    const send = jest.spyOn(aisensyService, 'send');
    await expect(
      waCampaignService.testSend({ wa_campaign_name: 'welcome_back', destination: '919876543210', template_params: ['x'] })
    ).rejects.toThrow('The "Open" button\'s link needs a value');
    expect(send).not.toHaveBeenCalled();
    expect(await WaMessageLogModel.countDocuments()).toBe(0);
  });
});

describe('waCampaignService scheduling', () => {
  it('stores a future send as SCHEDULED with the campaign asset frozen, and cancels it', async () => {
    captureLongTimers();
    const send = jest.spyOn(aisensyService, 'send');

    const out = await waCampaignService.send(scheduledInput(15 * DAY));

    expect(out).toMatchObject({
      status: 'SCHEDULED',
      template_category: 'UTILITY',
      msg_rate: 0.145,
      media: { url: 'https://ik.imagekit.io/duncit/welcome.jpg', filename: 'welcome.jpg' },
      buttons: [{ index: 0, value: 'pods' }],
      contacts: [{ name: 'Ravi Kumar', extension: '91', number: '9876543210' }],
      audience: 'MANUAL_NUMBERS',
    });
    expect(out.scheduled_at).not.toBeNull();

    const cancelled = await waCampaignService.cancel(out.campaign_id);
    expect(cancelled.status).toBe('CANCELLED');
    await expect(waCampaignService.cancel(out.campaign_id)).rejects.toThrow('Only a scheduled campaign can be cancelled');
    await expect(waCampaignService.cancel('missing')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    expect(send).not.toHaveBeenCalled();
  });

  it('re-arms a schedule beyond the timer limit in hops, without sending early', async () => {
    const timers = captureLongTimers();
    const send = jest.spyOn(aisensyService, 'send');

    const out = await waCampaignService.send(scheduledInput(40 * DAY));
    expect(timers).toHaveLength(1);
    expect(timers[0].ms).toBe(MAX_TIMER_DELAY);

    timers[0].fire();
    expect(timers).toHaveLength(2);
    expect(timers[1].ms).toBe(MAX_TIMER_DELAY);
    expect((await WaCampaignModel.findOne({ campaign_id: out.campaign_id }).lean())!.status).toBe('SCHEDULED');
    expect(send).not.toHaveBeenCalled();

    await waCampaignService.cancel(out.campaign_id);
  });

  it('sends when the timer fires', async () => {
    const timers = captureLongTimers();
    const send = jest.spyOn(aisensyService, 'send').mockResolvedValue({ ok: true, submitted_message_id: 'm-1', message: 'ok' });

    const out = await waCampaignService.send(scheduledInput(15 * DAY));
    timers[0].fire();

    const done = await settledStatus(out.campaign_id, 'SCHEDULED').then((d) =>
      d.status === 'SENDING' ? settledStatus(out.campaign_id) : d
    );
    expect(done).toMatchObject({ status: 'SENT', sent_count: 1 });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('does not resurrect a send cancelled after its timer was armed', async () => {
    const timers = captureLongTimers();
    const send = jest.spyOn(aisensyService, 'send');
    const out = await waCampaignService.send(scheduledInput(15 * DAY));
    await WaCampaignModel.updateOne({ campaign_id: out.campaign_id }, { $set: { status: 'CANCELLED' } });

    timers[0].fire();
    await pause(150);

    expect((await WaCampaignModel.findOne({ campaign_id: out.campaign_id }).lean())!.status).toBe('CANCELLED');
    expect(send).not.toHaveBeenCalled();
  });

  it('re-arms every scheduled campaign after a restart, and only those', async () => {
    const timers = captureLongTimers();
    const base = { name: 'Restart', wa_campaign_name: 'welcome_back', audience: 'ALL_USERS' };
    await WaCampaignModel.create({ ...base, campaign_id: 'c-resume-1', status: 'SCHEDULED', scheduled_at: new Date(Date.now() + 20 * DAY) });
    await WaCampaignModel.create({ ...base, campaign_id: 'c-resume-2', status: 'SCHEDULED', scheduled_at: new Date(Date.now() + 21 * DAY) });
    await WaCampaignModel.create({ ...base, campaign_id: 'c-sent', status: 'SENT' });
    // A SCHEDULED row with no time is never armed.
    await WaCampaignModel.collection.insertOne({ ...base, campaign_id: 'c-no-time', status: 'SCHEDULED', scheduled_at: null });

    await waCampaignService.resumeSchedules();

    expect(timers).toHaveLength(2);
    await waCampaignService.remove('c-resume-1');
    await waCampaignService.remove('c-resume-2');
    expect(await WaCampaignModel.countDocuments({ status: 'SCHEDULED' })).toBe(1);
  });
});

describe('waCampaignService table, detail and removal', () => {
  it('pages the campaign table with frozen cost, and reads one campaign back', async () => {
    // Inserted raw so each keeps the creation time it is given.
    await WaCampaignModel.collection.insertOne({
      campaign_id: 'c-a',
      name: 'Alpha',
      wa_campaign_name: 'welcome_back',
      audience: 'SPECIFIC_USERS',
      user_ids: [new Types.ObjectId()],
      contacts: [],
      buttons: [],
      media: null,
      status: 'SENT',
      msg_rate: 0.5,
      recipient_count: 5,
      sent_count: 4,
      failed_count: 1,
      skipped_count: 0,
      error: null,
      created_at: new Date('2026-09-01T00:00:00.000Z'),
      updated_at: new Date('2026-09-01T00:00:00.000Z'),
    });
    await WaCampaignModel.collection.insertOne({
      campaign_id: 'c-b',
      name: 'Bravo',
      wa_campaign_name: 'welcome_back',
      audience: 'ALL_USERS',
      user_ids: [],
      contacts: [],
      buttons: [],
      media: null,
      status: 'FAILED',
      msg_rate: 1.09,
      recipient_count: 0,
      sent_count: 0,
      failed_count: 0,
      skipped_count: 0,
      error: 'No message could be delivered',
      created_at: new Date('2026-09-02T00:00:00.000Z'),
      updated_at: new Date('2026-09-02T00:00:00.000Z'),
    });

    const page = await waCampaignService.table();
    expect(page.total).toBe(2);
    expect(page.rows.map((r) => r.name)).toEqual(['Bravo', 'Alpha']);
    expect(page.rows[1]).toMatchObject({ cost: 2, user_ids: expect.any(Array), media: null, buttons: [], error: null });

    const failed = await waCampaignService.table({ filters: [{ field: 'status', op: 'eq', value: 'FAILED' }] });
    expect(failed.rows.map((r) => r.campaign_id)).toEqual(['c-b']);

    expect(await waCampaignService.byId('c-b')).toMatchObject({ name: 'Bravo', error: 'No message could be delivered', cost: 0 });
    await expect(waCampaignService.byId('missing')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });

  it('removes a campaign with its recipient rows, but never one that is sending', async () => {
    const base = { name: 'Gone soon', wa_campaign_name: 'welcome_back', audience: 'ALL_USERS' };
    await WaCampaignModel.create({ ...base, campaign_id: 'c-live', status: 'SENDING' });
    await WaCampaignModel.create({ ...base, campaign_id: 'c-old', status: 'SENT' });
    await WaCampaignRecipientModel.create([
      { campaign_id: 'c-old', status: 'SENT', name: 'A' },
      { campaign_id: 'c-old', status: 'SKIPPED', name: 'B' },
      { campaign_id: 'c-live', status: 'SENT', name: 'C' },
    ]);

    await expect(waCampaignService.remove('c-live')).rejects.toThrow('That campaign is sending right now — wait for it to finish');
    expect(await waCampaignService.remove('c-old')).toBe(true);
    await expect(waCampaignService.remove('c-old')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });

    expect(await WaCampaignModel.countDocuments({ campaign_id: 'c-old' })).toBe(0);
    expect(await WaCampaignRecipientModel.countDocuments({ campaign_id: 'c-old' })).toBe(0);
    expect(await WaCampaignRecipientModel.countDocuments({ campaign_id: 'c-live' })).toBe(1);
  });

  it('exports an empty campaign as just its header', async () => {
    expect(await waCampaignService.recipientsCsv('nothing-here')).toBe(
      '"Name","Destination","Status","Reason","Template params","AiSensy message id","Attempts","At"'
    );
  });
});
