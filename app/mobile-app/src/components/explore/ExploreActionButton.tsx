import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** The dark translucent disc every control over a reel sits on — a black scrim
 * over media, legible on any frame in either theme. */
export const REEL_SCRIM = 'rgba(0,0,0,0.4)';

interface ExploreActionButtonProps {
  icon: IconName;
  /** The accessible name (and the More-menu text). */
  label: string;
  /** Count drawn under the disc (join spots, likes, comments). Label-only
   * actions (save, share, open) carry no caption — the icon says it. */
  caption?: string;
  onPress: () => void;
  active?: boolean;
  loading?: boolean;
  testID?: string;
  /** Optional separate press on the caption (e.g. like count → who-liked list). */
  onLabelPress?: () => void;
}

/** A round dark disc over the reel, coral while active, with an optional count
 * under it — the reels' right-side rail. mWeb twin: ExploreActionButton. */
export function ExploreActionButton({
  icon,
  label,
  caption,
  onPress,
  active,
  loading,
  testID,
  onLabelPress,
}: Readonly<ExploreActionButtonProps>) {
  const { onPrimary } = useThemeColors();
  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      alignItems="center"
      gap={3}
      pressStyle={PRESS_STYLE.row}
    >
      <YStack
        width={44}
        height={44}
        borderRadius={22}
        alignItems="center"
        justifyContent="center"
        backgroundColor={active ? '$accent' : REEL_SCRIM}
      >
        {loading ? (
          <Spinner color={onPrimary} />
        ) : (
          <MaterialIcons name={icon} size={22} color={onPrimary} />
        )}
      </YStack>
      {caption ? (
        <Text
          pressStyle={PRESS_STYLE.inline}
          testID={onLabelPress ? `${testID}-count` : undefined}
          onPress={onLabelPress}
          fontSize={11}
          fontWeight="600"
          color="$onPrimary"
        >
          {caption}
        </Text>
      ) : null}
    </YStack>
  );
}
