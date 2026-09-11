import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import StepProgressBar from '../../components/StepProgressBar';
import SurveyQuestionField, { type FieldAnswer } from './SurveyQuestionField';
import { splitSections } from './surveySections';
import type { ActiveSurvey } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

export interface SurveyAnswerInput {
  qid: string;
  value?: string | null;
  values?: string[];
}

export type SurveyAnswerState = Record<string, FieldAnswer>;

interface Props {
  survey: ActiveSurvey;
  submitting: boolean;
  onSubmit: (answers: SurveyAnswerInput[]) => void;
  submitLabel?: string;
  // Optionally hand answer ownership to the parent so an in-progress survey
  // survives a Back navigation (the page unmounts, the draft cache keeps them).
  // Falls back to internal state when omitted.
  answers?: SurveyAnswerState;
  setAnswers?: Dispatch<SetStateAction<SurveyAnswerState>>;
}

/** Section-stepped survey — one step per SECTION; final step calls onSubmit. */
export default function SurveyStepper({
  survey,
  submitting,
  onSubmit,
  submitLabel,
  answers: answersProp,
  setAnswers: setAnswersProp,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // Resolved here, not as a parameter default: a default is evaluated
  // before any hook runs, so `t` would not exist yet.
  const submitLabelText = submitLabel ?? t('mweb.common.continue');
  const sections = useMemo(() => splitSections(survey.questions, survey.title || 'Survey'), [survey]);
  const [localAnswers, setLocalAnswers] = useState<SurveyAnswerState>({});
  const answers = answersProp ?? localAnswers;
  const setAnswers = setAnswersProp ?? setLocalAnswers;
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const get = (qid: string): FieldAnswer => answers[qid] ?? { value: '', values: [] };
  const set = (qid: string, patch: Partial<FieldAnswer>) => setAnswers((a) => ({ ...a, [qid]: { ...get(qid), ...patch } }));

  const validate = (idx: number) => {
    for (const q of sections[idx]?.questions ?? []) {
      if (!q.required) continue;
      const a = get(q.qid);
      const filled = q.type === 'MCQ' && q.multi ? a.values.length > 0 : (a.value ?? '').trim() !== '';
      if (!filled) { setError(`This field is required: ${q.label}`); return false; }
    }
    setError(null);
    return true;
  };

  const isLast = step >= sections.length - 1;
  const next = () => { if (validate(step)) setStep((s) => Math.min(s + 1, sections.length - 1)); };
  const submit = () => {
    if (!validate(step)) return;
    const payload: SurveyAnswerInput[] = sections
      .flatMap((s) => s.questions)
      .map((q) => (q.type === 'MCQ' && q.multi ? { qid: q.qid, values: get(q.qid).values } : { qid: q.qid, value: get(q.qid).value }));
    onSubmit(payload);
  };

  if (sections.length === 0) {
    return <DuncitButton variant="contained" size="large" fullWidth onClick={() => onSubmit([])} disabled={submitting}>{submitLabelText}</DuncitButton>;
  }
  const active = sections[step];

  return (
    <Stack spacing={2}>
      {sections.length > 1 && (
        <StepProgressBar steps={sections.map((s) => s.title)} current={step + 1} label={active.title} />
      )}
      <Stack spacing={1.75}>
        <Typography sx={{ fontSize: 17, fontWeight: 600 }}>{active.title}</Typography>
        {active.help && <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>{active.help}</Typography>}
        {active.questions.map((q) => (
          <SurveyQuestionField key={q.qid} question={q} answer={get(q.qid)} onChange={(patch) => set(q.qid, patch)} />
        ))}
      </Stack>
      {error && <Alert severity="warning">{error}</Alert>}
      <Stack direction="row" spacing={1.5} sx={{
        justifyContent: "space-between"
      }}>
        <DuncitButton size="large" disabled={step === 0 || submitting} onClick={() => setStep((s) => Math.max(0, s - 1))} sx={{ flex: 1 }}>Back</DuncitButton>
        {isLast ? (
          <DuncitButton variant="contained" size="large" onClick={submit} disabled={submitting} sx={{ flex: 1 }}>{submitting ? 'Submitting…' : submitLabelText}</DuncitButton>
        ) : (
          <DuncitButton variant="contained" size="large" onClick={next} disabled={submitting} sx={{ flex: 1 }}>Next</DuncitButton>
        )}
      </Stack>
    </Stack>
  );
}
