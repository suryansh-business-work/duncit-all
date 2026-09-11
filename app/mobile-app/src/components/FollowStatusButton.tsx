import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import type { FollowStatus } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** Visual tokens per follow state, resolved once so the render stays a flat,
 * low-complexity pass (no token ternary per JSX prop). */
type FollowView = Readonly<{
  aria: string;
  background: string;
  icon: IconName;
  iconColor: string;
  labelColor: string;
}>;

/** The resting Follow is the green pill; both live states (a pending ask, an
 * existing follow) read as a soft pill. REQUESTED is tappable — it withdraws
 * the pending ask — so it is never drawn disabled. */
function followView(status: FollowStatus, onPrimary: string, ink: string): FollowView {
  if (status === 'FOLLOWING') {
    return {
      aria: 'Unfollow user',
      background: '$soft',
      icon: 'how-to-reg',
      iconColor: ink,
      labelColor: '$color',
    };
  }
  if (status === 'REQUESTED') {
    return {
      aria: 'Withdraw follow request',
      background: '$soft',
      icon: 'hourglass-top',
      iconColor: ink,
      labelColor: '$color',
    };
  }
  return {
    aria: 'Follow user',
    background: '$primary',
    icon: 'person-add-alt',
    iconColor: onPrimary,
    labelColor: '$onPrimary',
  };
}

/**
 * The three-state follow pill — Follow (or Follow Back) / Requested / Following
 * — used wherever a person's follow state is shown: the public profile and the
 * followers/following lists. Inert while busy. The label is the caller's, so
 * `followButtonLabelKey` decides "Follow" vs "Follow Back" in one place. Twin
 * of mWeb's <FollowButton/> (rule 27).
 */
export function FollowStatusButton({
  status,
  label,
  busy,
  onPress,
  testID = 'public-profile-follow',
}: Readonly<{
  status: FollowStatus;
  label: string;
  busy: boolean;
  onPress: () => void;
  testID?: string;
}>) {
  const { onPrimary, color: ink } = useThemeColors();
  const view = followView(status, onPrimary, ink);
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={view.aria}
      aria-disabled={busy}
      onPress={busy ? undefined : onPress}
      alignSelf="center"
      alignItems="center"
      gap={8}
      height={44}
      paddingHorizontal={20}
      borderRadius={999}
      backgroundColor={view.background}
      opacity={busy ? 0.7 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name={view.icon} size={18} color={view.iconColor} />
      <Text fontSize={14} fontWeight="600" color={view.labelColor}>
        {label}
      </Text>
    </XStack>
  );
}
