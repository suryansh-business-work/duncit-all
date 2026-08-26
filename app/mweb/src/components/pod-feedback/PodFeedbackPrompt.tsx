import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { logs } from '@duncit/logs';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import {
  buildPodFeedbackInput,
  canSubmitPodFeedback,
  orderedAspects,
  type PodFeedbackScores,
  type PodFeedbackReminderChoice,
} from '@duncit/utils';
import {
  MY_PENDING_POD_FEEDBACK,
  REMIND_POD_FEEDBACK,
  SUBMIT_FEEDBACK,
} from '../../pages/support-hub/queries';
import { useTranslation } from '../../i18n/useTranslation';
import PodFeedbackFields from './PodFeedbackFields';
import PodFeedbackReminderDialog from './PodFeedbackReminderDialog';

interface PendingPod {
  id: string;
  title: string;
  /** Which parts THIS pod has — the server decides; a virtual pod has no room. */
  feedback_aspects: string[];
}

/**
 * After a guest attends a pod and comes back, ask how it went — part by part.
 *
 * The twin of the native app's prompt (rule 27): same questions, same order,
 * same copy, because the ordering and the payload come from @duncit/utils and
 * the words from the shared translation bundle.
 */
export default function PodFeedbackPrompt() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const [asking, setAsking] = useState(false);
  const [scores, setScores] = useState<PodFeedbackScores>({});
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  const { data } = useQuery<{ myPendingPodFeedback: PendingPod | null }>(MY_PENDING_POD_FEEDBACK, {
    fetchPolicy: 'cache-and-network',
  });
  const [submit, { loading }] = useMutation(SUBMIT_FEEDBACK, {
    refetchQueries: [{ query: MY_PENDING_POD_FEEDBACK }],
  });
  const [remind] = useMutation(REMIND_POD_FEEDBACK);

  const pod = data?.myPendingPodFeedback ?? null;
  const aspects = useMemo(() => orderedAspects(pod?.feedback_aspects), [pod?.feedback_aspects]);

  /**
   * Closing the prompt is an answer in its own right, so it is written down.
   * The dialog goes first: a guest who just said "stop asking" should not be
   * held in front of it by a slow request, and a failed write only means the
   * next visit asks once more.
   */
  const handleRemind = (choice: PodFeedbackReminderChoice) => {
    if (!pod) return;
    setAsking(false);
    setDismissed(true);
    remind({ variables: { pod_id: pod.id, choice } }).catch((error) =>
      logs.mWeb.error('PodFeedbackPrompt', 'handleRemind', { error, choice })
    );
  };

  const handleSubmit = async () => {
    if (!pod || !canSubmitPodFeedback(scores)) return;
    setFailed(false);
    try {
      await submit({
        variables: { input: buildPodFeedbackInput({ podId: pod.id, scores, message, aspects }) },
      });
      setDismissed(true);
    } catch {
      // Closing on a failure would throw the guest's answers away silently.
      setFailed(true);
    }
  };

  if (!pod) return null;

  return (
    <>
      <Dialog open={!dismissed && !asking} onClose={() => setAsking(true)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t('mweb.podFeedback.title', { vars: { title: pod.title } })}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {t('mweb.podFeedback.subtitle')}
            </Typography>

            <PodFeedbackFields
              aspects={aspects}
              scores={scores}
              onScore={(aspect, value) => setScores((prev) => ({ ...prev, [aspect]: value }))}
              message={message}
              onMessage={setMessage}
            />
            {failed && <Alert severity="error">{t('mweb.podFeedback.failed')}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAsking(true)}>{t('mweb.podFeedback.close')}</Button>
          <Button
            variant="contained"
            disabled={!canSubmitPodFeedback(scores) || loading}
            onClick={handleSubmit}
          >
            {loading ? t('mweb.podFeedback.submitting') : t('mweb.podFeedback.submit')}
          </Button>
        </DialogActions>
      </Dialog>
      <PodFeedbackReminderDialog open={asking} title={pod.title} onChoose={handleRemind} />
    </>
  );
}
