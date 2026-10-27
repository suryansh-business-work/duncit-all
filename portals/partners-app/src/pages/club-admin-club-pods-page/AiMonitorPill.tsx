import { AiMonitorPill as SharedAiMonitorPill } from '@duncit/ai-monitoring/mui';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  onClick: () => void;
  testId?: string;
}

/** Gradient "AI Monitoring" pill on a pod row — the same shimmering pill the
 * create-pod stepper shows, so it reads as the one AI affordance across the
 * product. Opens the pod's AI-monitored activity dialog. A real <button>, so
 * DuncitTable's row-click handler ignores it. */
export default function AiMonitorPill({ onClick, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <SharedAiMonitorPill label={t('clubAdmin.pods.aiMonitoring')} onClick={onClick} testId={testId} />
  );
}
