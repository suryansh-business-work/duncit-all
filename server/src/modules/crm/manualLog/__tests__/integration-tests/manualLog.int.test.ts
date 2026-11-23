jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import { sendEmail } from '@services/email/email.service';
import { UserModel } from '@modules/access/user/user.model';
import { HostLeadModel, VenueLeadModel } from '@modules/crm/crm/crm.model';
import { crmService } from '@modules/crm/crm/crm.service';
import { manualLogService } from '../../manualLog.service';
import { leadLogsUrl } from '../../manualLog.notify';

/**
 * Manual logs end to end against the database: who may change a log, what a
 * change leaves in the history, how a delete keeps its place, and who is
 * emailed about an @mention (and when they are not).
 */

const sendEmailMock = sendEmail as jest.MockedFunction<typeof sendEmail>;

async function staff(first: string, roles: string[] = ['CRM_MANAGER'], metadata: Record<string, unknown> = {}) {
  const user = await UserModel.create({
    auth: { email: `${first.toLowerCase()}@duncit.test` },
    profile: { first_name: first, last_name: 'Test' },
    metadata: { role_keys: roles, ...metadata },
  });
  return { id: String(user._id), roles };
}

const mention = (id: string, label: string) => `<span data-type="mention" data-id="${id}" data-label="${label}">@${label}</span>`;

async function hostLead() {
  const lead = await crmService.createHostLead({ host_name: 'Asha Events' });
  return { entity_type: 'HOST_LEAD' as const, entity_id: lead!.id };
}

beforeEach(() => sendEmailMock.mockClear());

describe('manualLogService.create', () => {
  it('stores the log with an id, a NOTE_CREATED entry, and emails the staff it mentions', async () => {
    const author = await staff('Asha');
    const priya = await staff('Priya');
    const outsider = await staff('Member', ['USER']);
    const target = await hostLead();

    const log = await manualLogService.create(
      {
        ...target,
        summary: ' Site visit ',
        body_html: `<p>${mention(priya.id, 'Priya')} ${mention(outsider.id, 'Member')} ${mention(author.id, 'Asha')}</p>`,
        body_text: 'Visit',
      },
      author
    );

    expect(log).toMatchObject({ type: 'NOTE', summary: 'Site visit', created_by: author.id, is_deleted: false });
    // Only active CRM staff count as mentions; the member is ignored.
    expect(log.mention_user_ids.sort()).toEqual([author.id, priya.id].sort());
    const stored = await HostLeadModel.findById(target.entity_id).lean();
    expect(stored!.activity_log.map((entry) => entry.type)).toEqual(['NOTE', 'NOTE_CREATED']);
    expect(stored!.activity_log[1]).toMatchObject({ target: log.id, created_by: author.id });
    // The author is never emailed about their own log.
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'priya@duncit.test',
        template: 'crm-log-mention',
        category: 'internal',
        vars: expect.objectContaining({ name: 'Priya Test', author: 'Asha Test', lead_name: 'Asha Events', log_title: 'Site visit' }),
      })
    );
  });

  it('titles the email from the text when the log has no title, and survives a failed email', async () => {
    const author = await staff('Asha');
    const priya = await staff('Priya');
    const target = await hostLead();
    sendEmailMock.mockRejectedValueOnce(new Error('smtp down'));

    const log = await manualLogService.create({ ...target, body_html: `<p>${mention(priya.id, 'Priya')} call back</p>`, body_text: '@Priya call back' }, author);

    expect(log.id).toBeTruthy();
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({ vars: expect.objectContaining({ log_title: '@Priya call back' }) }));
  });

  it('refuses an empty or oversized body, an unknown lead and a malformed lead id', async () => {
    const author = await staff('Asha');
    const target = await hostLead();
    await expect(manualLogService.create({ ...target, body_html: '   ' }, author)).rejects.toThrow('Write something in the log before saving.');
    await expect(manualLogService.create({ ...target, body_html: 'x'.repeat(100_001) }, author)).rejects.toThrow('This log is too long');
    await expect(
      manualLogService.create({ entity_type: 'VENUE_LEAD', entity_id: new Types.ObjectId().toHexString(), body_html: '<p>x</p>' }, author)
    ).rejects.toThrow('Venue lead not found');
    await expect(manualLogService.create({ entity_type: 'VENUE_LEAD', entity_id: 'nope', body_html: '<p>x</p>' }, author)).rejects.toThrow('Unknown lead.');
  });
});

describe('manualLogService.update', () => {
  it('lets the author edit, stamps the edit, records NOTE_UPDATED and emails only newly added mentions', async () => {
    const author = await staff('Asha');
    const priya = await staff('Priya');
    const ravi = await staff('Ravi');
    const target = await hostLead();
    const log = await manualLogService.create({ ...target, body_html: `<p>${mention(priya.id, 'Priya')}</p>` }, author);
    sendEmailMock.mockClear();

    const edited = await manualLogService.update(
      { ...target, log_id: log.id!, summary: 'Updated', body_html: `<p>${mention(priya.id, 'Priya')} ${mention(ravi.id, 'Ravi')}</p>` },
      author
    );

    expect(edited).toMatchObject({ id: log.id, summary: 'Updated', updated_by: author.id });
    expect(edited.updated_at).toEqual(expect.any(String));
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'ravi@duncit.test' }));
    const stored = await HostLeadModel.findById(target.entity_id).lean();
    expect(stored!.activity_log.map((entry) => entry.type)).toEqual(['NOTE', 'NOTE_CREATED', 'NOTE_UPDATED']);
  });

  it('refuses a teammate who is not the author, but lets a SUPER_ADMIN edit', async () => {
    const author = await staff('Asha');
    const teammate = await staff('Ravi');
    const admin = await staff('Root', ['SUPER_ADMIN']);
    const target = await hostLead();
    const log = await manualLogService.create({ ...target, body_html: '<p>mine</p>' }, author);

    await expect(manualLogService.update({ ...target, log_id: log.id!, body_html: '<p>theirs</p>' }, teammate)).rejects.toThrow(
      'Only the person who wrote this log can change it.'
    );
    await expect(manualLogService.update({ ...target, log_id: log.id!, body_html: '<p>fixed</p>' }, admin)).resolves.toMatchObject({
      body_html: '<p>fixed</p>',
      updated_by: admin.id,
    });
  });

  it('gives a legacy log (written before ids) an id on its first edit', async () => {
    const author = await staff('Asha');
    const lead = await VenueLeadModel.create({
      venue_name: 'Old Hall',
      city: 'Pune',
      full_address: 'x',
      activity_log: [{ type: 'NOTE', body_html: '<p>old</p>', created_by: author.id }],
    });
    const target = { entity_type: 'VENUE_LEAD' as const, entity_id: String(lead._id) };
    const listed = await crmService.getVenueLead(target.entity_id);
    expect(listed!.activity_log[0].id).toBe('legacy-0');

    const edited = await manualLogService.update({ ...target, log_id: 'legacy-0', body_html: '<p>new</p>' }, author);

    expect(edited.id).toMatch(/^[a-f\d]{24}$/);
    const stored = await VenueLeadModel.findById(lead._id).lean();
    expect(stored!.activity_log[0]).toMatchObject({ log_id: edited.id, body_html: '<p>new</p>' });
    expect(stored!.activity_log[1]).toMatchObject({ type: 'NOTE_UPDATED', target: edited.id });
  });

  it('refuses ids that point at nothing, at a non-log entry, or at a legacy slot that already has an id', async () => {
    const author = await staff('Asha');
    const target = await hostLead();
    const log = await manualLogService.create({ ...target, body_html: '<p>a</p>' }, author);
    const missing = 'That log no longer exists. Refresh the page.';
    await expect(manualLogService.update({ ...target, log_id: 'nope', body_html: '<p>b</p>' }, author)).rejects.toThrow(missing);
    // Position 1 is the NOTE_CREATED entry; position 0 already carries an id.
    await expect(manualLogService.update({ ...target, log_id: 'legacy-1', body_html: '<p>b</p>' }, author)).rejects.toThrow(missing);
    await expect(manualLogService.update({ ...target, log_id: 'legacy-0', body_html: '<p>b</p>' }, author)).rejects.toThrow(missing);
    await expect(manualLogService.update({ ...target, log_id: 'legacy-x', body_html: '<p>b</p>' }, author)).rejects.toThrow(missing);
    expect(log.id).toBeTruthy();
  });
});

describe('manualLogService.remove', () => {
  it('keeps a deleted log as a placeholder, records NOTE_DELETED and refuses any later change', async () => {
    const author = await staff('Asha');
    const target = await hostLead();
    const log = await manualLogService.create({ ...target, summary: 'Plan', body_html: '<p>secret</p>' }, author);

    const removed = await manualLogService.remove({ ...target, log_id: log.id! }, author);

    expect(removed).toMatchObject({ id: log.id, is_deleted: true, summary: '', body_html: '', deleted_by: author.id });
    const lead = await crmService.getHostLead(target.entity_id);
    expect(lead!.activity_log.map((entry: { type: string }) => entry.type)).toEqual(['NOTE', 'NOTE_CREATED', 'NOTE_DELETED']);
    expect(lead!.activity_log[0]).toMatchObject({ is_deleted: true, body_html: '' });
    // The words stay in the database for the audit trail.
    const stored = await HostLeadModel.findById(target.entity_id).lean();
    expect(stored!.activity_log[0]).toMatchObject({ body_html: '<p>secret</p>' });
    await expect(manualLogService.remove({ ...target, log_id: log.id! }, author)).rejects.toThrow('This log was deleted');
    await expect(manualLogService.update({ ...target, log_id: log.id!, body_html: '<p>x</p>' }, author)).rejects.toThrow('This log was deleted');
  });
});

describe('leadLogsUrl', () => {
  it("opens the lead's Manual Logs tab in the CRM", () => {
    const url = new URL(leadLogsUrl('CREATOR_LEAD', 'abc'));
    expect(url.pathname).toBe('/creator-leads/abc/view');
    expect(url.searchParams.get('selectedtab')).toBe('manual-logs');
  });
});
