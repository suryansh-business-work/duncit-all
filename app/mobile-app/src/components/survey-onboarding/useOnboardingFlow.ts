import { useState } from 'react';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import {
  ActiveSurveyForDocument,
  RequestMeetingDocument,
  SubmitSurveyResponseDocument,
  type ActiveSurvey,
  type ActiveSurveyResult,
  type SurveyAnswerInput,
  type SurveyKind,
  type SurveyQuestion,
} from '@/graphql/onboarding-survey';

export type Phase = 'category' | 'survey' | 'meeting' | 'done';
export type Answer = { value: string; values: string[] };
export interface Scope {
  super_category_id: string;
  category_id: string;
  sub_category_id: string;
}

/** State machine for the category → survey → meeting onboarding gate. */
export function useOnboardingFlow(kind: SurveyKind) {
  // Always walk the full gate — category → survey (when one matches) →
  // meeting — even when a meeting was requested before: requestMeeting
  // upserts per (user, kind), so re-submitting only updates the request.
  const [phase, setPhase] = useState<Phase>('category');
  const [survey, setSurvey] = useState<ActiveSurvey | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [when, setWhen] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const get = (qid: string): Answer => answers[qid] ?? { value: '', values: [] };
  const set = (qid: string, patch: Partial<Answer>) =>
    setAnswers((a) => ({ ...a, [qid]: { ...get(qid), ...patch } }));
  const toggle = (q: SurveyQuestion, opt: string) => {
    const cur = get(q.qid).values;
    set(q.qid, { values: cur.includes(opt) ? cur.filter((v) => v !== opt) : [...cur, opt] });
  };

  const afterSurvey = () => setPhase('meeting');

  const chooseCategory = async (scope: Scope) => {
    setError(null);
    setBusy(true);
    try {
      const res = await graphqlRequest<ActiveSurveyResult, { kind: SurveyKind } & Scope>(
        ActiveSurveyForDocument,
        { kind, ...scope },
        { auth: true },
      );
      const s = res.activeSurveyFor;
      setSurvey(s);
      // Re-prompt the survey on every visit — never skip it just because a
      // response was submitted before.
      if (s) {
        setPhase('survey');
        return;
      }
      afterSurvey();
    } catch (e) {
      setError(toErrorMessage(e, 'Could not load the survey'));
    } finally {
      setBusy(false);
    }
  };

  const submitSurvey = async () => {
    if (!survey) {
      afterSurvey();
      return;
    }
    const inputs = survey.questions.filter((q) => q.type !== 'SECTION');
    for (const q of inputs) {
      if (!q.required) continue;
      const a = get(q.qid);
      const filled = q.type === 'MCQ' && q.multi ? a.values.length > 0 : a.value.trim() !== '';
      if (!filled) {
        setError(`Please answer: ${q.label}`);
        return;
      }
    }
    setError(null);
    setBusy(true);
    try {
      const payload: SurveyAnswerInput[] = inputs.map((q) =>
        q.type === 'MCQ' && q.multi
          ? { qid: q.qid, values: get(q.qid).values }
          : { qid: q.qid, value: get(q.qid).value },
      );
      await graphqlRequest(
        SubmitSurveyResponseDocument,
        { survey_id: survey.id, answers: payload },
        { auth: true },
      );
      afterSurvey();
    } catch (e) {
      setError(toErrorMessage(e, 'Could not submit the survey'));
    } finally {
      setBusy(false);
    }
  };

  const submitMeeting = async () => {
    const date = new Date(when);
    if (!when || Number.isNaN(date.getTime())) {
      setError('Enter a date & time like 2026-07-01 15:30');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await graphqlRequest(
        RequestMeetingDocument,
        { kind, input: { requested_at: date.toISOString(), notes: notes || null } },
        { auth: true },
      );
      setPhase('done');
    } catch (e) {
      setError(toErrorMessage(e, 'Could not request the meeting'));
    } finally {
      setBusy(false);
    }
  };

  return {
    phase,
    survey,
    answer: { get, set, toggle },
    when,
    setWhen,
    notes,
    setNotes,
    busy,
    error,
    chooseCategory,
    submitSurvey,
    submitMeeting,
  };
}
