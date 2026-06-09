import { gql, useQuery } from '@apollo/client';
import { Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';

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

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '');

/** Read-only view of a user's venue/host onboarding survey answers. */
export default function UserSurveysSection({ userId }: Readonly<{ userId: string }>) {
  const { data, loading } = useQuery<{ userSurveyResponses: UserSurvey[] }>(USER_SURVEYS, {
    variables: { user_id: userId }, skip: !userId, fetchPolicy: 'cache-and-network',
  });
  const responses = data?.userSurveyResponses ?? [];

  if (loading && responses.length === 0) return null;
  if (responses.length === 0) {
    return <Typography variant="body2" color="text.secondary">This user hasn't submitted any onboarding survey yet.</Typography>;
  }

  return (
    <Stack spacing={2}>
      {responses.map((r) => (
        <Card key={r.kind} variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Chip size="small" color="primary" label={r.kind === 'VENUE' ? 'Venue survey' : 'Host survey'} />
              {r.submitted_at && <Typography variant="caption" color="text.secondary">Submitted {fmt(r.submitted_at)}</Typography>}
            </Stack>
            <Divider sx={{ mb: 1 }} />
            {r.items.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No answers.</Typography>
            ) : (
              <Stack spacing={1}>
                {r.items.map((it) => (
                  <Stack key={it.qid} direction={{ xs: 'column', sm: 'row' }} spacing={0.5}>
                    <Typography variant="caption" color="text.secondary" sx={{ width: { sm: 240 }, flexShrink: 0, fontWeight: 700 }}>
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
