import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

/** One row on the roster: who, and (for companions) the phone on file. */
export interface ChecklistPerson {
  /** Stable identity for React — user id for the buyer, phone for companions. */
  key: string;
  primary: string;
  secondary?: string;
}

interface Props {
  title: string;
  people: ChecklistPerson[];
}

/**
 * The green-tick roster of everyone a ticket has accounted for — the Tamagui
 * twin of mWeb's CompanionsChecklist (rule 27).
 *
 * A group check-in that only swaps one line of text reads as "nothing
 * happened" — this list shows each person by name with an explicit tick.
 */
export function CompanionsChecklist({ title, people }: Readonly<Props>) {
  const { success } = useThemeColors();
  if (people.length === 0) return null;
  return (
    <YStack gap={6} testID="scan-checked-in-list">
      <Text fontSize={14} fontWeight="700" color="$color">
        {title}
      </Text>
      {people.map((person) => (
        <XStack key={person.key} alignItems="center" gap={8}>
          <MaterialIcons name="check-circle" size={18} color={success} />
          <Text fontSize={13} fontWeight="600" color="$color" numberOfLines={1}>
            {person.primary}
          </Text>
          {person.secondary ? (
            <Text fontSize={12} color="$muted" numberOfLines={1}>
              {person.secondary}
            </Text>
          ) : null}
        </XStack>
      ))}
    </YStack>
  );
}
