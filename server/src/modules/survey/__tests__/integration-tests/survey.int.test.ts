import { Types } from 'mongoose';
import { surveyService } from '../../survey.service';
import { leadSurveyService } from '../../leadSurvey.service';
import { VenueLeadModel, HostLeadModel } from '../../../crm/crm/crm.model';
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

  it('matchedUserForLead links a lead contact to a Duncit user by email', async () => {
    const user = await mkUser('lead@example.com');
    const lead = await VenueLeadModel.create({ venue_name: 'V', city: 'P', full_address: '1', contacts: [{ email: 'lead@example.com' }] });
    const match = await leadSurveyService.matchedUserForLead(lead.toObject());
    expect(match).toMatchObject({ user_id: String(user._id), matched_on: 'EMAIL' });
  });
});
