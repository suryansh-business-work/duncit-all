import { useMemo, useState } from 'react';
import { useEntityPageMeta } from '../../app/pageMeta';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';
import {
  buildPodFeedbackInput,
  canSubmitPodFeedback,
  orderedAspects,
  scoresFromMyFeedback,
  type PodFeedbackAspect,
  type PodFeedbackScores,
} from '@duncit/utils';
import { MY_PENDING_POD_FEEDBACK, SUBMIT_FEEDBACK } from '../support-hub/queries';
import { useTranslation } from '../../i18n/useTranslation';
import PodFeedbackCard from './PodFeedbackCard';
import { POD_FEEDBACK_FORM, type PodFeedbackFormData } from './queries';

/**
 * The pod rating form as its own page, at the link a host shares with the
 * people who came: /pod/:podId/feedback.
 *
 * A guest who has already rated the pod opens their own answers rather than an
 * empty form — sending the link twice must not cost them what they said the
 * first time, and submitting again edits that one rating.
 */
export default function PodFeedbackPage() {
  const { podId = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [edited, setEdited] = useState<PodFeedbackScores | null>(null);
  const [editedMessage, setEditedMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data, loading, error } = useQuery<PodFeedbackFormData>(POD_FEEDBACK_FORM, {
    variables: { pod_id: podId },
    fetchPolicy: 'cache-and-network',
  });
  const [submit, { loading: saving }] = useMutation<any>(SUBMIT_FEEDBACK, {
    refetchQueries: [
      { query: POD_FEEDBACK_FORM, variables: { pod_id: podId } },
      { query: MY_PENDING_POD_FEEDBACK },
    ],
  });

  const form = data?.podFeedbackForm ?? null;
  useEntityPageMeta(
    form?.pod.title ? t('mweb.meta.podFeedback.title', { vars: { name: form.pod.title } }) : null,
  );
  const mine = form?.mine ?? null;
  const aspects = useMemo(
    () => orderedAspects(form?.pod.feedback_aspects),
    [form?.pod.feedback_aspects],
  );
  // Untouched, the form IS the stored rating; the first edit takes over.
  const scores = edited ?? scoresFromMyFeedback(mine);
  const message = editedMessage ?? mine?.message ?? '';

  const score = (aspect: PodFeedbackAspect, value: number) => {
    setSaved(false);
    setEdited({ ...scores, [aspect]: value });
  };

  const handleSubmit = async () => {
    if (!form || !canSubmitPodFeedback(scores)) return;
    setFailed(false);
    try {
      await submit({
        variables: {
          input: buildPodFeedbackInput({ podId: form.pod.id, scores, message, aspects }),
        },
      });
      setSaved(true);
    } catch {
      // Leaving on a failure would throw the guest's answers away silently.
      setFailed(true);
    }
  };

  if (loading && !form) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '40dvh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !form) {
    return (
      <Stack sx={{ py: 2 }}>
        <Alert severity="error">{t('mweb.podFeedback.loadFailed')}</Alert>
      </Stack>
    );
  }

  // The link travels further than the pod did. Only someone the host marked
  // present may answer it — everyone else is told why, rather than filling in
  // stars the submit would refuse.
  if (!form.can_rate) {
    return (
      <Stack sx={{ py: 2 }}>
        <Alert severity="warning">{t('mweb.podFeedback.noAccess')}</Alert>
      </Stack>
    );
  }

  return (
    <Stack sx={{ py: 1 }}>
      <PodFeedbackCard
        podTitle={form.pod.title}
        // Saved this visit counts too: the answers are stored, so the page must
        // not offer to "submit" them a second time as if they were new.
        rated={!!mine || saved}
        aspects={aspects}
        scores={scores}
        onScore={score}
        message={message}
        onMessage={(value) => {
          setSaved(false);
          setEditedMessage(value);
        }}
        saving={saving}
        failed={failed}
        saved={saved}
        onSubmit={handleSubmit}
        onLeave={() => navigate('/')}
      />
    </Stack>
  );
}
