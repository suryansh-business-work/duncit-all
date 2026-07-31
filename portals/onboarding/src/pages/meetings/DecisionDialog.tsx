import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
  Typography,
} from '@mui/material';
import { SurveyAnswers } from '../../components/survey-answers';
import { DECIDE_MEETING, type MeetingDecision, type OnboardingMeeting } from './queries';

interface Props {
  meeting: OnboardingMeeting | null;
  onClose: () => void;
  /** Called after a decision is saved so the table can refetch. */
  onDecided: () => Promise<unknown> | void;
}

/** After a meeting is marked Done, onboarding staff review the applicant's survey
 * answers, record their feedback, and Approve or Deny the applicant themselves —
 * approval drafts the onboarded entity (or grants the club-admin role); there is
 * no admin round-trip. */
export default function DecisionDialog({ meeting, onClose, onDecided }: Readonly<Props>) {
  const [decideMeeting, { loading }] = useMutation(DECIDE_MEETING);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setFeedback('');
    setError(null);
    onClose();
  };

  const decide = async (decision: MeetingDecision) => {
    if (!meeting) return;
    if (!feedback.trim()) {
      setError('Add your feedback before deciding.');
      return;
    }
    setError(null);
    try {
      await decideMeeting({ variables: { id: meeting.id, decision, feedback: feedback.trim() } });
      setFeedback('');
      onClose();
      await onDecided();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the decision');
    }
  };

  return (
    <Dialog open={!!meeting} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>Approve or deny onboarding</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Review {meeting?.user_name || meeting?.contact_name || 'the applicant'}'s survey answers and add your
          feedback. Approving drafts them into the Onboarded list; denying asks them to re-apply.
        </Typography>
        {meeting?.user_id && <SurveyAnswers userId={meeting.user_id} kind={meeting.kind} />}
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
        <Button color="error" onClick={() => decide('DENIED')} disabled={loading}>
          {loading ? 'Saving…' : 'Deny'}
        </Button>
        <Button variant="contained" onClick={() => decide('APPROVED')} disabled={loading}>
          {loading ? 'Saving…' : 'Approve'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
