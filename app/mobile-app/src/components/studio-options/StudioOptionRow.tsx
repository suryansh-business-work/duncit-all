import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface Props {
  icon: IconName;
  title: string;
  hint: string;
  /** Set when the option opens the Partner app — said under the hint. */
  external?: string;
  onPress: () => void;
  testID: string;
}

/**
 * One option on a studio's Options page: icon disc, title, its one-line hint
 * and a trailing chevron (or an open-in-new arrow when it leaves the app). The
 * whole row is ONE control, so the hint rides as its accessibility hint.
 * mWeb twin: studio-options/StudioOptionRow.
 */
export function StudioOptionRow({ icon, title, hint, external, onPress, testID }: Readonly<Props>) {
  const { color: ink, muted } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={title}
      accessibilityHint={external ? `${hint}. ${external}` : hint}
      tabIndex={0}
      onPress={onPress}
      pressStyle={PRESS_STYLE.row}
      alignItems="center"
      gap={12}
      minHeight={64}
      paddingHorizontal={16}
      paddingVertical={12}
    >
      <YStack
        width={40}
        height={40}
        borderRadius={20}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$soft"
      >
        <MaterialIcons name={icon} size={20} color={ink} />
      </YStack>
      <YStack flex={1} minWidth={0} gap={2}>
        <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
          {title}
        </Text>
        <Text fontSize={12.5} color="$muted" numberOfLines={2}>
          {hint}
        </Text>
        {external ? (
          <Text testID={`${testID}-external`} fontSize={11.5} fontWeight="600" color="$accent">
            {external}
          </Text>
        ) : null}
      </YStack>
      <MaterialIcons name={external ? 'open-in-new' : 'chevron-right'} size={20} color={muted} />
    </XStack>
  );
}
