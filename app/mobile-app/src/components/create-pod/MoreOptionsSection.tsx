import { useState, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  testID: string;
  /** What is folded inside, so the host knows whether to open it. */
  hint: string;
  /** Opens it on arrival — something inside is already filled. */
  defaultOpen?: boolean;
  /** Holds it open — something inside failed validation and must be seen. */
  forceOpen?: boolean;
  children: ReactNode;
}

/** A step's optional extras folded under one row, so the step shows only what
 * every pod needs. The form keeps a folded field's value. mWeb twin. */
export function MoreOptionsSection({
  testID,
  hint,
  defaultOpen = false,
  forceOpen = false,
  children,
}: Readonly<Props>) {
  const [open, setOpen] = useState(defaultOpen);
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const shown = open || forceOpen;
  return (
    <YStack gap={16} testID={testID}>
      <XStack
        testID={`${testID}-toggle`}
        tabIndex={0}
        role="button"
        aria-expanded={shown}
        onPress={() => setOpen((value) => !value)}
        minHeight={56}
        alignItems="center"
        gap={12}
        paddingHorizontal={16}
        paddingVertical={10}
        borderRadius={12}
        borderWidth={1}
        borderColor="$cardBorder"
        backgroundColor="$surface"
        pressStyle={PRESS_STYLE.control}
      >
        <YStack flex={1} gap={2}>
          <Text fontSize={15} fontWeight="600" color="$color">
            {t('mweb.createPod.moreOptions')}
          </Text>
          <Text fontSize={12} color="$muted">
            {hint}
          </Text>
        </YStack>
        <MaterialIcons name={shown ? 'expand-less' : 'expand-more'} size={22} color={muted} />
      </XStack>
      {shown ? children : null}
    </YStack>
  );
}
