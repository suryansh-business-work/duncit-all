/**
 * An inbound email filed in each of the three queues, against a real database:
 * who the sender is (a member, or a stranger), what is clamped before it
 * reaches a model that would refuse it, and which category an emailed report
 * lands in.
 */
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { TicketModel } from '@modules/support/ticket/ticket.model';
import { GrievanceTicketModel } from '@modules/content/grievance/grievanceTicket.model';
import { FeedbackReportModel, ReportProblemConfigModel } from '@modules/support/feedback/feedback.model';
import { openTicketForEmail, type InboundEmail } from '../../mailAutomation.tickets';

const email = (over: Partial<InboundEmail> = {}): InboundEmail => ({
  fromEmail: 'Asha.Rao@Example.com',
  fromName: 'Asha Rao',
  subject: 'Where is my refund',
  bodyText: 'I booked a pod and could not attend.',
  ...over,
});

const member = (profile: Record<string, unknown> = { first_name: 'Asha', last_name: 'Rao' }) =>
  UserModel.create({ auth: { email: 'asha.rao@example.com' }, profile });

describe('support tickets', () => {
  it('opens a ticket from a stranger, carrying the sender as a guest (address lower-cased) and the message as the first line', async () => {
    const opened = await openTicketForEmail('SUPPORT', email());
    expect(opened.ticket_no).toMatch(/^ST-/);
    const ticket = await TicketModel.findById(opened.ticket_id).lean();
    expect(ticket).toMatchObject({
      user_id: null, source: 'EMAIL', guest_name: 'Asha Rao', guest_email: 'asha.rao@example.com',
      subject: 'Where is my refund', category: 'GENERAL', status: 'OPEN',
    });
    expect(ticket?.messages).toHaveLength(1);
    expect(ticket?.messages[0]).toMatchObject({ author_role: 'USER', body_text: 'I booked a pod and could not attend.' });
    expect(String(ticket?.messages[0].author_id)).not.toBe('');
  });

  it('links the ticket and its first message to the member whose address wrote in, whatever the case', async () => {
    const asha = await member();
    const opened = await openTicketForEmail('SUPPORT', email());
    const ticket = await TicketModel.findById(opened.ticket_id).lean();
    expect(String(ticket?.user_id)).toBe(String(asha._id));
    expect(String(ticket?.messages[0].author_id)).toBe(String(asha._id));
  });

  it('names the sender from the account when the mail carries no display name, else from the address', async () => {
    await member();
    const fromAccount = await openTicketForEmail('SUPPORT', email({ fromName: '' }));
    expect((await TicketModel.findById(fromAccount.ticket_id).lean())?.guest_name).toBe('Asha Rao');
    await UserModel.deleteMany({});
    await UserModel.collection.insertOne({ auth: { email: 'asha.rao@example.com' } });
    const bare = await openTicketForEmail('SUPPORT', email({ fromName: '' }));
    expect((await TicketModel.findById(bare.ticket_id).lean())?.guest_name).toBe('Asha.Rao@Example.com');
    await UserModel.deleteMany({});
    await member({ first_name: 'Asha' });
    const firstOnly = await openTicketForEmail('SUPPORT', email({ fromName: '' }));
    expect((await TicketModel.findById(firstOnly.ticket_id).lean())?.guest_name).toBe('Asha');
  });

  it('gives a subject-less mail a subject, and cuts a long subject and name at what the model accepts', async () => {
    const none = await openTicketForEmail('SUPPORT', email({ subject: '   ' }));
    expect((await TicketModel.findById(none.ticket_id).lean())?.subject).toBe('Message by email');
    const long = await openTicketForEmail('SUPPORT', email({ subject: 's'.repeat(400), fromName: 'n'.repeat(300) }));
    const stored = await TicketModel.findById(long.ticket_id).lean();
    expect(stored?.subject).toHaveLength(200);
    expect(stored?.guest_name).toHaveLength(120);
  });
});

describe('grievances', () => {
  it('files a grievance with its number, the sender and a description', async () => {
    const opened = await openTicketForEmail('GRIEVANCE', email());
    expect(opened.ticket_no).toMatch(/^GRV/);
    expect(await GrievanceTicketModel.findById(opened.ticket_id).lean()).toMatchObject({
      user_id: null, source: 'EMAIL', name: 'Asha Rao', email: 'asha.rao@example.com', phone: '',
      subject: 'Where is my refund', description: 'I booked a pod and could not attend.', status: 'RECEIVED',
    });
  });

  it('links a member, and says plainly when the mail had no text or no subject', async () => {
    const asha = await member();
    const opened = await openTicketForEmail('GRIEVANCE', email({ bodyText: '  ', subject: '' }));
    const stored = await GrievanceTicketModel.findById(opened.ticket_id).lean();
    expect(String(stored?.user_id)).toBe(String(asha._id));
    expect(stored?.subject).toBe('Grievance received by email');
    expect(stored?.description).toContain('carried no readable text');
  });

  it('cuts a six-thousand-character complaint at the five thousand the model allows', async () => {
    const opened = await openTicketForEmail('GRIEVANCE', email({ bodyText: 'c'.repeat(6000) }));
    expect((await GrievanceTicketModel.findById(opened.ticket_id).lean())?.description).toHaveLength(5000);
  });
});

describe('problem reports', () => {
  const seedConfig = (categories: Array<Record<string, unknown>>) =>
    ReportProblemConfigModel.create({ singleton_key: 'report_problem', categories });

  it('files under OTHER when Support keeps one, matching its key in any case', async () => {
    await seedConfig([
      { key: 'BUG', label: 'Bug', sort_order: 1 },
      { key: 'other', label: 'Other', sort_order: 2 },
      { key: 'LATE', label: 'Late', sort_order: 3 },
    ]);
    const opened = await openTicketForEmail('REPORT_PROBLEM', email());
    expect(opened.ticket_no).toMatch(/^DUN-RPT-/);
    expect(await FeedbackReportModel.findById(opened.ticket_id).lean()).toMatchObject({
      category: 'other', user_id: null, user_name: 'Asha Rao', user_email: 'Asha.Rao@Example.com', platform: 'email',
      source_screen: 'Mail Automation', status: 'OPEN', message: 'Where is my refund\n\nI booked a pod and could not attend.',
    });
  });

  it('files under the last active category by sort order when there is no OTHER, skipping inactive ones', async () => {
    await seedConfig([
      { key: 'LAST', label: 'Last', sort_order: 9, is_active: false },
      { key: 'SECOND', label: 'Second', sort_order: 5 },
      { key: 'FIRST', label: 'First', sort_order: 1 },
    ]);
    const opened = await openTicketForEmail('REPORT_PROBLEM', email());
    expect((await FeedbackReportModel.findById(opened.ticket_id).lean())?.category).toBe('SECOND');
  });

  it('falls back to OTHER when nothing is configured, or when nothing is active, or when the config has no list', async () => {
    const none = await openTicketForEmail('REPORT_PROBLEM', email());
    expect((await FeedbackReportModel.findById(none.ticket_id).lean())?.category).toBe('OTHER');
    await seedConfig([{ key: 'OFF', label: 'Off', is_active: false }]);
    const inactive = await openTicketForEmail('REPORT_PROBLEM', email());
    expect((await FeedbackReportModel.findById(inactive.ticket_id).lean())?.category).toBe('OTHER');
    await ReportProblemConfigModel.deleteMany({});
    await ReportProblemConfigModel.collection.insertOne({ singleton_key: 'report_problem' });
    const bare = await openTicketForEmail('REPORT_PROBLEM', email());
    expect((await FeedbackReportModel.findById(bare.ticket_id).lean())?.category).toBe('OTHER');
  });

  it('keeps the subject as context, links a member, and still says something for an empty mail', async () => {
    const asha = await member();
    const subjectOnly = await openTicketForEmail('REPORT_PROBLEM', email({ bodyText: '' }));
    const a = await FeedbackReportModel.findById(subjectOnly.ticket_id).lean();
    expect(a?.message).toBe('Where is my refund');
    expect(String(a?.user_id)).toBe(String(asha._id));
    const bodyOnly = await openTicketForEmail('REPORT_PROBLEM', email({ subject: '' }));
    expect((await FeedbackReportModel.findById(bodyOnly.ticket_id).lean())?.message).toBe('I booked a pod and could not attend.');
    const empty = await openTicketForEmail('REPORT_PROBLEM', email({ subject: '', bodyText: '' }));
    expect((await FeedbackReportModel.findById(empty.ticket_id).lean())?.message).toContain('carried no readable text');
  });

  it('does not collide on ids across calls', async () => {
    const [a, b] = await Promise.all([openTicketForEmail('REPORT_PROBLEM', email()), openTicketForEmail('REPORT_PROBLEM', email())]);
    expect(a.ticket_no).not.toBe(b.ticket_no);
    expect(Types.ObjectId.isValid(String(a.ticket_id))).toBe(true);
  });
});
