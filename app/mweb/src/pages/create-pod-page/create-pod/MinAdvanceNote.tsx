import { Alert } from '@mui/material';
import { useTranslation } from '../../../i18n/useTranslation';
import type { PodMinAdvance } from './usePodMinAdvance';

/**
 * Tells the host why the earlier days in the calendar are greyed out: their
 * Minimum Advance Days (Pod Settings, or their own override). Nothing until the
 * rule is known. Native twin: MinAdvanceNote.
 */
export default function MinAdvanceNote({ minAdvance }: Readonly<{ minAdvance: PodMinAdvance | null }>) {
  const { t } = useTranslation();
  if (!minAdvance) return null;
  return (
    <Alert severity="info" data-testid="create-pod-min-advance-note">
      {t('mweb.createPod.validation.startTooSoon', { count: minAdvance.days })}
    </Alert>
  );
}
