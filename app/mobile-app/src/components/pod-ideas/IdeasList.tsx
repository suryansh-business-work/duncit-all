import { Spinner, Text, YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import type { PodIdea } from '@/hooks/usePodIdeas';
import { IdeaCard } from './IdeaCard';

interface Props {
  isLoading: boolean;
  hasData: boolean;
  ideas: PodIdea[];
  myIdeas: PodIdea[];
  myId?: string;
  onOpen: (id: string) => void;
  onLike: (id: string) => void;
  onShare: (idea: PodIdea) => void;
  onDelete: (id: string) => void;
}

/** The two idea sections — the viewer's own (non-approved) submissions and the
 * public approved feed, with loading + empty states. RN port of mWeb's IdeasList. */
export function IdeasList({
  isLoading,
  hasData,
  ideas,
  myIdeas,
  myId,
  onOpen,
  onLike,
  onShare,
  onDelete,
}: Readonly<Props>) {
  const cardActions = (idea: PodIdea) => ({
    onOpen: () => onOpen(idea.id),
    onLike: () => onLike(idea.id),
    onShare: () => onShare(idea),
    onDelete: () => onDelete(idea.id),
  });

  return (
    <YStack gap={16}>
      {myIdeas.length > 0 ? (
        <YStack gap={10}>
          <Text fontSize={12} fontWeight="900" color="$muted" textTransform="uppercase">
            Your submissions
          </Text>
          {myIdeas.map((idea, index) => (
            <Reveal key={idea.id} index={index} scale>
              <IdeaCard idea={idea} myId={myId} showStatus {...cardActions(idea)} />
            </Reveal>
          ))}
        </YStack>
      ) : null}

      {isLoading && !hasData ? (
        <YStack alignItems="center" paddingVertical={32}>
          <Spinner testID="pod-ideas-loading" color="$primary" />
        </YStack>
      ) : null}

      {!(isLoading && !hasData) && ideas.length === 0 ? (
        <Text testID="pod-ideas-empty" color="$muted" paddingVertical={16}>
          No ideas yet — be the first to share one!
        </Text>
      ) : null}

      {ideas.map((idea, index) => (
        <Reveal key={idea.id} index={index} scale>
          <IdeaCard idea={idea} myId={myId} {...cardActions(idea)} />
        </Reveal>
      ))}
    </YStack>
  );
}
