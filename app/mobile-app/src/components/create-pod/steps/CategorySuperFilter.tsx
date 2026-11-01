import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import type { CreatePodSuperOption } from '@duncit/utils';

import { ScrollRail } from '@/components/ScrollRail';

interface Props {
  options: readonly CreatePodSuperOption[];
  value: string;
  onChange: (id: string) => void;
  /** Names the row for screen readers ("Who the pod is for", "Category"). */
  label: string;
  testID: string;
}

/** One level of the category picker — "For You" / "For Your Pet", or "Sports" /
 * "Creative" — as a row of pills that scrolls sideways when it outgrows the
 * screen. mWeb twin: steps/CategorySuperFilter. */
export function CategorySuperFilter({ options, value, onChange, label, testID }: Readonly<Props>) {
  return (
    <XStack role="radiogroup" aria-label={label}>
      <ScrollRail testID={testID} gap={8} alignItems="center">
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <XStack
              key={option.id}
              testID={`${testID}-${option.id}`}
              tabIndex={0}
              role="radio"
              aria-label={option.name}
              aria-checked={selected}
              onPress={() => onChange(option.id)}
              minHeight={36}
              paddingHorizontal={14}
              borderRadius={999}
              borderWidth={1}
              borderColor={selected ? '$primary' : '$borderColor'}
              alignItems="center"
              justifyContent="center"
              backgroundColor={selected ? '$primary' : 'transparent'}
              pressStyle={PRESS_STYLE.control}
            >
              <Text
                fontSize={13}
                fontWeight="600"
                color={selected ? '$onPrimary' : '$color'}
                numberOfLines={1}
              >
                {option.name}
              </Text>
            </XStack>
          );
        })}
      </ScrollRail>
    </XStack>
  );
}
