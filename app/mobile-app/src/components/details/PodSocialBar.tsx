import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

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
  const { color, accent } = useThemeColors();
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
      borderColor="$cardBorder"
      backgroundColor="$surface"
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name={icon} size={18} color={active ? accent : color} />
      <Text fontSize={14} fontWeight="600" color="$color">
        {label}
      </Text>
    </XStack>
  );
}

/** Like + Comment as surface pills on the page ground — RN port of mWeb's
 * PodSocialBar. Like toggles optimistically (the heart turns coral), Comment
 * opens the comments sheet. */
export function PodSocialBar({
  liked,
  likeCount,
  commentCount,
  onToggleLike,
  onOpenComments,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const likeLabel = liked
    ? t('mweb.podDetails.likedCount', { vars: { count: likeCount } })
    : t('mweb.podDetails.likeCount', { vars: { count: likeCount } });
  return (
    <XStack paddingHorizontal={16} gap={12} flexWrap="wrap">
      <SocialButton
        testID="pod-like-btn"
        icon={liked ? 'favorite' : 'favorite-border'}
        label={likeLabel}
        active={liked}
        onPress={onToggleLike}
      />
      <SocialButton
        testID="pod-comment-btn"
        icon="chat-bubble-outline"
        label={t('mweb.podDetails.commentCount', { vars: { count: commentCount } })}
        onPress={onOpenComments}
      />
    </XStack>
  );
}
