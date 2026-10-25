import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** Prefixes each button's test id: `${testIDPrefix}-accept` and so on. */
  testIDPrefix: string;
  /** What the reader may do now (`venueOfferActions` / `hostOfferActions`). */
  actions: { accept: boolean; reject: boolean; counter: boolean };
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
  onCounter: () => void;
}

/**
 * A booking offer's answers, for either side: reject as the outlined danger
 * pill, counter outlined — "change counter" while the reader's own counter
 * waits (they cannot accept then) — and accept as the solid one. Each opens its
 * own sheet: nothing is decided by one tap.
 */
export function OfferActionButtons({
  testIDPrefix,
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
            testID={`${testIDPrefix}-reject`}
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
            testID={`${testIDPrefix}-counter`}
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
            testID={`${testIDPrefix}-accept`}
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
