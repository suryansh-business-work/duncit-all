import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import type { PodIdea } from '@/hooks/usePodIdeas';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface CountProps {
  testID: string;
  label: string;
  icon: IconName;
  iconColor: string;
  count: number;
  onPress: () => void;
}

/** One muted icon + count action (like / comment / share). */
function CountAction({ testID, label, icon, iconColor, count, onPress }: Readonly<CountProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      alignItems="center"
      gap={5}
      pressStyle={PRESS_STYLE.inline}
    >
      <MaterialIcons name={icon} size={17} color={iconColor} />
      <Text fontSize={13} fontWeight="600" color="$muted">
        {count}
      </Text>
    </XStack>
  );
}

interface Props {
  idea: PodIdea;
  onOpen: () => void;
  onLike: () => void;
  onShare: () => void;
}

/** The idea card's like / comment / share row, under a hairline — a liked
 * heart turns coral. mWeb twin: the action row in IdeaCard. */
export function IdeaCardActions({ idea, onOpen, onLike, onShare }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted, accent } = useThemeColors();
  return (
    <XStack
      alignItems="center"
      gap={20}
      paddingTop={12}
      borderTopWidth={1}
      borderColor="$borderColor"
    >
      <CountAction
        testID={`idea-like-${idea.id}`}
        label={t('mweb.podIdeas.likeIdea')}
        icon={idea.liked_by_me ? 'favorite' : 'favorite-border'}
        iconColor={idea.liked_by_me ? accent : muted}
        count={idea.likes_count}
        onPress={onLike}
      />
      <CountAction
        testID={`idea-comment-${idea.id}`}
        label={t('mweb.podIdeas.commentOnIdea')}
        icon="chat-bubble-outline"
        iconColor={muted}
        count={idea.comments_count}
        onPress={onOpen}
      />
      <CountAction
        testID={`idea-share-${idea.id}`}
        label={t('mweb.podIdeas.shareIdea')}
        icon="share"
        iconColor={muted}
        count={idea.shares_count}
        onPress={onShare}
      />
    </XStack>
  );
}
