import type { ReactNode } from 'react';
import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fireAndForget } from '@/utils/fire-and-forget';

/**
 * Rows with no id of their own (events, proofs), each given a stable key from
 * what it is plus how many alike came before, so two at the same moment never clash.
 */
export function keyedRows<T>(rows: readonly T[], base: (row: T) => string) {
  const seen = new Map<string, number>();
  return rows.map((row) => {
    const name = base(row);
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    return { row, key: `${name}-${count}` };
  });
}

/** One titled card of the rental detail: Rented by, Pod, Money, Refund… */
export function DetailSection({
  title,
  testID,
  children,
  action,
}: Readonly<{ title: string; testID: string; children: ReactNode; action?: ReactNode }>) {
  return (
    <SurfaceCard gap={8} testID={testID}>
      <XStack alignItems="center" justifyContent="space-between" gap={8}>
        <Text role="heading" fontSize={14} fontWeight="700" color="$color">
          {title}
        </Text>
        {action}
      </XStack>
      {children}
    </SurfaceCard>
  );
}

/** A phone number the venue can tap to call. */
export function PhoneLink({
  phone,
  label,
  testID,
}: Readonly<{ phone: string; label: string; testID: string }>) {
  const { primary } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="link"
      aria-label={`${label} ${phone}`}
      tabIndex={0}
      alignItems="center"
      gap={6}
      minHeight={44}
      pressStyle={PRESS_STYLE.row}
      onPress={() => fireAndForget(Linking.openURL(`tel:${phone}`))}
    >
      <MaterialIcons name="phone" size={16} color={primary} />
      <Text fontSize={13.5} fontWeight="600" color="$accent">
        {phone}
      </Text>
    </XStack>
  );
}
