import { Spinner, YStack } from 'tamagui';

import { Reveal } from '@/animations/Reveal';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import type { PodIdea } from '@/hooks/usePodIdeas';
import { useTranslation } from '@/hooks/useTranslation';
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
  const { t } = useTranslation();
  const cardActions = (idea: PodIdea) => ({
    onOpen: () => onOpen(idea.id),
    onLike: () => onLike(idea.id),
    onShare: () => onShare(idea),
    onDelete: () => onDelete(idea.id),
  });

  return (
    <YStack gap={12}>
      {myIdeas.length > 0 ? (
        <YStack gap={12} marginBottom={12}>
          <SectionHeader title="Your submissions" />
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
        <EmptyState
          icon="lightbulb-outline"
          title={t('mweb.podIdeas.noIdeasYetBeTheFirst')}
          testID="pod-ideas-empty"
        />
      ) : null}

      {ideas.map((idea, index) => (
        <Reveal key={idea.id} index={index} scale>
          <IdeaCard idea={idea} myId={myId} {...cardActions(idea)} />
        </Reveal>
      ))}
    </YStack>
  );
}
