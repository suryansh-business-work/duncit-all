import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import {
  COMPLETE_OUTREACH_TASK,
  DRAFT_SEQUENCE_STEP,
  ENROLL_LEADS,
  OUTREACH_ENROLL_COUNT,
  OUTREACH_SEQUENCES,
  OUTREACH_TASKS,
  OUTREACH_WA_TEMPLATES,
  PAUSE_ENROLLMENT,
  REMOVE_ENROLLMENT,
  RESUME_ENROLLMENT,
  SAVE_OUTREACH_SEQUENCE,
  SET_OUTREACH_SEQUENCE_ACTIVE,
  type OutreachDraft,
  type OutreachEnrollResult,
  type OutreachEnrollment,
  type OutreachHistoryEntry,
  type OutreachLeadFilter,
  type OutreachSequence,
  type OutreachSequenceInput,
  type OutreachStep,
  type OutreachTask,
  type OutreachWaTemplate,
} from '../../src/pages/outreach-page/queries';

export const makeOutreachStep = (over: Partial<OutreachStep> = {}): OutreachStep => ({
  kind: 'EMAIL',
  wait_days: 0,
  subject: 'Hello {name}',
  body: 'Hi {name}, Duncit would love to host pods at {company}.',
  wa_template_key: '',
  wa_params: [],
  ...over,
});

export const makeOutreachSequence = (over: Partial<OutreachSequence> = {}): OutreachSequence => ({
  id: 'seq1',
  name: 'Venue intro',
  description: 'First touch for new venues',
  pipeline: 'VENUE',
  steps: [
    makeOutreachStep(),
    makeOutreachStep({ kind: 'WAIT', wait_days: 3, subject: '', body: '' }),
    makeOutreachStep({ kind: 'WHATSAPP', subject: '', body: '', wa_template_key: 'venue_intro', wa_params: ['{name}'] }),
    makeOutreachStep({ kind: 'DM_TASK', subject: '', body: 'Hey {name}!' }),
  ],
  daily_limit: 40,
  quiet_start_hour: 21,
  quiet_end_hour: 9,
  stop_on_reply: true,
  active: false,
  counts: { total: 6, active: 3, paused: 1, replied: 1, opted_out: 0, done: 1, failed: 0 },
  sent_today: 5,
  created_by: 'u1',
  updated_by: 'u1',
  created_at: '2026-10-30T09:00:00.000Z',
  updated_at: '2026-10-31T09:00:00.000Z',
  ...over,
});

export const makeOutreachHistory = (over: Partial<OutreachHistoryEntry> = {}): OutreachHistoryEntry => ({
  at: '2026-10-31T09:00:00.000Z',
  kind: 'SENT',
  step_index: 0,
  text: 'Email "Hello Blue Cafe" sent',
  ...over,
});

export const makeOutreachEnrollment = (over: Partial<OutreachEnrollment> = {}): OutreachEnrollment => ({
  id: 'en1',
  sequence_id: 'seq1',
  sequence_name: 'Venue intro',
  lead_id: 'l1',
  lead_name: 'Blue Cafe',
  lead_company: 'Blue Cafe Pvt',
  step_index: 2,
  step_count: 4,
  next_at: '2026-11-03T09:00:00.000Z',
  status: 'ACTIVE',
  error: '',
  history: [makeOutreachHistory({ kind: 'ENROLLED', step_index: -1, text: '' }), makeOutreachHistory()],
  created_at: '2026-10-31T08:00:00.000Z',
  updated_at: '2026-10-31T09:00:00.000Z',
  ...over,
});

export const makeOutreachTask = (over: Partial<OutreachTask> = {}): OutreachTask => ({
  id: 't1',
  sequence_id: 'seq1',
  sequence_name: 'Venue intro',
  enrollment_id: 'en1',
  lead_id: 'l1',
  lead_name: 'Blue Cafe',
  lead_instagram_handle: 'bluecafe',
  lead_instagram_url: 'https://www.instagram.com/bluecafe/',
  step_index: 3,
  text: 'Hey Blue Cafe!',
  status: 'OPEN',
  owner_user_id: 'u1',
  owner_name: 'Asha Rao',
  done_by_name: '',
  done_at: null,
  created_at: '2026-10-31T10:00:00.000Z',
  ...over,
});

export const makeWaTemplate = (over: Partial<OutreachWaTemplate> = {}): OutreachWaTemplate => ({
  key: 'venue_intro',
  description: 'Venue intro with the owner name',
  template_name: 'venue_intro_v2',
  status: 'APPROVED',
  approved: true,
  param_count: 1,
  body: 'Hi {{1}}, Duncit here.',
  ...over,
});

/** Each object as the server sends it: with its GraphQL type name. */
export const typedSequence = (sequence: OutreachSequence) => ({
  __typename: 'OutreachSequence',
  ...sequence,
  steps: sequence.steps.map((step) => ({ __typename: 'OutreachStep', ...step })),
  counts: { __typename: 'OutreachSequenceCounts', ...sequence.counts },
});

export const typedEnrollment = (enrollment: OutreachEnrollment) => ({
  __typename: 'OutreachEnrollment',
  ...enrollment,
  history: enrollment.history.map((entry) => ({ __typename: 'OutreachHistoryEntry', ...entry })),
});

export const typedTask = (task: OutreachTask) => ({ __typename: 'OutreachTask', ...task });

const rejection = (message: string) => ({ result: { errors: [new GraphQLError(message)] } });

export const outreachSequencesMock = (sequences: OutreachSequence[], uses = 1): MockedResponse => ({
  request: { query: OUTREACH_SEQUENCES },
  result: { data: { outreachSequences: sequences.map(typedSequence) } },
  maxUsageCount: uses,
});

export const outreachSequencesErrorMock = (message: string): MockedResponse => ({ request: { query: OUTREACH_SEQUENCES }, ...rejection(message) });

export const waTemplatesMock = (templates: OutreachWaTemplate[]): MockedResponse => ({
  request: { query: OUTREACH_WA_TEMPLATES },
  result: { data: { outreachWaTemplates: templates.map((row) => ({ __typename: 'OutreachWaTemplate', ...row })) } },
});

export const waTemplatesErrorMock = (message: string): MockedResponse => ({ request: { query: OUTREACH_WA_TEMPLATES }, ...rejection(message) });

export const saveSequenceMock = (id: string | null, input: OutreachSequenceInput, saved: OutreachSequence): MockedResponse => ({
  request: { query: SAVE_OUTREACH_SEQUENCE, variables: { id, input } },
  result: { data: { saveOutreachSequence: typedSequence(saved) } },
});

export const saveSequenceErrorMock = (id: string | null, input: OutreachSequenceInput, message: string): MockedResponse => ({
  request: { query: SAVE_OUTREACH_SEQUENCE, variables: { id, input } },
  ...rejection(message),
});

export const setSequenceActiveMock = (sequence: OutreachSequence, active: boolean): MockedResponse => ({
  request: { query: SET_OUTREACH_SEQUENCE_ACTIVE, variables: { id: sequence.id, active } },
  result: { data: { setOutreachSequenceActive: typedSequence({ ...sequence, active }) } },
});

export const setSequenceActiveErrorMock = (id: string, active: boolean, message: string): MockedResponse => ({
  request: { query: SET_OUTREACH_SEQUENCE_ACTIVE, variables: { id, active } },
  ...rejection(message),
});

export const enrollCountMock = (sequenceId: string, filter: OutreachLeadFilter, count: number, uses = 1): MockedResponse => ({
  request: { query: OUTREACH_ENROLL_COUNT, variables: { sequence_id: sequenceId, filter } },
  result: { data: { outreachEnrollCount: count } },
  maxUsageCount: uses,
});

export const enrollCountErrorMock = (sequenceId: string, filter: OutreachLeadFilter, message: string): MockedResponse => ({
  request: { query: OUTREACH_ENROLL_COUNT, variables: { sequence_id: sequenceId, filter } },
  ...rejection(message),
});

export const enrollLeadsMock = (sequenceId: string, filter: OutreachLeadFilter, result: OutreachEnrollResult): MockedResponse => ({
  request: { query: ENROLL_LEADS, variables: { sequence_id: sequenceId, filter } },
  result: { data: { enrollLeads: { __typename: 'OutreachEnrollResult', ...result } } },
});

export const enrollLeadsErrorMock = (sequenceId: string, filter: OutreachLeadFilter, message: string): MockedResponse => ({
  request: { query: ENROLL_LEADS, variables: { sequence_id: sequenceId, filter } },
  ...rejection(message),
});

export const pauseEnrollmentMock = (enrollment: OutreachEnrollment): MockedResponse => ({
  request: { query: PAUSE_ENROLLMENT, variables: { id: enrollment.id } },
  result: { data: { pauseEnrollment: typedEnrollment({ ...enrollment, status: 'PAUSED' }) } },
});

export const resumeEnrollmentMock = (enrollment: OutreachEnrollment): MockedResponse => ({
  request: { query: RESUME_ENROLLMENT, variables: { id: enrollment.id } },
  result: { data: { resumeEnrollment: typedEnrollment({ ...enrollment, status: 'ACTIVE' }) } },
});

export const resumeEnrollmentErrorMock = (id: string, message: string): MockedResponse => ({
  request: { query: RESUME_ENROLLMENT, variables: { id } },
  ...rejection(message),
});

export const removeEnrollmentMock = (id: string): MockedResponse => ({
  request: { query: REMOVE_ENROLLMENT, variables: { id } },
  result: { data: { removeEnrollment: true } },
});

export const outreachTasksMock = (tasks: OutreachTask[], uses = 1): MockedResponse => ({
  request: { query: OUTREACH_TASKS },
  result: { data: { outreachTasks: tasks.map(typedTask) } },
  maxUsageCount: uses,
});

export const outreachTasksErrorMock = (message: string): MockedResponse => ({ request: { query: OUTREACH_TASKS }, ...rejection(message) });

export const completeTaskMock = (task: OutreachTask): MockedResponse => ({
  request: { query: COMPLETE_OUTREACH_TASK, variables: { id: task.id, note: null } },
  result: { data: { completeOutreachTask: typedTask({ ...task, status: 'DONE', done_by_name: 'Asha Rao', done_at: '2026-10-31T11:00:00.000Z' }) } },
});

export const completeTaskErrorMock = (id: string, message: string): MockedResponse => ({
  request: { query: COMPLETE_OUTREACH_TASK, variables: { id, note: null } },
  ...rejection(message),
});

export const draftStepMock = (sequenceId: string, stepIndex: number, draft: OutreachDraft): MockedResponse => ({
  request: { query: DRAFT_SEQUENCE_STEP, variables: { sequence_id: sequenceId, step_index: stepIndex, lead_id: null } },
  result: { data: { draftSequenceStep: { __typename: 'OutreachDraft', ...draft } } },
});

export const draftStepErrorMock = (sequenceId: string, stepIndex: number, message: string): MockedResponse => ({
  request: { query: DRAFT_SEQUENCE_STEP, variables: { sequence_id: sequenceId, step_index: stepIndex, lead_id: null } },
  ...rejection(message),
});
