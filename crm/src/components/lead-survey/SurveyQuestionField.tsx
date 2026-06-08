import { Checkbox, FormControl, FormControlLabel, FormGroup, Radio, RadioGroup, TextField, Typography } from '@mui/material';
import type { LeadSurveyQuestion } from './queries';

export interface FieldAnswer {
  value: string;
  values: string[];
}

interface Props {
  question: LeadSurveyQuestion;
  answer: FieldAnswer;
  onChange: (patch: Partial<FieldAnswer>) => void;
}

/** Renders a single survey question input (TEXT / TEXTAREA / MCQ single|multi). */
export default function SurveyQuestionField({ question: q, answer, onChange }: Props) {
  const toggle = (opt: string) => {
    const cur = answer.values;
    onChange({ values: cur.includes(opt) ? cur.filter((v) => v !== opt) : [...cur, opt] });
  };

  return (
    <FormControl component="fieldset" fullWidth>
      <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>{q.label}{q.required ? ' *' : ''}</Typography>
      {q.help && <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>{q.help}</Typography>}
      {q.type === 'TEXT' && <TextField size="small" value={answer.value} onChange={(e) => onChange({ value: e.target.value })} fullWidth />}
      {q.type === 'TEXTAREA' && <TextField size="small" value={answer.value} onChange={(e) => onChange({ value: e.target.value })} fullWidth multiline minRows={3} />}
      {q.type === 'MCQ' && q.multi && (
        <FormGroup>
          {q.options.map((opt) => (
            <FormControlLabel key={opt} control={<Checkbox checked={answer.values.includes(opt)} onChange={() => toggle(opt)} />} label={opt} />
          ))}
        </FormGroup>
      )}
      {q.type === 'MCQ' && !q.multi && (
        <RadioGroup value={answer.value} onChange={(e) => onChange({ value: e.target.value })}>
          {q.options.map((opt) => <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />)}
        </RadioGroup>
      )}
    </FormControl>
  );
}
