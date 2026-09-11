import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import type { PodIdea } from '@/hooks/usePodIdeas';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatRelative } from '@/utils/date-format';
import { categoryPathLabel } from '@/utils/idea-category';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { IdeaCardActions } from './IdeaCardActions';

interface Props {
  idea: PodIdea;
  myId?: string;
  onOpen: () => void;
  onLike: () => void;
  onShare: () => void;
  onDelete: () => void;
  showStatus?: boolean;
}

/** Theme token for the submission-status chip (only shown on the viewer's own ideas). */
function statusColor(status: string): '$success' | '$danger' | '$warning' {
  if (status === 'APPROVED') return '$success';
  if (status === 'REJECTED') return '$danger';
  return '$warning';
}

/** A soft meta pill under the description — the idea number or its category. */
function MetaPill({
  testID,
  label,
  icon,
}: Readonly<{ testID: string; label: string; icon?: boolean }>) {
  const { muted } = useThemeColors();
  return (
    <XStack
      testID={testID}
      alignItems="center"
      gap={4}
      height={24}
      paddingHorizontal={10}
      borderRadius={999}
      backgroundColor="$soft"
    >
      {icon ? <MaterialIcons name="local-offer" size={12} color={muted} /> : null}
      <Text fontSize={11} fontWeight="600" color="$muted">
        {label}
      </Text>
    </XStack>
  );
}

/** A single pod idea on a surface card: author header, title/description (tap
 * to open), meta pills and the like / comment / share row. RN port of mWeb's
 * IdeaCard. */
export function IdeaCard({
  idea,
  myId,
  onOpen,
  onLike,
  onShare,
  onDelete,
  showStatus,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { danger } = useThemeColors();
  const author = idea.author;
  const isMine = !!myId && idea.author_id === myId;
  const initial = (author?.first_name?.[0] ?? author?.full_name?.[0] ?? 'U').toUpperCase();
  const categoryPath = categoryPathLabel(idea);

  return (
    <SurfaceCard testID={`idea-card-${idea.id}`} gap={12}>
      <XStack alignItems="center" gap={10}>
        <YStack
          width={36}
          height={36}
          borderRadius={18}
          backgroundColor="$soft"
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={15} fontWeight="600" color="$color">
            {initial}
          </Text>
        </YStack>
        <YStack flex={1}>
          <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
            {author?.full_name ?? 'Member'}
          </Text>
          <Text fontSize={12} color="$muted">
            {formatRelative(idea.created_at)}
          </Text>
        </YStack>
        {showStatus ? (
          <XStack
            height={24}
            alignItems="center"
            paddingHorizontal={10}
            borderRadius={999}
            backgroundColor={statusColor(idea.status)}
          >
            <Text fontSize={11} fontWeight="600" color="$onPrimary">
              {idea.status}
            </Text>
          </XStack>
        ) : null}
        {isMine ? (
          <XStack
            testID={`idea-delete-${idea.id}`}
            role="button"
            aria-label={t('mweb.podIdeas.deleteIdea')}
            onPress={onDelete}
            padding={4}
            pressStyle={PRESS_STYLE.inline}
          >
            <MaterialIcons name="delete-outline" size={18} color={danger} />
          </XStack>
        ) : null}
      </XStack>

      <YStack
        role="button"
        aria-label={idea.title}
        onPress={onOpen}
        gap={4}
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={16} fontWeight="600" color="$color">
          {idea.title}
        </Text>
        <Text fontSize={14} color="$muted" numberOfLines={4} lineHeight={20}>
          {idea.description}
        </Text>
      </YStack>

      {idea.idea_no || categoryPath ? (
        <XStack alignItems="center" gap={8} flexWrap="wrap">
          {idea.idea_no ? <MetaPill testID={`idea-no-${idea.id}`} label={idea.idea_no} /> : null}
          {categoryPath ? (
            <MetaPill testID={`idea-category-${idea.id}`} label={categoryPath} icon />
          ) : null}
        </XStack>
      ) : null}

      <IdeaCardActions idea={idea} onOpen={onOpen} onLike={onLike} onShare={onShare} />
    </SurfaceCard>
  );
}
