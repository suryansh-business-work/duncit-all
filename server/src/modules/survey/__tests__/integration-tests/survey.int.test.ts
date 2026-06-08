import { Types } from 'mongoose';
import { surveyService } from '../../survey.service';
import { leadSurveyService } from '../../leadSurvey.service';
import { VenueLeadModel } from '../../../crm/crm/crm.model';

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
  it('generates the matching survey for a lead and saves a response on it', async () => {
    const survey = await surveyService.create({
      kind: 'VENUE',
      super_category_id: superA,
      questions: [{ type: 'TEXT', label: 'Stage size' }],
    });
    const lead = await VenueLeadModel.create({
      super_category_id: new Types.ObjectId(superA),
      venue_name: 'Test Hall',
      city: 'Pune',
      full_address: '1 Road',
    });

    const generated = await leadSurveyService.forLead('VENUE_LEAD', String(lead._id));
    expect(generated.survey!.id).toBe(survey!.id);
    expect(generated.response).toBeNull();

    const qid = generated.survey!.questions[0].qid;
    await leadSurveyService.save('VENUE_LEAD', String(lead._id), survey!.id, [{ qid, value: 'Large' }], 'staff-1');

    const after = await leadSurveyService.forLead('VENUE_LEAD', String(lead._id));
    expect(after.response!.answers[0]).toMatchObject({ qid, value: 'Large' });
    expect(after.response!.submitted_by).toBe('staff-1');
  });
});
