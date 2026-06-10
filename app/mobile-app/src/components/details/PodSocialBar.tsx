import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface Props {
  liked: boolean;
  likeCount: number;
  commentCount: number;
  onToggleLike: () => void;
  onOpenComments: () => void;
}

function SocialButton({
  testID,
  icon,
  label,
  active,
  onPress,
}: Readonly<{
  testID: string;
  icon: IconName;
  label: string;
  active?: boolean;
  onPress: () => void;
}>) {
  const { color, danger } = useThemeColors();
  const fg = active ? '#ffffff' : color;
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      alignItems="center"
      gap={8}
      paddingHorizontal={16}
      height={42}
      borderRadius={999}
      borderWidth={1}
      borderColor={active ? danger : '$borderColor'}
      backgroundColor={active ? danger : 'transparent'}
      pressStyle={{ opacity: 0.8 }}
    >
      <MaterialIcons name={icon} size={18} color={active ? '#ffffff' : color} />
      <Text fontSize={14} fontWeight="800" color={fg}>
        {label}
      </Text>
    </XStack>
  );
}

/** Like + Comment action row — RN port of mWeb's PodSocialBar. Both are
 * clickable: Like toggles optimistically, Comment opens the comments sheet. */
export function PodSocialBar({
  liked,
  likeCount,
  commentCount,
  onToggleLike,
  onOpenComments,
}: Readonly<Props>) {
  return (
    <XStack paddingHorizontal={16} gap={12} flexWrap="wrap">
      <SocialButton
        testID="pod-like-btn"
        icon={liked ? 'favorite' : 'favorite-border'}
        label={`${liked ? 'Liked' : 'Like'} · ${likeCount}`}
        active={liked}
        onPress={onToggleLike}
      />
      <SocialButton
        testID="pod-comment-btn"
        icon="chat-bubble-outline"
        label={`Comment · ${commentCount}`}
        onPress={onOpenComments}
      />
    </XStack>
  );
}
