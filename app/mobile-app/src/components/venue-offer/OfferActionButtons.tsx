import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** Prefixes each button's test id: `${testIDPrefix}-accept` and so on. */
  testIDPrefix: string;
  /** What the reader may do now (`venueOfferActions` / `hostOfferActions`). */
  actions: { accept: boolean; reject: boolean; counter: boolean };
  /** The reader's counters left of their share (`offerCounterAllowance`); null when no limit is known. */
  allowance?: { left: number; of: number } | null;
  /** A free venue or a free pod (`isFreeArrangement`): it is only accepted or declined — said in place of the counters. */
  free?: boolean;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
  onCounter: () => void;
}

/**
 * A booking offer's answers, for either side: reject as the outlined danger
 * pill, counter outlined — "change counter" while the reader's own counter
 * waits (they cannot accept then) — and accept as the solid one. Each opens its
 * own sheet: nothing is decided by one tap. Under them, how many counters the
 * reader has left — or, once their share is used, that only accept or reject
 * remain (Counter is gone then). A free booking takes no counters at all, and
 * says so instead.
 */
export function OfferActionButtons({
  testIDPrefix,
  actions,
  allowance = null,
  free = false,
  busy,
  onAccept,
  onReject,
  onCounter,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { danger, onPrimary, primary } = useThemeColors();
  if (!actions.accept && !actions.reject && !actions.counter) return null;
  let share = '';
  if (free) {
    share = t('availability.offers.freeNoCounters');
  } else if (allowance && actions.counter) {
    share = t('availability.offers.countersLeft', { vars: allowance });
  } else if (allowance?.left === 0 && actions.accept) {
    share = t('availability.offers.noCountersLeft');
  }

  return (
    <YStack gap={6}>
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
      {share ? (
        <Text testID={`${testIDPrefix}-counters-left`} fontSize={12} color="$muted">
          {share}
        </Text>
      ) : null}
    </YStack>
  );
}
