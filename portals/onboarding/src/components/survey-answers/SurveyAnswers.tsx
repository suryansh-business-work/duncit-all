import { useQuery } from '@apollo/client';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { USER_SURVEY_RESPONSES, type SurveyKind, type UserSurveyResponse } from './queries';

interface Props {
  userId: string;
  kind: SurveyKind;
  /** Heading above the answers. Omit to render the list bare. */
  title?: string;
}

/**
 * Read-only answers the applicant submitted in the Earn with Duncit survey for
 * one onboarding kind — the same block the meeting drawer, the meeting decision
 * dialog and the host review dialog all need.
 */
export default function SurveyAnswers({ userId, kind, title = 'Survey answers' }: Readonly<Props>) {
  const { data, loading } = useQuery<{ userSurveyResponses: UserSurveyResponse[] }>(
    USER_SURVEY_RESPONSES,
    { variables: { user_id: userId }, skip: !userId, fetchPolicy: 'cache-and-network' },
  );
  const items = (data?.userSurveyResponses ?? [])
    .filter((r) => r.kind === kind)
    .flatMap((r) => r.items ?? []);

  return (
    <Box data-testid="survey-answers">
      {title && (
        <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
          {title}
        </Typography>
      )}
      {loading && items.length === 0 && (
        <Stack alignItems="center" sx={{ py: 2 }}>
          <CircularProgress size={22} />
        </Stack>
      )}
      {!loading && items.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No survey answers on file.
        </Typography>
      )}
      <Stack spacing={0.75} sx={{ mt: 0.5 }}>
        {items.map((it) => (
          <Box key={`${it.label}-${it.answer}`}>
            <Typography variant="caption" color="text.secondary">
              {it.label}
            </Typography>
            <Typography variant="body2">{it.answer || '—'}</Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
