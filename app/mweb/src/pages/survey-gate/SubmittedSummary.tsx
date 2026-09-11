import { Box, Stack, Typography } from '@mui/material';
import { SURFACE_SX } from '../../theme';
import type { ActiveSurvey } from './queries';
import type { SurveyAnswerInput } from './SurveyStepper';

interface Props {
  survey: ActiveSurvey;
  answers: SurveyAnswerInput[];
}

/** Read-only recap of the just-submitted survey answers, shown on the meeting step. */
export default function SubmittedSummary({ survey, answers }: Readonly<Props>) {
  const labelFor = (qid: string) => survey.questions.find((q) => q.qid === qid)?.label ?? qid;
  const items = answers.filter((a) => a.values?.length || (a.value ?? '').trim() !== '');
  if (items.length === 0) return null;

  return (
    <Box sx={{ ...SURFACE_SX, p: 2, mb: 2 }}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontWeight: 600,
          letterSpacing: 0.4
        }}>
        YOUR SURVEY ANSWERS
      </Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {items.map((a) => (
          <Stack key={a.qid} spacing={0.1}>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>{labelFor(a.qid)}</Typography>
            <Typography variant="body2">{a.values?.length ? a.values.join(', ') : a.value}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
