import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { FreePodVenueNotice } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** `freePodVenueNotice` from @duncit/utils — the one rule both apps read. */
  notice: FreePodVenueNotice;
  /** A club admin is creating the pod for a host, so the note names the host rather than "you". */
  forClubAdmin?: boolean;
  testID?: string;
}

/**
 * A free pod on a slot the venue charges for: Duncit pays the venue nothing, so
 * the host settles with the venue directly. Shown on the venue step and again
 * before publishing; draws nothing when there is nothing to settle. The second
 * line is dropped once a Pod Request has already confirmed the slot.
 * mWeb twin: FreeVenueNote (rule 27).
 */
export function FreeVenueNote({
  notice,
  forClubAdmin = false,
  testID = 'create-pod-free-venue-note',
}: Readonly<Props>) {
  const { color } = useThemeColors();
  const { t } = useTranslation();
  if (notice === 'NONE') return null;
  const settle = forClubAdmin
    ? t('mweb.createPod.freeVenueSettleClubAdmin')
    : t('mweb.createPod.freeVenueSettle');
  const hold = forClubAdmin
    ? t('mweb.createPod.freeVenueHoldClubAdmin')
    : t('mweb.createPod.freeVenueHold');
  return (
    <XStack
      testID={testID}
      role="status"
      aria-live="polite"
      gap={8}
      alignItems="flex-start"
      backgroundColor="$soft"
      borderRadius={14}
      padding={12}
    >
      <MaterialIcons name="info-outline" size={16} color={color} />
      <YStack flex={1} gap={4}>
        <Text fontSize={13} color="$color">
          {settle}
        </Text>
        {notice === 'SETTLE_BEFORE_APPROVAL' ? (
          <Text fontSize={13} color="$color">
            {hold}
          </Text>
        ) : null}
      </YStack>
    </XStack>
  );
}
