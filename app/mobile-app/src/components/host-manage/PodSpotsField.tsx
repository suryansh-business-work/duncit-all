import { Text, YStack } from 'tamagui';

import { SpotsStepper } from '@/components/create-pod/SpotsStepper';
import { useTranslation } from '@/hooks/useTranslation';
import { spotsBoundsHint, type PodSpotLimits } from './pod-edit.form';

interface Props {
  limits: PodSpotLimits;
  value: string;
  onChange: (next: string) => void;
  error?: string;
}

/**
 * The pod's capacity, inside the edit sheet.
 *
 * A pod published smaller than the space it booked used to be stuck that way
 * for good: the only spot control lived in Create-a-Pod. This is that same
 * stepper, bounded by the server's range. mWeb twin: PodSpotsField in
 * @duncit/host-pod-actions (rule 27).
 */
export function PodSpotsField({ limits, value, onChange, error }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap={6}>
      <SpotsStepper
        value={value}
        onChange={onChange}
        min={limits.min}
        max={limits.max}
        slidable={limits.slidable}
        boundsHint={spotsBoundsHint(limits, t)}
        error={error}
      />
      {limits.can_decrease ? null : (
        <Text fontSize={12} color="$muted">
          {t('mweb.hostPodEdit.spotsIncreaseOnly')}
        </Text>
      )}
    </YStack>
  );
}
