import { AiProcessingOverlay } from '@duncit/ai-monitoring/mui';
import { useTranslation } from '../../../i18n/useTranslation';

/**
 * The overlay a host waits behind from the moment they press Create Pod until
 * the AI content check answers.
 *
 * It blocks on purpose: the pod is being read and published, so an editable
 * form underneath would be a form whose edits are already too late.
 *
 * The badge, the rings and the scan bar come from
 * `@duncit/ai-monitoring/mui` — the same wait the Partners listing check shows
 * inline, and the same timings the native app animates (rule 40). Only these
 * three sentences are Create Pod's. Native twin — `AiMonitorOverlay` (rule 27).
 */
export default function AiMonitorBackdrop({ open }: Readonly<{ open: boolean }>) {
  const { t } = useTranslation();
  return (
    <AiProcessingOverlay
      open={open}
      title={t('mweb.createPod.aiMonitoringTitle')}
      note={t('mweb.createPod.aiMonitoringNote')}
      hold={t('mweb.createPod.aiMonitoringHold')}
      testId="create-pod-ai-monitor"
    />
  );
}
