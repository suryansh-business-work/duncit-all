import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { SurveyAnswers } from '../../components/survey-answers';
import { DECIDE_MEETING, type MeetingDecision, type OnboardingMeeting } from './queries';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  meeting: OnboardingMeeting | null;
  onClose: () => void;
  /** The decided meeting, so the caller can update its row without refetching. */
  onDecided: (decided?: OnboardingMeeting | null) => Promise<unknown> | void;
}

/** After a meeting is marked Done, onboarding staff review the applicant's survey
 * answers, record their feedback, and Approve or Deny the applicant themselves —
 * approval drafts the onboarded entity (or grants the club-admin role); there is
 * no admin round-trip. */
export default function DecisionDialog({ meeting, onClose, onDecided }: Readonly<Props>) {
  const { t } = useTranslation();
  const [decideMeeting, { loading }] = useMutation<any>(DECIDE_MEETING);
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
      setError(t('onboarding.meetings.addYourFeedbackBeforeDeciding'));
      return;
    }
    setError(null);
    try {
      const res = await decideMeeting({
        variables: { id: meeting.id, decision, feedback: feedback.trim() },
      });
      setFeedback('');
      onClose();
      await onDecided(res.data?.decideMeeting);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('onboarding.meetings.couldNotSaveTheDecision'));
    }
  };

  return (
    <Dialog open={!!meeting} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>{t('onboarding.meetings.approveOrDenyOnboarding')}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mb: 1.5
          }}>
          Review {meeting?.user_name || meeting?.contact_name || 'the applicant'}'s survey answers and add your
          feedback. Approving drafts them into the Onboarded list; denying asks them to re-apply.
        </Typography>
        {meeting?.user_id && <SurveyAnswers userId={meeting.user_id} kind={meeting.kind} />}
        <Divider sx={{ my: 2 }} />
        <TextField
          size="small"
          label={t('onboarding.meetings.yourFeedback')}
          placeholder={t('onboarding.meetings.shareHowTheInterviewWentAnd')}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          multiline
          minRows={3}
          fullWidth
          required
        />
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={close}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton color="error" onClick={() => decide('DENIED')} disabled={loading}>
          {loading ? 'Saving…' : 'Deny'}
        </DuncitButton>
        <DuncitButton variant="contained" onClick={() => decide('APPROVED')} disabled={loading}>
          {loading ? 'Saving…' : 'Approve'}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
