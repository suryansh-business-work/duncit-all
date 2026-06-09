import { useQuery } from '@apollo/client';
import { Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { MY_MEETING, type SurveyKind } from '../survey-gate/queries';
import { useDateFormat } from '../../utils/dateFormat';

interface Meeting {
  id: string;
  status: 'REQUESTED' | 'SCHEDULED' | 'DONE' | 'CANCELLED';
  requested_at: string;
  scheduled_at?: string | null;
  meeting_link?: string | null;
}

/**
 * Shows the signed-in user's onboarding meeting for a kind — scheduled time and
 * a join link once onboarding staff set them (synced from the Onboarding
 * portal). Renders nothing when the user has no meeting for this kind.
 */
export default function MeetingStatusCard({ kind }: { kind: SurveyKind }) {
  const { data } = useQuery<{ myMeeting: Meeting | null }>(MY_MEETING, {
    variables: { kind },
    fetchPolicy: 'cache-and-network',
  });
  const { formatDateTime } = useDateFormat();
  const meeting = data?.myMeeting;
  if (!meeting) return null;

  const label = kind === 'VENUE' ? 'Venue' : 'Host';
  const scheduled = meeting.status === 'SCHEDULED' && !!(meeting.scheduled_at || meeting.meeting_link);

  return (
    <Card variant="outlined" sx={{ borderRadius: 4, bgcolor: scheduled ? 'rgba(20,184,166,0.06)' : undefined }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <EventAvailableIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" fontWeight={900} sx={{ flex: 1 }}>
            Your {label} onboarding meeting
          </Typography>
          <Chip size="small" label={meeting.status} color={scheduled ? 'success' : 'default'} />
        </Stack>
        {scheduled ? (
          <Stack spacing={1.25} alignItems="flex-start">
            {meeting.scheduled_at && (
              <Typography variant="body2">
                Scheduled for <strong>{formatDateTime(meeting.scheduled_at)}</strong>
              </Typography>
            )}
            {meeting.meeting_link && (
              <Button variant="contained" size="small" href={meeting.meeting_link} target="_blank" rel="noopener">
                Join meeting
              </Button>
            )}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Requested — our onboarding team will confirm a time soon.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
