import { ScrollView } from 'react-native';
import { Text, XStack } from 'tamagui';
import type { NotificationChip, NotificationFilterKey } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

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
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}
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
            height={36}
            paddingHorizontal={14}
            borderRadius={999}
            backgroundColor={active ? '$primary' : '$surface'}
            pressStyle={PRESS_STYLE.control}
          >
            <Text fontSize={13} fontWeight="600" color={active ? '$onPrimary' : '$color'}>
              {chip.label} {chip.count}
            </Text>
          </XStack>
        );
      })}
    </ScrollView>
  );
}
