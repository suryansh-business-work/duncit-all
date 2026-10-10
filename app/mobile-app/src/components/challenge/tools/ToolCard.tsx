import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import type { ChallengeToolActions } from '@/hooks/useChallengeToolActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { useThemeColors } from '@/hooks/useThemeColors';

/** What every tool panel is given — the same contract as mWeb's PanelProps (rule 27). */
export interface PanelProps {
  challenge: Pick<PodChallengeView, 'id' | 'status' | 'competitors' | 'viewer'>;
  tool: PodChallengeView['tools'][number];
  actions: ChallengeToolActions;
}

interface Props {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  testID: string;
  children: ReactNode;
}

/** The frame every tool panel shares: an icon, the tool's label, its content. */
export function ToolCard({ icon, title, testID, children }: Readonly<Props>) {
  const colors = useThemeColors();
  return (
    <SurfaceCard gap={10} testID={testID}>
      <XStack alignItems="center" gap={8}>
        <MaterialIcons name={icon} size={20} color={colors.primary} />
        <Text flex={1} fontSize={16} fontWeight="700" color="$color" role="heading">
          {title}
        </Text>
      </XStack>
      {children}
    </SurfaceCard>
  );
}

/** A quiet line of status text under a tool. */
export function ToolNote({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Text fontSize={14} color="$muted">
      {children}
    </Text>
  );
}

/** A determinate bar; the number it shows is always written beside it in text. */
export function ProgressBar({ percent }: Readonly<{ percent: number }>) {
  return (
    <YStack height={6} borderRadius={999} backgroundColor="$soft" overflow="hidden" aria-hidden>
      <YStack
        height={6}
        width={`${Math.min(100, Math.max(0, percent))}%`}
        backgroundColor="$primary"
      />
    </YStack>
  );
}
