import type { LeadSurveyDef, LeadSurveyEntry, LeadSurveyQuestion } from '@/components/lead-survey/queries';

export const question = (overrides: Partial<LeadSurveyQuestion>): LeadSurveyQuestion => ({
  qid: 'q',
  type: 'TEXT',
  label: 'Question',
  help: null,
  required: false,
  multi: false,
  options: [],
  ...overrides,
});

/** A venue onboarding survey: two input sections plus one heading with nothing under it. */
export const venueSurvey: LeadSurveyDef = {
  id: 'survey-venue',
  title: 'Venue onboarding',
  questions: [
    question({ qid: 's1', type: 'SECTION', label: 'About the venue', help: 'Tell us the basics' }),
    question({ qid: 'q1', type: 'TEXT', label: 'Venue name', required: true }),
    question({ qid: 'q2', type: 'MCQ', label: 'Amenities', help: 'Pick all that apply', required: true, multi: true, options: ['Parking', 'Wi-Fi'] }),
    question({ qid: 's2', type: 'SECTION', label: '' }),
    question({ qid: 'q3', type: 'MCQ', label: 'Indoor or outdoor', options: ['Indoor', 'Outdoor'] }),
    question({ qid: 'q4', type: 'TEXTAREA', label: 'Anything else' }),
    question({ qid: 's3', type: 'SECTION', label: 'Photos' }),
  ],
};

export const entry = (overrides: Partial<LeadSurveyEntry>): LeadSurveyEntry => ({
  id: 'entry-1',
  survey_id: 'survey-venue',
  source: 'MANUAL',
  token: null,
  token_revoked: false,
  generated_by: null,
  answers: [],
  filled: false,
  submitted_at: null,
  submitted_by: null,
  created_at: '2026-09-10T09:30:00.000Z',
  ...overrides,
});
