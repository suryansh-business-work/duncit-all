import { XStack } from 'tamagui';
import { parseJsonObject } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { fireAndForget } from '@/utils/fire-and-forget';

type Tool = PodChallengeView['tools'][number];

/** The steps an INCREMENT tool offers, with their negatives when it allows them. */
const stepsOf = (tool: Tool) => {
  const settings = parseJsonObject(tool.config_json);
  return ((settings.increments as number[] | undefined) ?? []).flatMap((s) =>
    settings.allow_negative ? [s, -s] : [s],
  );
};

/** One competitor's row of +/- score buttons for an INCREMENT tool. */
export function ScoreSteps({
  tool,
  competitorId,
  actions,
}: Readonly<{ tool: Tool; competitorId: string; actions: HostChallengeActions }>) {
  return (
    <XStack gap={6} flexWrap="wrap">
      {stepsOf(tool).map((step) => (
        <DuncitButton
          key={step}
          size="sm"
          variant={step > 0 ? 'solid' : 'outline'}
          disabled={actions.busy}
          label={step > 0 ? `+${step}` : String(step)}
          onPress={() => fireAndForget(actions.score(tool.instance_id, competitorId, step))}
          testID={`challenge-score-${tool.instance_id}-${competitorId}-${step}`}
        />
      ))}
    </XStack>
  );
}
