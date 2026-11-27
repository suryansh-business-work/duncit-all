import { ScrollView } from 'react-native';
import { Text, XStack } from 'tamagui';

import { MOBILE } from '@/constants/design';
import { SelectChip } from './SelectChip';

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
 * One-of-many filter pills that scroll sideways under the screen edges, the
 * picked one on the accent wash (SelectChip). Picking the current one again
 * does nothing.
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
        {options.map((option) => (
          <SelectChip
            key={option.key}
            label={option.label}
            selected={option.key === value}
            onPress={() => {
              if (option.key !== value) onChange(option.key);
            }}
            testID={`${testID}-${option.key}`}
          />
        ))}
      </XStack>
    </ScrollView>
  );
}
