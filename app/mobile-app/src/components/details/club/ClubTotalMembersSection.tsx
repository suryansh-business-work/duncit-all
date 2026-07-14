import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  count: number;
}

/** The club's follower count as a dedicated card — the single truth for
 * "Total Members". RN twin of mWeb's ClubTotalMembersSection. */
export function ClubTotalMembersSection({ count }: Readonly<Props>) {
  const { primary } = useThemeColors();
  // The brand primary is a 6-digit hex (@duncit/auth-tokens), so the `29` suffix
  // is a 16% alpha channel — the same tint mWeb gets from alpha(primary, 0.16).
  const badgeTint = `${primary}29`;
  return (
    <XStack
      testID="club-total-members"
      alignItems="center"
      gap={12}
      padding={14}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <YStack
        width={44}
        height={44}
        borderRadius={22}
        alignItems="center"
        justifyContent="center"
        backgroundColor={badgeTint}
      >
        <MaterialIcons name="groups" size={24} color={primary} />
      </YStack>
      <YStack flex={1} gap={2}>
        <Text fontSize={16} fontWeight="900" color="$color">
          Total Members
        </Text>
        <Text fontSize={12.5} color="$muted">
          People following this club
        </Text>
      </YStack>
      <Text fontSize={22} fontWeight="900" color="$primary">
        {count}
      </Text>
    </XStack>
  );
}
