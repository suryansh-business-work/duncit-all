import { ScrollView } from 'react-native';
import { Text, XStack } from 'tamagui';
import type { NotificationChip, NotificationFilterKey } from '@duncit/utils';

interface Props {
  chips: NotificationChip[];
  value: NotificationFilterKey;
  onChange: (key: NotificationFilterKey) => void;
}

/** Category filter row — Tamagui twin of mWeb's NotificationFilterChips (rule 27).
 * Only categories actually present get a chip. */
export function NotificationFilterChips({ chips, value, onChange }: Readonly<Props>) {
  if (chips.length <= 2) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // react-native-web puts flexGrow/flexShrink: 1 on every ScrollView, so a
      // horizontal one in a flex column steals half the screen from the list.
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 10, gap: 8 }}
    >
      {chips.map((chip) => {
        const active = value === chip.key;
        return (
          <XStack
            key={chip.key}
            testID={`notif-chip-${chip.key}`}
            role="button"
            aria-label={chip.label}
            aria-pressed={active}
            onPress={() => onChange(chip.key)}
            alignItems="center"
            height={34}
            paddingHorizontal={14}
            borderRadius={999}
            borderWidth={1}
            borderColor={active ? '$primary' : '$borderColor'}
            backgroundColor={active ? '$primary' : '$surface'}
            pressStyle={{ opacity: 0.85 }}
          >
            <Text fontSize={13} fontWeight="700" color={active ? '$onPrimary' : '$color'}>
              {chip.label} {chip.count}
            </Text>
          </XStack>
        );
      })}
    </ScrollView>
  );
}
