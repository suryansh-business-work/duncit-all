import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

/** Bordered Follow / Following pill used on pod + club details. Filled when
 * followed, outlined otherwise — matching the public-profile follow button. */
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
      paddingHorizontal={20}
      paddingVertical={10}
      borderRadius={999}
      borderWidth={1}
      borderColor={following ? '$primary' : '$borderColor'}
      backgroundColor={following ? '$primary' : 'transparent'}
      opacity={busy ? 0.7 : 1}
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons
        name={following ? 'how-to-reg' : 'person-add-alt'}
        size={18}
        color={following ? onPrimary : ink}
      />
      <Text fontSize={14} fontWeight="900" color={following ? '$onPrimary' : '$color'}>
        {following ? 'Following' : 'Follow'}
      </Text>
    </XStack>
  );
}
