import { AiMonitorPill } from '@duncit/ai-monitoring/mui';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  onClick: () => void;
}

/** Colourful gradient pill beside every step's eyebrow. Opens the "What AI
 * monitors" guidelines dialog.
 *
 * The pill itself — gradient, shimmer, turning spark — is
 * `@duncit/ai-monitoring/mui`'s, the same one Admin and Partners put on a pod
 * row (rule 40). Only the copy and what it opens are Create Pod's. */
export default function AiMonitorChip({ onClick }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <AiMonitorPill
      label={t('mweb.createPod.aiMonitoring')}
      ariaLabel={t('mweb.createPod.aiMonitors')}
      onClick={onClick}
      testId="create-pod-ai-chip"
    />
  );
}
