import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { challengeItems, doneItemKeys, toolsFedBy, type ChallengeItem } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { MediumToggle } from '@/components/attendance/AttendanceOtpControls';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

import { CheckpointLinksSheet } from './CheckpointLinksSheet';

interface Props {
  challenge: Pick<PodChallengeView, 'id' | 'tools' | 'competitors'>;
  actions: HostChallengeActions;
}

interface CompetitorItemsProps {
  tool: PodChallengeView['tools'][number];
  competitor: PodChallengeView['competitors'][number];
  items: ChallengeItem[];
  actions: HostChallengeActions;
}

/** One competitor's tasks or checkpoints, each a toggle the host ticks. */
function CompetitorItems({ tool, competitor, items, actions }: Readonly<CompetitorItemsProps>) {
  const done = new Set(doneItemKeys(tool, competitor.competitor_id));
  const toggle = (key: string) => {
    if (actions.busy) return;
    fireAndForget(actions.item(tool.instance_id, competitor.competitor_id, key, !done.has(key)));
  };
  return (
    <YStack gap={6}>
      <Text fontSize={14} fontWeight="600" color="$color">
        {competitor.name}
      </Text>
      <XStack gap={6} flexWrap="wrap" role="group" aria-label={competitor.name}>
        {items.map((item) => (
          <MediumToggle
            key={item.key}
            label={item.label}
            selected={done.has(item.key)}
            onPress={() => toggle(item.key)}
          />
        ))}
      </XStack>
    </YStack>
  );
}

/**
 * Ticking tasks and checkpoints for each competitor — the Tamagui twin of
 * mWeb's HostItemsControl (rule 27). A checkpoint can also be reached by the
 * competitor scanning its QR code; the codes are behind the button, and only
 * a host can fetch them.
 */
export function HostChallengeItems({ challenge, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const [qrFor, setQrFor] = useState<string | null>(null);

  return (
    <>
      {toolsFedBy(challenge.tools, 'CHECK', 'CHECKPOINT').map((tool) => {
        const items = challengeItems(tool);
        return (
          <YStack key={tool.instance_id} gap={8} aria-label={tool.label}>
            <XStack alignItems="center" gap={8}>
              <Text flex={1} fontSize={14} fontWeight="700" color="$color" role="heading">
                {tool.label}
              </Text>
              {tool.input_kind === 'CHECKPOINT' ? (
                <DuncitButton
                  size="sm"
                  variant="ghost"
                  label={t('mweb.challenge.tools.checkpointQr')}
                  onPress={() => setQrFor(tool.instance_id)}
                  testID={`challenge-checkpoint-qr-${tool.instance_id}`}
                />
              ) : null}
            </XStack>
            {challenge.competitors.map((c) => (
              <CompetitorItems
                key={c.competitor_id}
                tool={tool}
                competitor={c}
                items={items}
                actions={actions}
              />
            ))}
          </YStack>
        );
      })}
      <CheckpointLinksSheet
        challengeId={challenge.id}
        toolInstanceId={qrFor}
        onClose={() => setQrFor(null)}
      />
    </>
  );
}
