import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  SEND_MEETING_FEEDBACK,
  USER_SURVEY_RESPONSES,
  type OnboardingMeeting,
  type UserSurveyResponse,
} from './queries';

interface Props {
  meeting: OnboardingMeeting | null;
  onClose: () => void;
  /** Called after feedback is sent so the table can refetch. */
  onSent: () => Promise<unknown> | void;
}

/** After a meeting is marked Done, staff review the applicant's survey answers
 * and submit feedback — this raises an approval request to the Admin console. */
export default function SendFeedbackDialog({ meeting, onClose, onSent }: Readonly<Props>) {
  const [sendFeedback, { loading }] = useMutation(SEND_MEETING_FEEDBACK);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, loading: loadingSurvey } = useQuery<{ userSurveyResponses: UserSurveyResponse[] }>(
    USER_SURVEY_RESPONSES,
    { variables: { user_id: meeting?.user_id }, skip: !meeting?.user_id, fetchPolicy: 'cache-and-network' },
  );

  const items = (data?.userSurveyResponses ?? [])
    .filter((r) => r.kind === meeting?.kind)
    .flatMap((r) => r.items ?? []);

  const close = () => {
    setFeedback('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!meeting) return;
    if (!feedback.trim()) {
      setError('Add your feedback before sending it to the Admin.');
      return;
    }
    setError(null);
    try {
      await sendFeedback({ variables: { id: meeting.id, feedback: feedback.trim() } });
      setFeedback('');
      onClose();
      await onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the feedback');
    }
  };

  return (
    <Dialog open={!!meeting} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>Send feedback to Admin</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Review {meeting?.user_name || meeting?.contact_name || 'the applicant'}'s survey answers, then
          add your feedback. On Admin approval they appear as a draft in the Onboarded list.
        </Typography>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Survey answers</Typography>
        {loadingSurvey && items.length === 0 && (
          <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={22} /></Stack>
        )}
        {!loadingSurvey && items.length === 0 && (
          <Typography variant="body2" color="text.secondary">No survey answers on file.</Typography>
        )}
        {items.length > 0 && (
          <Stack spacing={1}>
            {items.map((it) => (
              <Box key={`${it.label}-${it.answer}`}>
                <Typography variant="caption" color="text.secondary">{it.label}</Typography>
                <Typography variant="body2">{it.answer || '—'}</Typography>
              </Box>
            ))}
          </Stack>
        )}
        <Divider sx={{ my: 2 }} />
        <TextField
          size="small"
          label="Your feedback"
          placeholder="Share how the interview went and your recommendation"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          multiline
          minRows={3}
          fullWidth
          required
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={loading}>
          {loading ? 'Sending…' : 'Send to Admin'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
