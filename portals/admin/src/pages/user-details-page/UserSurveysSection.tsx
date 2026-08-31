import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

const USER_SURVEYS = gql`
  query AdminUserSurveys($user_id: ID!) {
    userSurveyResponses(user_id: $user_id) {
      kind
      submitted_at
      items { qid label type answer }
    }
  }
`;

interface SurveyItem { qid: string; label: string; type: string; answer: string }
interface UserSurvey { kind: 'VENUE' | 'HOST'; submitted_at?: string | null; items: SurveyItem[] }

const fmt = (iso?: string | null) => (iso ? formatDateTime(iso) : '');

/** Read-only view of a user's venue/host onboarding survey answers. */
export default function UserSurveysSection({ userId }: Readonly<{ userId: string }>) {
  const { t } = useTranslation();
  const { data, loading } = useQuery<{ userSurveyResponses: UserSurvey[] }>(USER_SURVEYS, {
    variables: { user_id: userId }, skip: !userId, fetchPolicy: 'cache-and-network',
  });
  const responses = data?.userSurveyResponses ?? [];

  if (loading && responses.length === 0) return null;
  if (responses.length === 0) {
    return (
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>{t('admin.surveys.none')}</Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {responses.map((r) => (
        <Card key={r.kind} variant="outlined">
          <CardContent>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                mb: 1
              }}>
              <Chip size="small" color="primary" label={r.kind === 'VENUE' ? 'Venue survey' : 'Host survey'} />
              {r.submitted_at && <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>Submitted {fmt(r.submitted_at)}</Typography>}
            </Stack>
            <Divider sx={{ mb: 1 }} />
            {r.items.length === 0 ? (
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>{t('admin.surveys.empty')}</Typography>
            ) : (
              <Stack spacing={1}>
                {r.items.map((it) => (
                  <Stack key={it.qid} direction={{ xs: 'column', sm: 'row' }} spacing={0.5}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        width: { sm: 240 },
                        flexShrink: 0,
                        fontWeight: 700
                      }}>
                      {it.label}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{it.answer || '—'}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
