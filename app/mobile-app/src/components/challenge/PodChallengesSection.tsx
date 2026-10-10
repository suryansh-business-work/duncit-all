import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { YStack } from 'tamagui';
import { isChallengeFinished, isChallengeInPlay } from '@duncit/utils';

import { usePodChallenges } from '@/hooks/usePodChallenges';
import type { RootStackParamList } from '@/navigation/types';

import { ChallengeResultCard } from './ChallengeResultCard';
import { LiveChallengeCard } from './LiveChallengeCard';

interface Props {
  podId: string;
  /** Pod History shows finished challenges only; Pod Details also shows live ones. */
  finishedOnly?: boolean;
}

/**
 * The pod's challenges as the server lets this viewer see them. Before a
 * challenge starts nothing shows; during play each live one gets a live card;
 * after completion its published result replaces it. The Tamagui twin of
 * mWeb's PodChallengesSection (rule 27).
 */
export function PodChallengesSection({ podId, finishedOnly }: Readonly<Props>) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { challenges } = usePodChallenges(podId);
  const open = (pod: string, challengeId: string) =>
    navigation.navigate('ChallengeArena', { podId: pod, challengeId });
  const live = finishedOnly
    ? []
    : challenges.filter((c) => isChallengeInPlay(c.status) && c.show_on_pod_details);
  const finished = challenges.filter((c) => isChallengeFinished(c.status) && c.result);
  if (!live.length && !finished.length) return null;

  return (
    <YStack gap={12} testID="pod-challenges">
      {live.map((c) => (
        <LiveChallengeCard key={c.id} challengeId={c.id} onOpen={open} />
      ))}
      {finished.map((c) => (
        <ChallengeResultCard key={c.id} challenge={c} onView={() => open(c.pod_id, c.id)} />
      ))}
    </YStack>
  );
}
