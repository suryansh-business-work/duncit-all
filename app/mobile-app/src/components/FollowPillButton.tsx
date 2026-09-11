import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Follow / Following pill used on pod + club details: the green pill to
 * follow, a soft pill once followed — matching the public-profile follow button. */
export function FollowPillButton({
  following,
  busy,
  onToggle,
  testID,
}: Readonly<{
  following: boolean;
  busy: boolean;
  onToggle: () => void;
  testID?: string;
}>) {
  const { onPrimary, color: ink } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={following ? 'Unfollow' : 'Follow'}
      aria-disabled={busy}
      onPress={busy ? undefined : onToggle}
      alignSelf="flex-start"
      alignItems="center"
      gap={8}
      height={44}
      paddingHorizontal={20}
      borderRadius={999}
      backgroundColor={following ? '$soft' : '$primary'}
      opacity={busy ? 0.7 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons
        name={following ? 'how-to-reg' : 'person-add-alt'}
        size={18}
        color={following ? ink : onPrimary}
      />
      <Text fontSize={14} fontWeight="600" color={following ? '$color' : '$onPrimary'}>
        {following ? 'Following' : 'Follow'}
      </Text>
    </XStack>
  );
}
