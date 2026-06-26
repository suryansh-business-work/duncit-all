import { useState } from 'react';

import { graphqlRequest } from '@/services/graphql.client';
import { SubmitHostRequestDocument } from '@/graphql/host-request';
import { toErrorMessage } from '@/utils/errors';
import {
  ActiveSurveyForDocument,
  type ActiveSurvey,
  type ActiveSurveyResult,
  type SurveyQuestion,
} from '@/graphql/onboarding-survey';
import type { Answer, Scope } from './useOnboardingFlow';

export type HostRequestPhase = 'category' | 'survey' | 'success';

interface SubmitAnswer {
  qid: string;
  value?: string | null;
  values?: string[];
}

/**
 * State machine for the host's "apply for another category" flow: pick the
 * category, answer its survey (skipped when none is configured), then file a
 * Host Request via `submitHostRequest`. Unlike the new-host onboarding gate it
 * has NO meeting phase — an already-approved host goes straight to a request.
 */
export function useHostRequestFlow() {
  const [phase, setPhase] = useState<HostRequestPhase>('category');
  const [scope, setScope] = useState<Scope>({
    super_category_id: '',
    category_id: '',
    sub_category_id: '',
  });
  const [survey, setSurvey] = useState<ActiveSurvey | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const get = (qid: string): Answer => answers[qid] ?? { value: '', values: [] };
  const set = (qid: string, patch: Partial<Answer>) =>
    setAnswers((a) => ({ ...a, [qid]: { ...get(qid), ...patch } }));
  const toggle = (q: SurveyQuestion, opt: string) => {
    const cur = get(q.qid).values;
    set(q.qid, { values: cur.includes(opt) ? cur.filter((v) => v !== opt) : [...cur, opt] });
  };

  const submitRequest = async (chosen: Scope, activeSurvey: ActiveSurvey | null) => {
    const answerInputs: SubmitAnswer[] = (activeSurvey?.questions ?? [])
      .filter((q) => q.type !== 'SECTION')
      .map((q) =>
        q.type === 'MCQ' && q.multi
          ? { qid: q.qid, values: get(q.qid).values }
          : { qid: q.qid, value: get(q.qid).value },
      );
    await graphqlRequest(
      SubmitHostRequestDocument,
      {
        input: {
          super_category_id: chosen.super_category_id || null,
          category_id: chosen.category_id || null,
          sub_category_id: chosen.sub_category_id || null,
          survey_id: activeSurvey?.id ?? null,
          answers: answerInputs,
        },
      },
      { auth: true },
    );
    setPhase('success');
  };

  const chooseCategory = async (chosen: Scope) => {
    setError(null);
    setBusy(true);
    setScope(chosen);
    try {
      const res = await graphqlRequest<ActiveSurveyResult, { kind: 'HOST' } & Scope>(
        ActiveSurveyForDocument,
        { kind: 'HOST', ...chosen },
        { auth: true },
      );
      const s = res.activeSurveyFor;
      setSurvey(s);
      if (s) {
        setPhase('survey');
        return;
      }
      await submitRequest(chosen, null);
    } catch (e) {
      setError(toErrorMessage(e, 'Could not submit your request'));
    } finally {
      setBusy(false);
    }
  };

  const submitSurvey = async () => {
    // Only reachable in the `survey` phase, which is entered with a non-null
    // survey; the `?? []` is a TS-narrowing fallback only.
    /* istanbul ignore next */
    const inputs = (survey?.questions ?? []).filter((q) => q.type !== 'SECTION');
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
      await submitRequest(scope, survey);
    } catch (e) {
      setError(toErrorMessage(e, 'Could not submit your request'));
    } finally {
      setBusy(false);
    }
  };

  return {
    phase,
    survey,
    answer: { get, set, toggle },
    busy,
    error,
    chooseCategory,
    submitSurvey,
  };
}
