import { useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { ActiveSurvey, SurveyQuestion } from './queries';

export interface SurveyAnswerInput {
  qid: string;
  value?: string | null;
  values?: string[];
}

interface Props {
  survey: ActiveSurvey;
  submitting: boolean;
  onSubmit: (answers: SurveyAnswerInput[]) => void;
}

type AnswerState = Record<string, { value: string; values: string[] }>;

const inputQuestions = (s: ActiveSurvey) => s.questions.filter((q) => q.type !== 'SECTION');

/** Renders a dynamic survey (Section/MCQ/Short/Long) and validates required answers. */
export default function SurveyForm({ survey, submitting, onSubmit }: Props) {
  const [answers, setAnswers] = useState<AnswerState>({});
  const [error, setError] = useState<string | null>(null);

  const get = (qid: string) => answers[qid] ?? { value: '', values: [] };
  const set = (qid: string, patch: Partial<{ value: string; values: string[] }>) =>
    setAnswers((a) => ({ ...a, [qid]: { ...get(qid), ...patch } }));

  const toggleMulti = (q: SurveyQuestion, opt: string) => {
    const cur = get(q.qid).values;
    set(q.qid, { values: cur.includes(opt) ? cur.filter((v) => v !== opt) : [...cur, opt] });
  };

  const submit = () => {
    for (const q of inputQuestions(survey)) {
      if (!q.required) continue;
      const a = get(q.qid);
      const filled = q.type === 'MCQ' && q.multi ? a.values.length > 0 : (a.value ?? '').trim() !== '';
      if (!filled) { setError(`Please answer: ${q.label}`); return; }
    }
    setError(null);
    onSubmit(
      inputQuestions(survey).map((q) => {
        const a = get(q.qid);
        return q.type === 'MCQ' && q.multi ? { qid: q.qid, values: a.values } : { qid: q.qid, value: a.value };
      })
    );
  };

  return (
    <Stack spacing={2}>
      {survey.questions.map((q) => {
        if (q.type === 'SECTION') {
          return (
            <Stack key={q.qid} spacing={0.25} sx={{ pt: 1 }}>
              <Typography variant="subtitle1" fontWeight={800}>{q.label}</Typography>
              {q.help && <Typography variant="body2" color="text.secondary">{q.help}</Typography>}
            </Stack>
          );
        }
        const a = get(q.qid);
        return (
          <FormControl key={q.qid} component="fieldset" fullWidth>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
              {q.label}{q.required ? ' *' : ''}
            </Typography>
            {q.help && <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>{q.help}</Typography>}
            {q.type === 'TEXT' && (
              <TextField size="small" value={a.value} onChange={(e) => set(q.qid, { value: e.target.value })} fullWidth />
            )}
            {q.type === 'TEXTAREA' && (
              <TextField size="small" value={a.value} onChange={(e) => set(q.qid, { value: e.target.value })} fullWidth multiline minRows={3} />
            )}
            {q.type === 'MCQ' && q.multi && (
              <FormGroup>
                {q.options.map((opt) => (
                  <FormControlLabel key={opt} control={<Checkbox checked={a.values.includes(opt)} onChange={() => toggleMulti(q, opt)} />} label={opt} />
                ))}
              </FormGroup>
            )}
            {q.type === 'MCQ' && !q.multi && (
              <RadioGroup value={a.value} onChange={(e) => set(q.qid, { value: e.target.value })}>
                {q.options.map((opt) => <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />)}
              </RadioGroup>
            )}
          </FormControl>
        );
      })}

      {error && <Alert severity="warning">{error}</Alert>}
      <Button variant="contained" size="large" onClick={submit} disabled={submitting} sx={{ borderRadius: 999, fontWeight: 900 }}>
        {submitting ? 'Submitting…' : 'Continue'}
      </Button>
    </Stack>
  );
}
