import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
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
} from '@duncit/utils';
import { MY_PENDING_POD_FEEDBACK, SUBMIT_FEEDBACK } from '../../pages/support-hub/queries';
import { useTranslation } from '../../i18n/useTranslation';
import PodFeedbackFields from './PodFeedbackFields';

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
  const [scores, setScores] = useState<PodFeedbackScores>({});
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  const { data } = useQuery<{ myPendingPodFeedback: PendingPod | null }>(MY_PENDING_POD_FEEDBACK, {
    fetchPolicy: 'cache-and-network',
  });
  const [submit, { loading }] = useMutation(SUBMIT_FEEDBACK, {
    refetchQueries: [{ query: MY_PENDING_POD_FEEDBACK }],
  });

  const pod = data?.myPendingPodFeedback ?? null;
  const aspects = useMemo(() => orderedAspects(pod?.feedback_aspects), [pod?.feedback_aspects]);

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
    <Dialog open={!dismissed} onClose={() => setDismissed(true)} fullWidth maxWidth="xs">
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
        <Button onClick={() => setDismissed(true)}>{t('mweb.podFeedback.skip')}</Button>
        <Button
          variant="contained"
          disabled={!canSubmitPodFeedback(scores) || loading}
          onClick={handleSubmit}
        >
          {loading ? t('mweb.podFeedback.submitting') : t('mweb.podFeedback.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
