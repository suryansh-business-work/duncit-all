import { ScrollView } from 'react-native';
import { Text, XStack } from 'tamagui';

import { MOBILE, RADII } from '@/constants/design';
import { haptics } from '@/services/haptics';

export interface ChipOption<K extends string> {
  key: K;
  label: string;
}

interface Props<K extends string> {
  options: readonly ChipOption<K>[];
  value: K;
  onChange: (key: K) => void;
  label: string;
  /** Shows the label before the pills, for rows that would otherwise read the same ("All…"). */
  showLabel?: boolean;
  testID: string;
}

/**
 * One-of-many filter pills that scroll sideways under the screen edges: the
 * picked one filled with the accent wash, the rest outlined. Each pill keeps a
 * full touch target in height even though it draws smaller.
 */
export function FilterChips<K extends string>({
  options,
  value,
  onChange,
  label,
  showLabel = false,
  testID,
}: Readonly<Props<K>>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: MOBILE.gutter }}
    >
      <XStack gap="$2" alignItems="center" role="radiogroup" aria-label={label}>
        {showLabel ? (
          <Text color="$muted" fontSize="$2" aria-hidden>
            {label}
          </Text>
        ) : null}
        {options.map((option) => {
          const selected = option.key === value;
          return (
            <XStack
              key={option.key}
              accessible
              role="radio"
              aria-checked={selected}
              aria-label={option.label}
              onPress={() => {
                if (selected) return;
                haptics.tap();
                onChange(option.key);
              }}
              minHeight={36}
              hitSlop={(MOBILE.touch - 36) / 2}
              paddingHorizontal="$3"
              alignItems="center"
              borderRadius={RADII.pill}
              borderWidth={1}
              borderColor={selected ? '$primarySoft' : '$borderColor'}
              backgroundColor={selected ? '$primarySoft' : '$surface'}
              pressStyle={{ backgroundColor: '$hover' }}
              testID={`${testID}-${option.key}`}
            >
              <Text
                fontSize="$3"
                fontWeight={selected ? '700' : '500'}
                color={selected ? '$onPrimarySoft' : '$color'}
              >
                {option.label}
              </Text>
            </XStack>
          );
        })}
      </XStack>
    </ScrollView>
  );
}
