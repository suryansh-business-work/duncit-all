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

import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { INVALID_NUMBER_REASON, isAisensyConfigured } from '@modules/platform/aisensy/aisensy.gateway';
import { listCampaigns, listTemplates } from '@modules/platform/aisensy/aisensy.project';
import { aisensyService } from '@modules/platform/aisensy/aisensy.service';
import { WaCampaignModel } from '../../waCampaign.model';
import { WaCampaignNameModel } from '../../waCampaignName.model';
import { WaCampaignRecipientModel } from '../../waCampaignRecipient.model';
import { waCampaignService } from '../../waCampaign.service';

/**
 * A WhatsApp campaign is billed per message, so who it reaches, who it skips
 * and why, what it costs and what a retry may touch are all pinned here — with
 * AiSensy itself mocked and every other read against the real database.
 */

const mockConfigured = jest.mocked(isAisensyConfigured);
const mockCampaigns = jest.mocked(listCampaigns);
const mockTemplates = jest.mocked(listTemplates);
const realSetTimeout = globalThis.setTimeout;
const pause = (ms: number) => new Promise((resolve) => realSetTimeout(resolve, ms));

const CAMPAIGN = {
  name: 'diwali_offer',
  status: 'LIVE',
  template_name: 'diwali_tpl',
  type: 'API',
  media_url: '',
  media_filename: '',
};
const TEMPLATE = {
  id: 'tpl_1',
  name: 'diwali_tpl',
  status: 'APPROVED',
  category: 'MARKETING',
  language: 'en',
  body: 'Hi {{1}}, a Diwali treat {{2}}',
  param_count: 2,
  header: '',
  header_format: '',
  needs_media: false,
  footer: '',
  buttons: [],
  cta_buttons: [],
};

let seq = 0;
const phone = (number: string) => ({ extension: '+91', number });
// metadata is passed explicitly: the schema's `metadata` default does not fire on create.
const ACTIVE = { status: 'ACTIVE' };
const seedUser = (profile: Record<string, unknown>, over: Record<string, unknown> = {}) =>
  UserModel.create({
    auth: { email: `wa-${++seq}@example.com`, phone: phone(`98765000${String(seq).padStart(2, '0')}`) },
    profile,
    metadata: ACTIVE,
    ...over,
  });

/** The send walks in the background — wait for it to land. */
async function finished(campaignId: string) {
  for (let i = 0; i < 250; i++) {
    const doc = await WaCampaignModel.findOne({ campaign_id: campaignId }).lean();
    if (doc && doc.status !== 'SENDING') return doc;
    await pause(20);
  }
  throw new Error(`campaign ${campaignId} never finished`);
}

const sendSpy = () => jest.spyOn(aisensyService, 'send');

beforeEach(() => {
  mockConfigured.mockResolvedValue(true);
  mockCampaigns.mockResolvedValue([CAMPAIGN]);
  mockTemplates.mockResolvedValue([TEMPLATE]);
  // Nothing in this suite may reach the real gateway; a test that expects a
  // send installs its own answer over this one.
  jest.spyOn(aisensyService, 'send').mockRejectedValue(new Error('unexpected AiSensy call'));
});

afterEach(() => jest.restoreAllMocks());

describe('waCampaignService.send — validation', () => {
  const valid = { name: 'Diwali blast', wa_campaign_name: 'diwali_offer', template_params: ['{{first_name}}', 'today'] };

  it('refuses to send before the AiSensy key is set', async () => {
    mockConfigured.mockResolvedValue(false);
    await expect(waCampaignService.send(valid)).rejects.toThrow('Add the AiSensy API key in the Tech portal before sending');
    expect(await WaCampaignModel.countDocuments()).toBe(0);
  });

  it.each([
    [{ name: 'ab' }, 'Give this campaign a name of at least 3 characters'],
    [{ wa_campaign_name: 'nobody_made_this' }, 'AiSensy has no campaign by that name — pick one, or add the name under Settings'],
    [{ template_params: ['{{first_name}}', '  '] }, 'Fill every template parameter before sending'],
    [{ template_params: ['{{frist_name}}', 'today'] }, 'Unknown variable {{frist_name}} in a template parameter'],
    [{ template_params: ['only one'] }, '"diwali_tpl" takes 2 variable(s) and this send fills 1. Match the template before sending.'],
    [{ audience: 'AUDIENCE_LIST', audience_list_id: 'junk' }, 'Pick the audience list to send to'],
    [{ audience: 'SPECIFIC_USERS', user_ids: ['junk', null] }, 'Pick at least one person to send to'],
    [{ audience: 'MANUAL_NUMBERS', contacts: [] }, 'Add at least one contact to send to'],
    [{ audience: 'MANUAL_NUMBERS', contacts: [{ name: 'Ravi', extension: '', number: '9876543210' }] }, 'Every contact needs a name, a country code and a number'],
    [{ scheduled_at: 'next tuesday-ish' }, 'That schedule date is not a real date'],
  ])('refuses %p', async (over, message) => {
    await expect(waCampaignService.send({ ...valid, ...over } as never)).rejects.toMatchObject({
      message,
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(await WaCampaignModel.countDocuments()).toBe(0);
  });

  it('accepts a name on the saved list when AiSensy’s catalogue cannot be read', async () => {
    mockCampaigns.mockRejectedValue(new Error('Project API key missing'));
    await WaCampaignNameModel.create({ name: 'legacy_campaign' });
    const send = sendSpy().mockResolvedValue({ ok: true, submitted_message_id: 'msg-1', message: 'ok' });

    const out = await waCampaignService.send({
      name: 'Legacy send',
      wa_campaign_name: 'legacy_campaign',
      audience: 'MANUAL_NUMBERS',
      contacts: [{ name: 'Ravi Kumar', extension: '+91', number: '98765 43210' }],
      template_params: ['{{first_name}}'],
      media: { url: ' https://ik.imagekit.io/duncit/banner.jpg ', filename: 'banner.jpg' },
      scheduled_at: '2020-01-01T00:00:00.000Z',
    });

    // A schedule that has already passed means "now".
    expect(out).toMatchObject({ status: 'SENDING', scheduled_at: null, template_category: '', msg_rate: 0 });
    const done = await finished(out.campaign_id);
    expect(done).toMatchObject({ status: 'SENT', sent_count: 1, recipient_count: 1 });
    expect(send).toHaveBeenCalledTimes(1);
    const [[call]] = send.mock.calls as [[{ media: { url: string; filename: string } } & Record<string, unknown>]];
    expect(call).toMatchObject({
      campaign_name: 'legacy_campaign',
      destination: '919876543210',
      user_name: 'Ravi Kumar',
      template_params: ['Ravi'],
    });
    // The asset given with the send, trimmed, travels on every message.
    expect(call.media.url).toBe('https://ik.imagekit.io/duncit/banner.jpg');
    expect(call.media.filename).toBe('banner.jpg');
  });
});

describe('waCampaignService.send — the walk', () => {
  it('sends to everyone reachable, skips with a reason, records failures and bills only what went out', async () => {
    const asha = await seedUser({ first_name: 'Asha', last_name: 'Rao', city: 'Pune' });
    await seedUser({ first_name: 'Bina' });
    await seedUser({ first_name: 'Chetan', city: 'Delhi' }, { auth: { email: 'bad-number@example.com', phone: phone('1234567890') } });
    await UserModel.collection.insertOne({
      auth: { email: 'no-name@example.com', phone: phone('9876511111') },
      profile: { city: 'Goa' },
      metadata: { status: 'ACTIVE', deleted_at: null },
    });
    await seedUser({ first_name: 'Fail', last_name: 'Case', city: 'Delhi' });
    await seedUser({ first_name: 'Gone', city: 'Delhi' }, { metadata: { status: 'SUSPENDED' } });
    await UserModel.create({
      auth: { email: 'short@example.com' },
      profile: { first_name: 'Short', city: 'Agra' },
      metadata: ACTIVE,
      communication: { whatsapp: { number: '98765' } },
    });

    const send = sendSpy().mockImplementation(async (input: { destination: string; user_name: string }) => {
      if (input.user_name === 'Fail Case') throw new Error('AiSensy error: "Unauthorized", retry');
      return { ok: true, submitted_message_id: `msg-${input.destination}`, message: 'ok' };
    });

    const out = await waCampaignService.send(
      { name: 'Diwali blast', wa_campaign_name: 'diwali_offer', template_params: ['{{first_name}}', 'from {{city}}'] },
      new Types.ObjectId().toHexString()
    );
    expect(out).toMatchObject({ audience: 'ALL_USERS', template_name: 'diwali_tpl', template_category: 'MARKETING', msg_rate: 1.09 });

    const done = await finished(out.campaign_id);
    expect(done).toMatchObject({ status: 'SENT', recipient_count: 6, sent_count: 1, failed_count: 1, skipped_count: 4, error: null });
    expect(done.sent_at).toBeInstanceOf(Date);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        campaign_name: 'diwali_offer',
        destination: '919876500001',
        user_name: 'Asha Rao',
        template_params: ['Asha', 'from Pune'],
        media: null,
      })
    );

    const view = await waCampaignService.byId(out.campaign_id);
    expect(view.cost).toBeCloseTo(1.09, 5);

    const rows = await WaCampaignRecipientModel.find({ campaign_id: out.campaign_id }).lean();
    const byName = new Map(rows.map((r) => [r.name, r]));
    expect(rows).toHaveLength(6);
    expect(byName.get('Asha Rao')).toMatchObject({ status: 'SENT', reason: '', submitted_message_id: 'msg-919876500001', template_params: ['Asha', 'from Pune'] });
    expect(String(byName.get('Asha Rao')!.user_id)).toBe(String(asha._id));
    expect(byName.get('Bina')).toMatchObject({ status: 'SKIPPED', reason: 'No value for {{city}}' });
    expect(byName.get('Chetan')).toMatchObject({ status: 'SKIPPED', reason: INVALID_NUMBER_REASON, destination: '911234567890' });
    expect(byName.get('')).toMatchObject({ status: 'SKIPPED', reason: 'No name on the account' });
    expect(byName.get('Fail Case')).toMatchObject({ status: 'FAILED', reason: 'AiSensy error: "Unauthorized", retry' });
    expect(byName.get('Short')).toMatchObject({ status: 'SKIPPED', reason: 'No WhatsApp number with a country code', destination: '' });

    const csv = await waCampaignService.recipientsCsv(out.campaign_id);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('"Name","Destination","Status","Reason","Template params","AiSensy message id","Attempts","At"');
    expect(lines).toHaveLength(7);
    expect(csv).toContain('"Fail Case","919876500004","FAILED","AiSensy error: ""Unauthorized"", retry","Fail | from Delhi","","1",');
    expect(csv).toContain('"Asha Rao","919876500001","SENT","","Asha | from Pune","msg-919876500001","1",');

    const page = await waCampaignService.recipients(out.campaign_id, { filters: [{ field: 'status', op: 'eq', value: 'SKIPPED' }] });
    expect(page.total).toBe(4);
    expect(page.rows.every((r) => r.status === 'SKIPPED' && r.attempts === 1)).toBe(true);
  });

  it('fails a send that reached nobody, naming the first reason', async () => {
    await seedUser({ first_name: 'Bina' });
    const send = sendSpy();

    const out = await waCampaignService.send({
      name: 'City promo',
      wa_campaign_name: 'diwali_offer',
      template_params: ['{{first_name}}', '{{city}}'],
    });

    const done = await finished(out.campaign_id);
    expect(done).toMatchObject({ status: 'FAILED', sent_count: 0, skipped_count: 1, error: 'No message could be delivered: No value for {{city}}' });
    expect(send).not.toHaveBeenCalled();
    expect((await waCampaignService.byId(out.campaign_id)).cost).toBe(0);
  });

  it('fails a send with no one in its audience without a reason to quote', async () => {
    const out = await waCampaignService.send({
      name: 'Empty list',
      wa_campaign_name: 'diwali_offer',
      template_params: ['a', 'b'],
      audience: 'SPECIFIC_USERS',
      user_ids: [new Types.ObjectId().toHexString()],
    });
    const done = await finished(out.campaign_id);
    expect(done).toMatchObject({ status: 'FAILED', recipient_count: 0, error: 'No message could be delivered' });
  });

  it('records the reason when the audience itself cannot be read', async () => {
    jest.spyOn(UserModel, 'find').mockImplementation(() => {
      throw new Error('Mongo is not answering');
    });
    const out = await waCampaignService.send({ name: 'Broken read', wa_campaign_name: 'diwali_offer', template_params: ['a', 'b'] });
    const done = await finished(out.campaign_id);
    expect(done).toMatchObject({ status: 'FAILED', error: 'Mongo is not answering' });
  });

  it('writes progress in batches on a long send, keeping one row per person', async () => {
    const people = Array.from({ length: 21 }, (_, i) => ({
      name: `Guest ${i + 1}`,
      extension: '91',
      number: `98100${String(i).padStart(5, '0')}`,
    }));
    sendSpy().mockResolvedValue({ ok: true, submitted_message_id: 'm', message: 'ok' });

    const out = await waCampaignService.send({
      name: 'Big list',
      wa_campaign_name: 'diwali_offer',
      template_params: ['{{first_name}}', 'x'],
      audience: 'MANUAL_NUMBERS',
      contacts: people,
    });

    const done = await finished(out.campaign_id);
    expect(done).toMatchObject({ status: 'SENT', sent_count: 21, recipient_count: 21 });
    expect(await WaCampaignRecipientModel.countDocuments({ campaign_id: out.campaign_id })).toBe(21);
  });
});

describe('waCampaignService.retry', () => {
  it('refuses while unconfigured, for an unknown campaign, mid-send, before it ran, and with nothing to retry', async () => {
    mockConfigured.mockResolvedValueOnce(false);
    await expect(waCampaignService.retry('anything')).rejects.toThrow('Add the AiSensy API key');
    await expect(waCampaignService.retry('missing')).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });

    const base = { name: 'X campaign', wa_campaign_name: 'diwali_offer', audience: 'ALL_USERS' };
    await WaCampaignModel.create({ ...base, campaign_id: 'c-sending', status: 'SENDING' });
    await WaCampaignModel.create({ ...base, campaign_id: 'c-scheduled', status: 'SCHEDULED', scheduled_at: new Date(Date.now() + 3_600_000) });
    await WaCampaignModel.create({ ...base, campaign_id: 'c-done', status: 'SENT', sent_count: 1 });
    await WaCampaignRecipientModel.create({ campaign_id: 'c-done', status: 'SENT', name: 'A' });

    await expect(waCampaignService.retry('c-sending')).rejects.toThrow('That campaign is sending right now — wait for it to finish');
    await expect(waCampaignService.retry('c-scheduled')).rejects.toThrow('That campaign has not run yet');
    await expect(waCampaignService.retry('c-done')).rejects.toThrow('Nothing to retry — this campaign reached everyone it walked over');
  });

  it('re-reads an account that was skipped and updates its one row in place', async () => {
    const bina = await seedUser({ first_name: 'Bina' });
    const gone = await seedUser({ first_name: 'Gone' });
    sendSpy().mockResolvedValue({ ok: true, submitted_message_id: 'msg-retry', message: 'ok' });

    const out = await waCampaignService.send({
      name: 'City promo',
      wa_campaign_name: 'diwali_offer',
      template_params: ['{{first_name}}', '{{city}}'],
      audience: 'SPECIFIC_USERS',
      user_ids: [String(bina._id), String(gone._id)],
    });
    expect((await finished(out.campaign_id)).status).toBe('FAILED');

    // Bina adds her city; Gone deletes their account.
    await UserModel.updateOne({ _id: bina._id }, { $set: { 'profile.city': 'Pune' } });
    await UserModel.deleteOne({ _id: gone._id });

    const started = await waCampaignService.retry(out.campaign_id);
    expect(started.status).toBe('SENDING');
    const done = await finished(out.campaign_id);

    expect(done).toMatchObject({ status: 'SENT', sent_count: 1, skipped_count: 1, failed_count: 0, error: null });
    const rows = await WaCampaignRecipientModel.find({ campaign_id: out.campaign_id }).lean();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => String(r.user_id) === String(bina._id))).toMatchObject({
      status: 'SENT',
      attempts: 2,
      reason: '',
      submitted_message_id: 'msg-retry',
      template_params: ['Bina', 'Pune'],
    });
    expect(rows.find((r) => String(r.user_id) === String(gone._id))).toMatchObject({
      status: 'SKIPPED',
      attempts: 1,
      reason: 'No value for {{city}}',
    });
  });

  it('retries a typed-in contact from the campaign itself, and stays FAILED if it fails again', async () => {
    const send = sendSpy().mockRejectedValue(new Error('Template paused'));
    const out = await waCampaignService.send({
      name: 'Manual send',
      wa_campaign_name: 'diwali_offer',
      template_params: ['{{first_name}}', 'x'],
      audience: 'MANUAL_NUMBERS',
      contacts: [{ name: 'Ravi Kumar', extension: '91', number: '9876543210' }],
    });
    expect(await finished(out.campaign_id)).toMatchObject({ status: 'FAILED', error: 'No message could be delivered: Template paused' });

    await waCampaignService.retry(out.campaign_id);
    const again = await finished(out.campaign_id);
    expect(again).toMatchObject({ status: 'FAILED', failed_count: 1, error: 'No message could be delivered: Template paused' });

    send.mockResolvedValue({ ok: true, submitted_message_id: 'msg-ok', message: 'ok' });
    await waCampaignService.retry(out.campaign_id);
    const healed = await finished(out.campaign_id);
    expect(healed).toMatchObject({ status: 'SENT', sent_count: 1, failed_count: 0, error: null });
    const [row] = await WaCampaignRecipientModel.find({ campaign_id: out.campaign_id }).lean();
    expect(row).toMatchObject({ status: 'SENT', attempts: 3, destination: '919876543210', user_id: null });
  });

  it('records the reason when the retry itself breaks', async () => {
    await WaCampaignModel.create({ campaign_id: 'c-broken', name: 'Broken', wa_campaign_name: 'diwali_offer', audience: 'ALL_USERS', status: 'FAILED' });
    await WaCampaignRecipientModel.create({ campaign_id: 'c-broken', status: 'FAILED', user_id: new Types.ObjectId(), name: 'A' });
    jest.spyOn(UserModel, 'find').mockImplementation(() => {
      throw new Error('Users unreadable');
    });

    await waCampaignService.retry('c-broken');

    expect(await finished('c-broken')).toMatchObject({ status: 'FAILED', error: 'Users unreadable' });
  });
});
