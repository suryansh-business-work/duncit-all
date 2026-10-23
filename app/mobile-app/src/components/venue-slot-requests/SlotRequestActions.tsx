import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  slotId: string;
  /** What the venue may do now (`venueOfferActions`). */
  actions: { accept: boolean; reject: boolean; counter: boolean };
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
  onCounter: () => void;
}

/**
 * A booking request's answers: reject as the outlined danger pill, counter
 * (or change the counter, while the host decides) outlined, accept as the
 * solid one. Each opens its own sheet — nothing is decided by one tap.
 */
export function SlotRequestActions({
  slotId,
  actions,
  busy,
  onAccept,
  onReject,
  onCounter,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { danger, onPrimary, primary } = useThemeColors();
  if (!actions.accept && !actions.reject && !actions.counter) return null;

  return (
    <XStack gap={8} flexWrap="wrap">
      {actions.reject ? (
        <YStack flex={1} minWidth={96}>
          <DuncitButton
            testID={`slot-request-reject-${slotId}`}
            label={t('availability.offers.reject')}
            onPress={onReject}
            variant="outline"
            tone="danger"
            disabled={busy}
            fullWidth
            icon={<MaterialIcons name="close" size={18} color={danger} />}
          />
        </YStack>
      ) : null}
      {actions.counter ? (
        <YStack flex={1} minWidth={96}>
          <DuncitButton
            testID={`slot-request-counter-${slotId}`}
            label={
              actions.accept
                ? t('availability.offers.counter')
                : t('availability.offers.changeCounter')
            }
            onPress={onCounter}
            variant="outline"
            disabled={busy}
            fullWidth
            icon={<MaterialIcons name="swap-horiz" size={18} color={primary} />}
          />
        </YStack>
      ) : null}
      {actions.accept ? (
        <YStack flex={1} minWidth={96}>
          <DuncitButton
            testID={`slot-request-accept-${slotId}`}
            label={t('availability.offers.accept')}
            onPress={onAccept}
            disabled={busy}
            fullWidth
            icon={<MaterialIcons name="check" size={18} color={onPrimary} />}
          />
        </YStack>
      ) : null}
    </XStack>
  );
}
