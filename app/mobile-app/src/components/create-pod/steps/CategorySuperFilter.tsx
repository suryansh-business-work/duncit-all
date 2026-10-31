import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import type { CreatePodSuperOption } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  options: readonly CreatePodSuperOption[];
  value: string;
  onChange: (id: string) => void;
}

/** "For You" / "For Your Pet" — narrows the category tiles to one
 * super-category. Names only: neither carries an icon (as in the app header).
 * mWeb twin: steps/CategorySuperFilter. */
export function CategorySuperFilter({ options, value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <XStack
      testID="create-pod-category-super"
      role="radiogroup"
      aria-label={t('mweb.createPod.categoryFor')}
      gap={4}
      padding={4}
      borderRadius={999}
      borderWidth={1}
      borderColor="$borderColor"
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <XStack
            key={option.id}
            testID={`create-pod-category-super-${option.id}`}
            tabIndex={0}
            role="radio"
            aria-label={option.name}
            aria-checked={selected}
            onPress={() => onChange(option.id)}
            flex={1}
            minHeight={44}
            paddingHorizontal={12}
            borderRadius={999}
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
    </XStack>
  );
}
