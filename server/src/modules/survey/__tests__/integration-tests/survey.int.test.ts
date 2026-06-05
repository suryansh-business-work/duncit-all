import { Types } from 'mongoose';
import { surveyService } from '../../survey.service';

const userId = new Types.ObjectId().toString();

describe('surveyService integration', () => {
  it('upserts a survey (assigns qids) and exposes it as active only when it has questions', async () => {
    expect(await surveyService.active('VENUE')).toBeNull();
    const saved = await surveyService.upsert(
      'VENUE',
      {
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
    expect(active!.questions).toHaveLength(3);
  });

  it('rejects MCQ without options', async () => {
    await expect(
      surveyService.upsert('HOST', { questions: [{ type: 'MCQ', label: 'Pick', options: [] }] })
    ).rejects.toThrow(/option/i);
  });

  it('submits one response per user/kind (upsert) and joins labels for admin', async () => {
    const survey = await surveyService.upsert('VENUE', {
      questions: [{ type: 'MCQ', label: 'Space type', options: ['Indoor', 'Outdoor'] }],
    });
    const mcq = survey!.questions.find((q) => q.type === 'MCQ')!;
    await surveyService.submit(userId, 'VENUE', [{ qid: mcq.qid, value: 'Indoor' }]);
    await surveyService.submit(userId, 'VENUE', [{ qid: mcq.qid, value: 'Outdoor' }]); // upsert

    const mine = await surveyService.myResponse(userId, 'VENUE');
    expect(mine!.answers).toHaveLength(1);
    expect(mine!.answers[0].value).toBe('Outdoor');

    const admin = await surveyService.userResponses(userId);
    const venue = admin.find((r) => r.kind === 'VENUE');
    expect(venue!.items[0]).toMatchObject({ label: 'Space type', answer: 'Outdoor' });
  });
});
