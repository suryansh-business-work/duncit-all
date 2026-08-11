import { Alert, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import {
  canSubmitPodFeedback,
  type PodFeedbackAspect,
  type PodFeedbackScores,
} from '@duncit/utils';
import PodFeedbackFields from '../../components/pod-feedback/PodFeedbackFields';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  podTitle: string;
  /** True once this guest has rated the pod — the form opens on their answers. */
  rated: boolean;
  aspects: readonly PodFeedbackAspect[];
  scores: PodFeedbackScores;
  onScore: (aspect: PodFeedbackAspect, value: number) => void;
  message: string;
  onMessage: (value: string) => void;
  saving: boolean;
  failed: boolean;
  saved: boolean;
  onSubmit: () => void;
  onLeave: () => void;
}

/** The rating form as a page — the same questions the after-the-pod pop-up asks,
 * for a guest who arrived on the link their host shared. */
export default function PodFeedbackCard({
  podTitle,
  rated,
  aspects,
  scores,
  onScore,
  message,
  onMessage,
  saving,
  failed,
  saved,
  onSubmit,
  onLeave,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const submitLabel = rated ? t('mweb.podFeedback.update') : t('mweb.podFeedback.submit');
  const busyLabel = rated ? t('mweb.podFeedback.updating') : t('mweb.podFeedback.submitting');

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h6" fontWeight={700}>
            {t('mweb.podFeedback.title', { vars: { title: podTitle } })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('mweb.podFeedback.subtitle')}
          </Typography>
          {rated && <Alert severity="info">{t('mweb.podFeedback.alreadyRated')}</Alert>}

          <PodFeedbackFields
            aspects={aspects}
            scores={scores}
            onScore={onScore}
            message={message}
            onMessage={onMessage}
          />

          {failed && <Alert severity="error">{t('mweb.podFeedback.failed')}</Alert>}
          {saved && <Alert severity="success">{t('mweb.podFeedback.saved')}</Alert>}

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={onLeave}>
              {saved ? t('mweb.podFeedback.done') : t('mweb.podFeedback.skip')}
            </Button>
            <Button
              variant="contained"
              disabled={!canSubmitPodFeedback(scores) || saving}
              onClick={onSubmit}
            >
              {saving ? busyLabel : submitLabel}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
