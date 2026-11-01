/**
 * Outreach sequences against a real database, with the two senders faked:
 * saving and validating a sequence, enrolling once, the tick sending step 1
 * and then waiting, the daily limit, quiet hours, one send under two parallel
 * ticks, replies and opt-outs stopping the walk, WhatsApp only on an approved
 * template, the DM task lifecycle and the OUTREACH run each tick records.
 */
jest.mock('@services/email/email.service', () => ({ sendHtmlEmail: jest.fn() }));
jest.mock('@services/email/email-i18n', () => ({
  recipientLocale: jest.fn().mockResolvedValue(null),
  emailTranslationVars: jest.fn().mockResolvedValue({ 't:email.fragment.unsubscribe': 'Not for you?', 't:email.fragment.unsubscribeLink': 'Unsubscribe' }),
}));
jest.mock('@config/url-configs', () => ({ getUrlConfigs: jest.fn().mockResolvedValue({ appUrl: 'https://app.test' }) }));
jest.mock('@modules/platform/aisensy/aisensy.service', () => ({ aisensyService: { send: jest.fn() } }));
jest.mock('../../../waCampaign.template', () => ({
  resolveCampaign: jest.fn(),
  sendExtras: jest.fn(() => ({ media: null, buttons: [] })),
}));

import { sendHtmlEmail } from '@services/email/email.service';
import { aisensyService } from '@modules/platform/aisensy/aisensy.service';
import { WaPreferenceModel } from '@modules/platform/whatsapp/waPreference.model';
import { WaMessageLogModel } from '@modules/platform/whatsapp/waMessageLog.model';
import { MailPreferenceModel } from '@modules/content/mailPreference/mailPreference.model';
import { resolveCampaign } from '../../../waCampaign.template';
import { WaCampaignNameModel } from '../../../waCampaignName.model';
import { MarketingLeadModel } from '../../../leads/marketingLead.model';
import { MarketingRunModel } from '../../../runs/marketingRun.model';
import { OutreachEnrollmentModel, OutreachSendModel, OutreachTaskModel } from '../../outreach.model';
import { outreachService } from '../../outreach.service';
import { inQuietHours, runOutreachTick } from '../../outreach.runner';
import { outreachEmailReply, outreachWhatsappReply } from '../../outreach.inbound';
import type { OutreachSequenceInput } from '../../outreach.types';

const emailMock = sendHtmlEmail as jest.Mock;
const waMock = aisensyService.send as jest.Mock;
const resolveMock = resolveCampaign as jest.Mock;
const user = { id: 'u1' };
const DAY = 86_400_000;

const approved = { template: { status: 'APPROVED', name: 'promo' }, template_category: 'MARKETING', msg_rate: 0.8 };

const seqInput = (over: Partial<OutreachSequenceInput> = {}): OutreachSequenceInput => ({
  name: 'Venue partners',
  steps: [
    { kind: 'EMAIL', subject: 'Hi {name}', body: 'Hello {name} at {company}' },
    { kind: 'WAIT', wait_days: 3 },
    { kind: 'DM_TASK', body: 'DM {name}' },
  ],
  daily_limit: 10,
  quiet_start_hour: 0,
  quiet_end_hour: 0,
  ...over,
});

let leadSeq = 0;
const makeLead = (over: Record<string, unknown> = {}) => {
  leadSeq += 1;
  const email = `owner${leadSeq}@cafe.in`;
  const phone = `91987654${String(3200 + leadSeq)}`;
  return MarketingLeadModel.create({
    name: `Cafe ${leadSeq}`,
    company: `Cafe Co ${leadSeq}`,
    source: 'MANUAL',
    pipeline: 'VENUE',
    emails: [email],
    email_keys: [email],
    phones: [phone],
    phone_keys: [phone.slice(-10)],
    ...over,
  });
};

const activeSequence = async (over: Partial<OutreachSequenceInput> = {}) => {
  const seq = await outreachService.save(null, seqInput(over), user, true);
  await outreachService.setActive(seq.id, true, user);
  return seq;
};

beforeAll(async () => {
  await Promise.all([OutreachEnrollmentModel.init(), OutreachSendModel.init()]);
});

beforeEach(() => {
  emailMock.mockReset().mockResolvedValue({ skipped: false });
  waMock.mockReset().mockResolvedValue({ submitted_message_id: 'm1' });
  resolveMock.mockReset().mockResolvedValue(approved);
});

describe('saving a sequence', () => {
  it('stores a valid sequence inactive, and refuses a bad one', async () => {
    const seq = await outreachService.save(null, seqInput(), user, true);
    expect(seq).toMatchObject({ name: 'Venue partners', active: false, daily_limit: 10, stop_on_reply: true, sent_today: 0 });
    expect(seq.steps.map((s) => s.kind)).toEqual(['EMAIL', 'WAIT', 'DM_TASK']);
    await expect(outreachService.save(null, seqInput({ steps: [{ kind: 'EMAIL', subject: 'x', body: 'y' }, { kind: 'WAIT', wait_days: 2 }] }), user, true)).rejects.toThrow(
      'A sequence cannot end with a wait.'
    );
    await expect(outreachService.save(null, seqInput({ steps: [{ kind: 'WAIT', wait_days: 2 }] }), user, true)).rejects.toThrow('at least one step');
    await expect(outreachService.save(null, seqInput({ steps: [{ kind: 'EMAIL', subject: '', body: 'y' }] }), user, true)).rejects.toThrow('subject');
    await expect(outreachService.save(null, seqInput({ daily_limit: 0 }), user, true)).rejects.toThrow('daily limit');
  });

  it('takes a WhatsApp step only on a campaign the Communications portal lists', async () => {
    const steps = [{ kind: 'WHATSAPP' as const, wa_template_key: 'promo', wa_params: ['{name}'] }];
    await expect(outreachService.save(null, seqInput({ steps }), user, true)).rejects.toThrow('is not a WhatsApp campaign the Communications portal lists');
    await WaCampaignNameModel.create({ name: 'promo' });
    await expect(outreachService.save(null, seqInput({ steps }), user, true)).resolves.toMatchObject({ steps: [{ wa_template_key: 'promo', wa_params: ['{name}'] }] });
  });

  it('lets an editor change only a sequence that is not live', async () => {
    const seq = await activeSequence();
    await expect(outreachService.save(seq.id, seqInput({ name: 'Edited' }), user, false)).rejects.toThrow('only a manager');
    await expect(outreachService.save(seq.id, seqInput({ name: 'Edited' }), user, true)).resolves.toMatchObject({ name: 'Edited' });
  });
});

describe('enrolling', () => {
  it('enrolls open leads of the pipeline once, past leading waits', async () => {
    const seq = await activeSequence({ steps: [{ kind: 'WAIT', wait_days: 2 }, { kind: 'EMAIL', subject: 's', body: 'b' }], pipeline: 'VENUE' });
    const lead = await makeLead();
    await makeLead({ pipeline: 'HOST' });
    await makeLead({ stage: 'LOST' });
    expect(await outreachService.enrollCount(seq.id, null)).toBe(1);
    await expect(outreachService.enroll(seq.id, null, {}, user)).resolves.toEqual({ enrolled: 1, already: 0, skipped: 0 });
    await expect(outreachService.enroll(seq.id, [String(lead._id)], null, user)).resolves.toEqual({ enrolled: 0, already: 1, skipped: 0 });
    const row = await OutreachEnrollmentModel.findOne({ lead_id: lead._id }).lean();
    expect(row?.step_index).toBe(1);
    expect((row?.next_at?.getTime() ?? 0) - Date.now()).toBeGreaterThan(2 * DAY - 60_000);
    expect(await outreachService.enrollCount(seq.id, null)).toBe(0);
  });
});

describe('the tick', () => {
  it('sends step 1, records it, moves the lead to Contacted, then waits three days', async () => {
    const seq = await activeSequence();
    const lead = await makeLead();
    await outreachService.enroll(seq.id, null, {}, user);
    const runId = await runOutreachTick();
    expect(emailMock).toHaveBeenCalledTimes(1);
    const sent = emailMock.mock.calls[0][0];
    expect(sent).toMatchObject({ to: lead.emails[0], subject: `Hi ${lead.name}`, category: 'marketing' });
    expect(sent.html).toContain(`Hello ${lead.name} at ${lead.company}`);
    expect(sent.html).toContain('https://app.test/unsubscribe?e=');
    const row = await OutreachEnrollmentModel.findOne({ lead_id: lead._id }).lean();
    expect(row).toMatchObject({ status: 'ACTIVE', step_index: 2 });
    expect((row?.next_at?.getTime() ?? 0) - Date.now()).toBeGreaterThan(3 * DAY - 60_000);
    expect(await OutreachSendModel.findOne({ lead_id: lead._id }).lean()).toMatchObject({ status: 'SENT', step_index: 0, destination: lead.emails[0] });
    const updated = await MarketingLeadModel.findById(lead._id).lean();
    expect(updated?.stage).toBe('CONTACTED');
    expect(updated?.timeline.map((e) => e.kind)).toEqual(expect.arrayContaining(['OUTREACH', 'STAGE']));
    const run = await MarketingRunModel.findById(runId).lean();
    expect(run).toMatchObject({ workflow: 'OUTREACH', status: 'COMPLETED', trigger: 'SCHEDULE' });
    expect(run?.steps).toHaveLength(1);

    emailMock.mockClear();
    await expect(runOutreachTick()).resolves.toBeNull();
    expect(emailMock).not.toHaveBeenCalled();
  });

  it('keeps to the daily limit and resumes the rest another day', async () => {
    const seq = await activeSequence({ daily_limit: 1 });
    await makeLead();
    await makeLead();
    await outreachService.enroll(seq.id, null, {}, user);
    await runOutreachTick();
    await runOutreachTick();
    expect(emailMock).toHaveBeenCalledTimes(1);
    expect(await OutreachEnrollmentModel.countDocuments({ step_index: 0 })).toBe(1);
    expect((await outreachService.get(seq.id)).sent_today).toBe(1);
  });

  it('sends nothing in quiet hours, read on the admin clock', async () => {
    const seq = await activeSequence({ quiet_start_hour: 21, quiet_end_hour: 9 });
    await makeLead();
    await outreachService.enroll(seq.id, null, {}, user);
    const night = new Date('2026-11-02T17:30:00.000Z'); // 23:00 in Asia/Kolkata
    expect(inQuietHours({ quiet_start_hour: 21, quiet_end_hour: 9 }, night)).toBe(true);
    expect(inQuietHours({ quiet_start_hour: 21, quiet_end_hour: 9 }, new Date('2026-11-02T06:30:00.000Z'))).toBe(false);
    expect(inQuietHours({ quiet_start_hour: 13, quiet_end_hour: 15 }, new Date('2026-11-02T08:30:00.000Z'))).toBe(true);
    expect(inQuietHours({ quiet_start_hour: 5, quiet_end_hour: 5 }, night)).toBe(false);
    // Tomorrow at 23:00 in Asia/Kolkata: the enrollment is due, the window is shut.
    const tomorrowNight = new Date(Date.now() + DAY);
    tomorrowNight.setUTCHours(17, 30, 0, 0);
    await expect(runOutreachTick(tomorrowNight)).resolves.toBeNull();
    expect(emailMock).not.toHaveBeenCalled();
  });

  it('sends a step once when two ticks run at the same time', async () => {
    const seq = await activeSequence();
    await makeLead();
    await outreachService.enroll(seq.id, null, {}, user);
    await Promise.all([runOutreachTick(), runOutreachTick()]);
    expect(emailMock).toHaveBeenCalledTimes(1);
    expect(await OutreachSendModel.countDocuments({})).toBe(1);
  });

  it('skips a lead with no email and moves on', async () => {
    const seq = await activeSequence();
    const lead = await makeLead({ emails: [], email_keys: [] });
    await outreachService.enroll(seq.id, null, {}, user);
    await runOutreachTick();
    expect(emailMock).not.toHaveBeenCalled();
    expect(await OutreachSendModel.findOne({ lead_id: lead._id }).lean()).toMatchObject({ status: 'SKIPPED', detail: 'The lead has no email address' });
    expect(await OutreachEnrollmentModel.findOne({ lead_id: lead._id }).lean()).toMatchObject({ status: 'ACTIVE', step_index: 2 });
  });

  it('stops a lead who unsubscribed from marketing email before anything is sent', async () => {
    const seq = await activeSequence();
    const lead = await makeLead();
    await MailPreferenceModel.create({ email: lead.emails[0], opted_out: ['marketing'] });
    await outreachService.enroll(seq.id, null, {}, user);
    await expect(runOutreachTick()).resolves.toBeNull();
    expect(emailMock).not.toHaveBeenCalled();
    expect(await OutreachEnrollmentModel.findOne({ lead_id: lead._id }).lean()).toMatchObject({ status: 'OPTED_OUT' });
  });

  it('fails the enrollment when the send fails, and Resume retries that step once', async () => {
    const seq = await activeSequence();
    const lead = await makeLead();
    await outreachService.enroll(seq.id, null, {}, user);
    emailMock.mockResolvedValueOnce({ skipped: true, reason: 'SMTP refused' });
    const runId = await runOutreachTick();
    const row = await OutreachEnrollmentModel.findOne({ lead_id: lead._id }).lean();
    expect(row).toMatchObject({ status: 'FAILED', error: 'SMTP refused' });
    expect(await MarketingRunModel.findById(runId).lean()).toMatchObject({ status: 'FAILED' });
    await outreachService.resume(String(row?._id));
    await runOutreachTick();
    expect(emailMock).toHaveBeenCalledTimes(2);
    expect(await OutreachEnrollmentModel.findOne({ lead_id: lead._id }).lean()).toMatchObject({ status: 'ACTIVE', step_index: 2 });
  });
});

describe('WhatsApp steps', () => {
  const waSequence = async () => {
    await WaCampaignNameModel.create({ name: 'promo' });
    return activeSequence({ steps: [{ kind: 'WHATSAPP', wa_template_key: 'promo', wa_params: ['{name}'] }] });
  };

  it('send only on an approved template, through the marketing log', async () => {
    const seq = await waSequence();
    const lead = await makeLead();
    await outreachService.enroll(seq.id, null, {}, user);
    await runOutreachTick();
    expect(waMock).toHaveBeenCalledWith(expect.objectContaining({ campaign_name: 'promo', destination: lead.phones[0], template_params: [lead.name] }));
    expect(await WaMessageLogModel.findOne({ destination: lead.phones[0] }).lean()).toMatchObject({ event_key: 'OUTREACH', category: 'marketing', status: 'SENT' });
    expect(await OutreachEnrollmentModel.findOne({ lead_id: lead._id }).lean()).toMatchObject({ status: 'DONE' });
  });

  it('refuse a template that is not approved, or that could not be checked', async () => {
    const seq = await waSequence();
    const lead = await makeLead();
    await outreachService.enroll(seq.id, null, {}, user);
    resolveMock.mockResolvedValue({ ...approved, template: { status: 'PENDING' } });
    await runOutreachTick();
    expect(waMock).not.toHaveBeenCalled();
    expect(await OutreachEnrollmentModel.findOne({ lead_id: lead._id }).lean()).toMatchObject({ status: 'FAILED', error: expect.stringContaining('not approved') });
  });

  it('respect the number opting out of marketing', async () => {
    const seq = await waSequence();
    const lead = await makeLead();
    await WaPreferenceModel.create({ destination: lead.phones[0], opted_out: ['marketing'] });
    await outreachService.enroll(seq.id, null, {}, user);
    await runOutreachTick();
    expect(waMock).not.toHaveBeenCalled();
    expect(await OutreachEnrollmentModel.findOne({ lead_id: lead._id }).lean()).toMatchObject({ status: 'OPTED_OUT' });
  });
});

describe('replies', () => {
  it('a WhatsApp reply stops the walk and moves the lead to Replied', async () => {
    const seq = await activeSequence();
    const lead = await makeLead();
    await outreachService.enroll(seq.id, null, {}, user);
    await expect(outreachWhatsappReply(lead.phones[0])).resolves.toBe(1);
    expect(await OutreachEnrollmentModel.findOne({ lead_id: lead._id }).lean()).toMatchObject({ status: 'REPLIED', next_at: null });
    const updated = await MarketingLeadModel.findById(lead._id).lean();
    expect(updated?.stage).toBe('REPLIED');
    await runOutreachTick();
    expect(emailMock).not.toHaveBeenCalled();
    await expect(outreachWhatsappReply('123')).resolves.toBe(0);
  });

  it('an email from a lead who has opted out ends the enrollment OPTED_OUT, not REPLIED', async () => {
    const seq = await activeSequence();
    const lead = await makeLead();
    await MailPreferenceModel.create({ email: lead.emails[0], opted_out: ['marketing'] });
    await outreachService.enroll(seq.id, null, {}, user);
    await outreachEmailReply(lead.emails[0].toUpperCase());
    expect(await OutreachEnrollmentModel.findOne({ lead_id: lead._id }).lean()).toMatchObject({ status: 'OPTED_OUT' });
    expect((await MarketingLeadModel.findById(lead._id).lean())?.stage).toBe('NEW');
  });

  it('keeps walking when the sequence does not stop on a reply', async () => {
    const seq = await activeSequence({ stop_on_reply: false });
    const lead = await makeLead();
    await outreachService.enroll(seq.id, null, {}, user);
    await outreachEmailReply(lead.emails[0]);
    expect(await OutreachEnrollmentModel.findOne({ lead_id: lead._id }).lean()).toMatchObject({ status: 'ACTIVE' });
    await runOutreachTick();
    expect(emailMock).toHaveBeenCalledTimes(1);
  });
});

describe('DM tasks', () => {
  it('make a task for a person, wait on it, and carry on once it is marked done', async () => {
    const seq = await activeSequence({ steps: [{ kind: 'DM_TASK', body: 'Hey {name}' }, { kind: 'EMAIL', subject: 'Follow up', body: 'b' }] });
    const lead = await makeLead({ instagram_handle: 'bluecafe' });
    await outreachService.enroll(seq.id, null, {}, user);
    await runOutreachTick();
    const tasks = await outreachService.tasks();
    expect(tasks).toEqual([expect.objectContaining({ lead_name: lead.name, text: `Hey ${lead.name}`, status: 'OPEN', lead_instagram_url: 'https://www.instagram.com/bluecafe/', sequence_name: 'Venue partners' })]);
    expect(await OutreachEnrollmentModel.findOne({ lead_id: lead._id }).lean()).toMatchObject({ step_index: 0, next_at: null, waiting_task_id: tasks[0].id });
    await runOutreachTick();
    expect(emailMock).not.toHaveBeenCalled();

    const done = await outreachService.completeTask(tasks[0].id, 'Sent from the brand account', { id: 'u1', name: 'Asha' });
    expect(done).toMatchObject({ status: 'DONE', done_by_name: 'Asha' });
    await expect(outreachService.completeTask(tasks[0].id, null, { id: 'u1', name: 'Asha' })).rejects.toThrow('already closed');
    expect(await OutreachSendModel.findOne({ step_index: 0 }).lean()).toMatchObject({ status: 'SENT' });
    await runOutreachTick();
    expect(emailMock).toHaveBeenCalledTimes(1);
    expect(await outreachService.tasks()).toEqual([]);
  });

  it('are cancelled when the lead replies', async () => {
    const seq = await activeSequence({ steps: [{ kind: 'DM_TASK', body: 'Hey' }] });
    const lead = await makeLead();
    await outreachService.enroll(seq.id, null, {}, user);
    await runOutreachTick();
    await outreachWhatsappReply(lead.phones[0]);
    expect(await OutreachTaskModel.findOne({ lead_id: lead._id }).lean()).toMatchObject({ status: 'CANCELLED' });
  });
});

describe('managing enrollments', () => {
  it('pause, resume, list and remove', async () => {
    const seq = await activeSequence();
    await makeLead();
    await outreachService.enroll(seq.id, null, {}, user);
    const page = await outreachService.enrollmentsTable({ filters: [{ field: 'sequence_id', op: 'eq', value: seq.id }] });
    expect(page.total).toBe(1);
    expect(page.rows[0]).toMatchObject({ sequence_name: 'Venue partners', step_count: 3, status: 'ACTIVE' });
    const id = page.rows[0].id;
    await expect(outreachService.pause(id)).resolves.toMatchObject({ status: 'PAUSED' });
    await expect(outreachService.pause(id)).rejects.toThrow('Only an active enrollment');
    await runOutreachTick();
    expect(emailMock).not.toHaveBeenCalled();
    await expect(outreachService.resume(id)).resolves.toMatchObject({ status: 'ACTIVE' });
    await expect(outreachService.remove(id)).resolves.toBe(true);
    await expect(outreachService.resume(id)).rejects.toThrow('Enrollment not found');
    expect((await outreachService.list())[0].counts.total).toBe(0);
  });
});
