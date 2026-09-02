import { AiMonitorPill } from '@/components/ai-monitoring';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  onPress: () => void;
  testID?: string;
}

/** Colourful gradient pill that sits beside every step's title. Tapping it opens
 * the "What AI monitors" guidelines dialog.
 *
 * The pill itself — gradient, sweep, turning spark — is the app's one
 * `AiMonitorPill`, the twin of the pill mWeb shows on the same step and the
 * portals show on a pod row (rule 27). Only the copy and what it opens are
 * Create Pod's. */
export function AiMonitorChip({ onPress, testID = 'create-pod-ai-chip' }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <AiMonitorPill
      label={t('mweb.createPod.aiMonitoring')}
      ariaLabel={t('mweb.createPod.aiMonitors')}
      onPress={onPress}
      testID={testID}
    />
  );
}
