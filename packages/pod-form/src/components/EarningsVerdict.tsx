import { Alert, AlertTitle } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { podViabilityNotice, type PodViabilityVerdict } from '@duncit/utils';
import { POD_FORM_VIABILITY_KEYS } from '../finance/economicsGate';
import { useTranslation } from '../i18n/useTranslation';

/**
 * Why the server would refuse this paid pod — the first rule it breaks with
 * every spot filled, the venue's minimum business and the lowest ticket price
 * that works — read off the projection's own verdict. Nothing for a viable pod.
 */
export function ViabilityAlert({
  verdict,
  money,
}: Readonly<{ verdict: PodViabilityVerdict; money: (rupees: number) => string }>) {
  const { t } = useTranslation();
  const notice = podViabilityNotice(verdict, POD_FORM_VIABILITY_KEYS, t, money);
  if (!notice) return null;
  return (
    <Alert severity="error" data-testid="earnings-viability" data-reason={notice.reason}>
      <AlertTitle>{notice.title}</AlertTitle>
      {notice.body}
    </Alert>
  );
}

/** The projection request failed: there is nothing to judge the pod on, so Save waits; Try again asks once more. */
export function ProjectionFailedAlert({ onRetry }: Readonly<{ onRetry: () => void }>) {
  const { t } = useTranslation();
  return (
    <Alert
      severity="warning"
      data-testid="earnings-failed"
      action={
        <DuncitButton color="inherit" size="small" onClick={onRetry} data-testid="earnings-retry">
          {t('podForm.priceBreakdown.viability.retry')}
        </DuncitButton>
      }
    >
      {t('podForm.priceBreakdown.viability.checkFailed')}
    </Alert>
  );
}
