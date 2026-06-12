import { useEffect, useState } from 'react';
import { graphqlRequest } from '@/services/graphql.client';
import { useMe } from '@/hooks/useMe';
import { toErrorMessage } from '@/utils/errors';
import {
  ActiveSurveyForDocument,
  MeetingSlotsDocument,
  RequestMeetingDocument,
  SubmitSurveyResponseDocument,
  type ActiveSurvey,
  type ActiveSurveyResult,
  type MeetingSlot,
  type MeetingSlotsResult,
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
  const [slots, setSlots] = useState<MeetingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [name, setName] = useState('');
  const [ext, setExt] = useState('+91');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [bookedSlot, setBookedSlot] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill the contact fields from the signed-in profile; locked in the UI
  // when the profile already has them.
  const me = useMe().data?.me;
  const hasProfilePhone = !!me?.phone_number?.trim();
  useEffect(() => {
    if (!me) return;
    if (me.full_name) setName(me.full_name);
    if (me.phone_number?.trim()) {
      setPhone(me.phone_number);
      if (me.phone_extension) setExt(me.phone_extension);
    }
    // Prefill once when the profile lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.user_id]);

  const get = (qid: string): Answer => answers[qid] ?? { value: '', values: [] };
  const set = (qid: string, patch: Partial<Answer>) =>
    setAnswers((a) => ({ ...a, [qid]: { ...get(qid), ...patch } }));
  const toggle = (q: SurveyQuestion, opt: string) => {
    const cur = get(q.qid).values;
    set(q.qid, { values: cur.includes(opt) ? cur.filter((v) => v !== opt) : [...cur, opt] });
  };

  const loadSlots = async () => {
    setSlotsLoading(true);
    try {
      const res = await graphqlRequest<MeetingSlotsResult>(MeetingSlotsDocument, undefined, {
        auth: true,
      });
      setSlots(res.meetingSlots);
    } catch (e) {
      setError(toErrorMessage(e, 'Could not load the available slots'));
    } finally {
      setSlotsLoading(false);
    }
  };

  const afterSurvey = () => {
    setPhase('meeting');
    void loadSlots();
  };

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
    if (!selectedSlot) {
      setError('Pick an available slot');
      return;
    }
    if (!phone.trim()) {
      setError('Phone number is required so our team can reach you');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await graphqlRequest(
        RequestMeetingDocument,
        {
          kind,
          input: {
            requested_at: selectedSlot,
            notes: notes || null,
            contact_name: name.trim() || null,
            contact_phone: `${ext.trim()} ${phone.trim()}`.trim(),
          },
        },
        { auth: true },
      );
      setBookedSlot(selectedSlot);
      setPhase('done');
    } catch (e) {
      setError(toErrorMessage(e, 'Could not book the slot'));
      // The slot may have just been taken — refresh the grid.
      void loadSlots();
    } finally {
      setBusy(false);
    }
  };

  return {
    phase,
    survey,
    answer: { get, set, toggle },
    slots,
    slotsLoading,
    selectedSlot,
    setSelectedSlot,
    name,
    setName,
    ext,
    setExt,
    phone,
    setPhone,
    hasProfilePhone,
    lockName: !!me?.full_name,
    notes,
    setNotes,
    bookedSlot,
    busy,
    error,
    chooseCategory,
    submitSurvey,
    submitMeeting,
  };
}
