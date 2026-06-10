import { useEffect, useState } from 'react';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import {
  ActiveSurveyForDocument,
  MyMeetingDocument,
  RequestMeetingDocument,
  SubmitSurveyResponseDocument,
  type ActiveSurvey,
  type ActiveSurveyResult,
  type MyMeetingResult,
  type SurveyAnswerInput,
  type SurveyKind,
  type SurveyQuestion,
} from '@/graphql/onboarding-survey';

export type Phase = 'loading' | 'category' | 'survey' | 'meeting' | 'done';
export type Answer = { value: string; values: string[] };
export interface Scope {
  super_category_id: string;
  category_id: string;
  sub_category_id: string;
}

/** State machine for the category → survey → meeting onboarding gate. */
export function useOnboardingFlow(kind: SurveyKind) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [survey, setSurvey] = useState<ActiveSurvey | null>(null);
  const [meetingDone, setMeetingDone] = useState(false);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [when, setWhen] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const meet = await graphqlRequest<MyMeetingResult, { kind: SurveyKind }>(
          MyMeetingDocument,
          { kind },
          { auth: true },
        );
        if (!alive) return;
        setMeetingDone(!!meet.myMeeting);
        // Once the meeting is requested the gate is satisfied — go straight to
        // done. Otherwise re-ask category → survey → meeting every visit.
        setPhase(meet.myMeeting ? 'done' : 'category');
      } catch {
        if (alive) setPhase('done'); // never block on a load error
      }
    })();
    return () => {
      alive = false;
    };
  }, [kind]);

  const get = (qid: string): Answer => answers[qid] ?? { value: '', values: [] };
  const set = (qid: string, patch: Partial<Answer>) =>
    setAnswers((a) => ({ ...a, [qid]: { ...get(qid), ...patch } }));
  const toggle = (q: SurveyQuestion, opt: string) => {
    const cur = get(q.qid).values;
    set(q.qid, { values: cur.includes(opt) ? cur.filter((v) => v !== opt) : [...cur, opt] });
  };

  const afterSurvey = (done: boolean) => setPhase(done ? 'done' : 'meeting');

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
      // Re-prompt the survey on every visit until the meeting is requested — we
      // no longer skip it just because a response was submitted before.
      if (s) {
        setPhase('survey');
        return;
      }
      afterSurvey(meetingDone);
    } catch (e) {
      setError(toErrorMessage(e, 'Could not load the survey'));
    } finally {
      setBusy(false);
    }
  };

  const submitSurvey = async () => {
    if (!survey) {
      afterSurvey(meetingDone);
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
      afterSurvey(meetingDone);
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
