import { Text } from 'tamagui';

import { PillTabs, type PillTab } from '@/components/PillTabs';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import type { CreatePodForm } from '../create-pod.types';

type RepeatMode = 'ONE_TIME' | 'RECURRING';

const MODES: readonly PillTab<RepeatMode>[] = [
  { key: 'ONE_TIME', labelKey: 'mweb.podSeries.oneTime' },
  { key: 'RECURRING', labelKey: 'mweb.podSeries.recurring' },
];

/**
 * One time or Recurring — asked BEFORE the venue, slot or date, so the host
 * knows the date they pick is the first of many. The repeat itself
 * (PodRepeatSection) follows the date. mWeb twin.
 */
export function RepeatModeToggle({ form }: Readonly<{ form: CreatePodForm }>) {
  const { t } = useTranslation();
  const enabled = form.watch('repeat_enabled');
  // A Pod Request's slot is one agreed date — it has nothing to repeat.
  if (form.watch('partner_request_id')) return null;
  return (
    <SurfaceCard gap={8} testID="pod-repeat-mode">
      <Text fontSize={15} fontWeight="600" role="heading">
        {t('mweb.podSeries.title')}
      </Text>
      <PillTabs
        tabs={MODES}
        value={enabled ? 'RECURRING' : 'ONE_TIME'}
        onChange={(mode) =>
          form.setValue('repeat_enabled', mode === 'RECURRING', { shouldDirty: true })
        }
        ariaLabel={t('mweb.podSeries.title')}
        testIDPrefix="pod-repeat"
      />
      {enabled ? (
        <Text testID="pod-repeat-mode-hint" fontSize={12} color="$muted">
          {t('mweb.podSeries.modeHint')}
        </Text>
      ) : null}
    </SurfaceCard>
  );
}
