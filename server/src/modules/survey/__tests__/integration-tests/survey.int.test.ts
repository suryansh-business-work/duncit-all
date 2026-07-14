import { Types } from 'mongoose';
import { surveyService } from '../../survey.service';
import { leadSurveyService } from '../../leadSurvey.service';
import { VenueLeadModel, HostLeadModel, EcommLeadModel } from '../../../crm/crm/crm.model';
import { UserModel } from '../../../access/user/user.model';

const mkUser = (email: string, phone?: string) =>
  UserModel.create({
    auth: { email, phone: phone ? { number: phone, extension: '+91' } : undefined },
    profile: { first_name: 'Asha', last_name: 'K' },
  });

const userId = new Types.ObjectId().toString();
const superA = new Types.ObjectId().toString();
const superB = new Types.ObjectId().toString();
const catA = new Types.ObjectId().toString();

describe('surveyService integration', () => {
  it('creates a survey (assigns qids) and exposes it as the kind default only when it has questions', async () => {
    expect(await surveyService.active('VENUE')).toBeNull();
    const saved = await surveyService.create(
      {
        kind: 'VENUE',
        title: 'Venue onboarding',
        questions: [
          { type: 'SECTION', label: 'About your space' },
          { type: 'MCQ', label: 'Space type', options: ['Indoor', 'Outdoor'], required: true },
          { type: 'TEXT', label: 'Venue name' },
        ],
      },
      userId
    );
    expect(saved!.questions).toHaveLength(3);
    expect(saved!.questions[1].qid).toBeTruthy();
    const active = await surveyService.active('VENUE');
    expect(active!.id).toBe(saved!.id);
    expect(active!.questions).toHaveLength(3);
  });

  it('rejects MCQ without options', async () => {
    await expect(
      surveyService.create({ kind: 'HOST', questions: [{ type: 'MCQ', label: 'Pick', options: [] }] })
    ).rejects.toThrow(/option/i);
  });

  it('one survey per exact slot — duplicate slot is rejected', async () => {
    await surveyService.create({ kind: 'HOST', super_category_id: superA, questions: [{ type: 'TEXT', label: 'Q' }] });
    await expect(
      surveyService.create({ kind: 'HOST', super_category_id: superA, questions: [{ type: 'TEXT', label: 'Q2' }] })
    ).rejects.toThrow(/already exists/i);
  });

  it('activeFor picks the most specific match and falls back', async () => {
    await surveyService.create({ kind: 'VENUE', title: 'default', questions: [{ type: 'TEXT', label: 'default' }] });
    await surveyService.create({ kind: 'VENUE', super_category_id: superB, questions: [{ type: 'TEXT', label: 'super' }] });
    await surveyService.create({
      kind: 'VENUE',
      super_category_id: superB,
      category_id: catA,
      questions: [{ type: 'TEXT', label: 'super+cat' }],
    });

    // Exact super+category → the more specific survey.
    const specific = await surveyService.activeFor({ kind: 'VENUE', super_category_id: superB, category_id: catA });
    expect(specific!.questions[0].label).toBe('super+cat');

    // Super only → the super-scoped survey.
    const superOnly = await surveyService.activeFor({ kind: 'VENUE', super_category_id: superB });
    expect(superOnly!.questions[0].label).toBe('super');

    // Unknown super → kind default (all scope null).
    const fallback = await surveyService.activeFor({ kind: 'VENUE', super_category_id: new Types.ObjectId().toString() });
    expect(fallback!.title).toBe('default');
  });

  it('serves the surveysTable page with search, filters, sort and paging', async () => {
    await surveyService.create({ kind: 'VENUE', title: 'Venue basics', questions: [{ type: 'TEXT', label: 'Q' }] });
    await surveyService.create({
      kind: 'HOST',
      title: 'Host basics',
      super_category_id: superA,
      questions: [{ type: 'TEXT', label: 'Q' }],
    });
    await surveyService.create({
      kind: 'ECOMM',
      title: 'Seller extras',
      is_active: false,
      questions: [{ type: 'TEXT', label: 'Q' }],
    });

    // Plain envelope with clamp defaults.
    const all = await surveyService.table();
    expect(all.total).toBe(3);
    expect(all.rows).toHaveLength(3);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search matches the title (same field as the surveys(search:) arg).
    const searched = await surveyService.table({ search: 'basics' });
    expect(searched.total).toBe(2);

    // Enum + scope + boolean filters narrow.
    const hosts = await surveyService.table({ filters: [{ field: 'kind', op: 'eq', value: 'HOST' }] });
    expect(hosts.rows.map((s) => s!.title)).toEqual(['Host basics']);
    expect(hosts.rows[0]!.super_category_id).toBe(superA);
    const scoped = await surveyService.table({
      filters: [{ field: 'super_category_id', op: 'eq', value: superA }],
    });
    expect(scoped.rows.map((s) => s!.title)).toEqual(['Host basics']);
    const active = await surveyService.table({ filters: [{ field: 'is_active', op: 'is_true' }] });
    expect(active.total).toBe(2);

    // Allowlisted sort + paging keep the total and report the clamped page back.
    const asc = await surveyService.table({ sort_by: 'title', sort_dir: 'asc' });
    expect(asc.rows.map((s) => s!.title)).toEqual(['Host basics', 'Seller extras', 'Venue basics']);
    const page2 = await surveyService.table({ sort_by: 'title', sort_dir: 'asc', page: 2, page_size: 1 });
    expect(page2.rows.map((s) => s!.title)).toEqual(['Seller extras']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('submits one response per user/survey (upsert) and joins labels for admin', async () => {
    const survey = await surveyService.create({
      kind: 'VENUE',
      category_id: new Types.ObjectId().toString(),
      questions: [{ type: 'MCQ', label: 'Space type', options: ['Indoor', 'Outdoor'] }],
    });
    const mcq = survey!.questions.find((q) => q.type === 'MCQ')!;
    await surveyService.submit(userId, survey!.id, [{ qid: mcq.qid, value: 'Indoor' }]);
    await surveyService.submit(userId, survey!.id, [{ qid: mcq.qid, value: 'Outdoor' }]); // upsert

    const mine = await surveyService.myResponse(userId, survey!.id);
    expect(mine!.answers).toHaveLength(1);
    expect(mine!.answers[0].value).toBe('Outdoor');

    const admin = await surveyService.userResponses(userId);
    const item = admin.flatMap((r) => r.items).find((i) => i.label === 'Space type');
    expect(item).toMatchObject({ label: 'Space type', answer: 'Outdoor' });
  });
});

describe('leadSurveyService integration', () => {
  const venueWith = async () => {
    const survey = await surveyService.create({ kind: 'VENUE', super_category_id: superA, questions: [{ type: 'TEXT', label: 'Stage size' }] });
    const lead = await VenueLeadModel.create({ super_category_id: new Types.ObjectId(superA), venue_name: 'Test Hall', city: 'Pune', full_address: '1 Road' });
    return { survey: survey!, lead };
  };

  it('matches the survey and logs a MANUAL entry on manual save', async () => {
    const { survey, lead } = await venueWith();
    const generated = await leadSurveyService.forLead('VENUE_LEAD', String(lead._id));
    expect(generated.survey!.id).toBe(survey.id);
    expect(generated.entries).toHaveLength(0);

    const qid = generated.survey!.questions[0].qid;
    await leadSurveyService.saveManual('VENUE_LEAD', String(lead._id), survey.id, [{ qid, value: 'Large' }], 'staff-1');

    const after = await leadSurveyService.forLead('VENUE_LEAD', String(lead._id));
    expect(after.entries).toHaveLength(1);
    expect(after.entries[0]).toMatchObject({ source: 'MANUAL', filled: true, submitted_by: 'staff-1' });
    expect(after.entries[0].answers[0]).toMatchObject({ qid, value: 'Large' });
  });

  it('serves a lead-scoped entries table without leaking another lead (leadSurveyEntriesTable)', async () => {
    const { survey, lead } = await venueWith();
    const otherLead = await VenueLeadModel.create({
      super_category_id: new Types.ObjectId(superA),
      venue_name: 'Other Hall',
      city: 'Pune',
      full_address: '2 Road',
    });
    const qid = survey.questions[0].qid;
    await leadSurveyService.saveManual('VENUE_LEAD', String(lead._id), survey.id, [{ qid, value: 'A' }], 'staff-1');
    await leadSurveyService.generateLink('VENUE_LEAD', String(lead._id), survey.id, 'staff-2');
    await leadSurveyService.saveManual('VENUE_LEAD', String(otherLead._id), survey.id, [{ qid, value: 'B' }], 'staff-9');

    // SCOPE: only this lead's entries — the other lead's rows never appear.
    const page = await leadSurveyService.entriesTable('VENUE_LEAD', String(lead._id));
    expect(page.total).toBe(2);
    expect(page.rows.map((e) => e.generated_by)).toEqual(['staff-2', 'staff-1']); // created_at desc
    expect(page.page).toBe(1);
    expect(page.page_size).toBe(25);

    // ...and client filters cannot widen the baseFilter scope.
    const widened = await leadSurveyService.entriesTable('VENUE_LEAD', String(lead._id), {
      filters: [{ field: 'source', op: 'in', values: ['MANUAL', 'LINK', 'APP'] }],
    });
    expect(widened.total).toBe(2);

    // Search matches generated_by/submitted_by.
    const searched = await leadSurveyService.entriesTable('VENUE_LEAD', String(lead._id), { search: 'staff-1' });
    expect(searched.rows.map((e) => e.source)).toEqual(['MANUAL']);

    // Boolean + enum filters narrow.
    const filled = await leadSurveyService.entriesTable('VENUE_LEAD', String(lead._id), {
      filters: [{ field: 'filled', op: 'is_true' }],
    });
    expect(filled.rows.map((e) => e.source)).toEqual(['MANUAL']);
    const links = await leadSurveyService.entriesTable('VENUE_LEAD', String(lead._id), {
      filters: [{ field: 'source', op: 'eq', value: 'LINK' }],
    });
    expect(links.rows.map((e) => e.generated_by)).toEqual(['staff-2']);

    // Allowlisted sort + paging keep the total and clamp report (LINK < MANUAL asc).
    const asc = await leadSurveyService.entriesTable('VENUE_LEAD', String(lead._id), {
      sort_by: 'source',
      sort_dir: 'asc',
      page: 2,
      page_size: 1,
    });
    expect(asc.rows.map((e) => e.generated_by)).toEqual(['staff-1']);
    expect(asc.total).toBe(2);
    expect(asc.page).toBe(2);
    expect(asc.page_size).toBe(1);

    // An unknown lead is a NOT_FOUND, not an empty page.
    await expect(
      leadSurveyService.entriesTable('VENUE_LEAD', new Types.ObjectId().toString())
    ).rejects.toThrow(/not found/i);
  });

  it('generates a public link, fills it by token, then revoking kills it', async () => {
    const { survey, lead } = await venueWith();
    const link = await leadSurveyService.generateLink('VENUE_LEAD', String(lead._id), survey.id, 'staff-1');
    expect(link.token).toBeTruthy();
    expect(link.filled).toBe(false);

    const pub = await leadSurveyService.byToken(link.token!);
    expect(pub.survey!.id).toBe(survey.id);
    expect(pub.lead_name).toBe('Test Hall');
    expect(pub.already_filled).toBe(false);

    const qid = pub.survey!.questions[0].qid;
    await leadSurveyService.submitByToken(link.token!, [{ qid, value: 'Public answer' }]);

    const after = await leadSurveyService.forLead('VENUE_LEAD', String(lead._id));
    const entry = after.entries.find((e) => e.source === 'LINK')!;
    expect(entry).toMatchObject({ filled: true, submitted_by: 'external' });

    await leadSurveyService.revokeLink(link.id);
    await expect(leadSurveyService.byToken(link.token!)).rejects.toThrow(/invalid|revoked/i);
  });

  it('syncFromGate creates a host lead + APP entry from the user survey response', async () => {
    const user = await mkUser('host@example.com', '9990001112');
    const survey = await surveyService.create({ kind: 'HOST', super_category_id: superA, questions: [{ type: 'TEXT', label: 'Org' }] });
    const qid = survey!.questions[0].qid;
    await surveyService.submit(String(user._id), survey!.id, [{ qid, value: 'My Org' }]);

    await leadSurveyService.syncFromGate(String(user._id), 'HOST');

    const lead: any = await HostLeadModel.findOne({ 'contacts.email': 'host@example.com' }).lean();
    expect(lead).toBeTruthy();
    const forLead = await leadSurveyService.forLead('HOST_LEAD', String(lead._id));
    expect(forLead.entries).toHaveLength(1);
    expect(forLead.entries[0]).toMatchObject({ source: 'APP', filled: true });
    expect(forLead.entries[0].answers[0]).toMatchObject({ qid, value: 'My Org' });
  });

  it('syncFromGate creates an ecomm lead + APP entry from the user survey response', async () => {
    const user = await mkUser('seller@example.com', '9990002223');
    const survey = await surveyService.create({ kind: 'ECOMM', super_category_id: superA, questions: [{ type: 'TEXT', label: 'Brand' }] });
    const qid = survey!.questions[0].qid;
    await surveyService.submit(String(user._id), survey!.id, [{ qid, value: 'My Brand' }]);

    await leadSurveyService.syncFromGate(String(user._id), 'ECOMM');

    const lead: any = await EcommLeadModel.findOne({ 'contacts.email': 'seller@example.com' }).lean();
    expect(lead).toBeTruthy();
    expect(lead.seller_name).toBeTruthy();
    const forLead = await leadSurveyService.forLead('ECOMM_LEAD', String(lead._id));
    expect(forLead.entries).toHaveLength(1);
    expect(forLead.entries[0]).toMatchObject({ source: 'APP', filled: true });
    expect(forLead.entries[0].answers[0]).toMatchObject({ qid, value: 'My Brand' });
  });

  it('matchedUserForLead links a lead contact to a Duncit user by email', async () => {
    const user = await mkUser('lead@example.com');
    const lead = await VenueLeadModel.create({ venue_name: 'V', city: 'P', full_address: '1', contacts: [{ email: 'lead@example.com' }] });
    const match = await leadSurveyService.matchedUserForLead(lead.toObject());
    expect(match).toMatchObject({ user_id: String(user._id), matched_on: 'EMAIL' });
  });
});
