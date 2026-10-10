import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { challengeItems, doneItemKeys, toolsFedBy } from '@duncit/utils';

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
            {challenge.competitors.map((c) => {
              const done = new Set(doneItemKeys(tool, c.competitor_id));
              return (
                <YStack key={c.competitor_id} gap={6}>
                  <Text fontSize={14} fontWeight="600" color="$color">
                    {c.name}
                  </Text>
                  <XStack gap={6} flexWrap="wrap" role="group" aria-label={c.name}>
                    {items.map((item) => (
                      <MediumToggle
                        key={item.key}
                        label={item.label}
                        selected={done.has(item.key)}
                        onPress={() => {
                          if (actions.busy) return;
                          fireAndForget(
                            actions.item(
                              tool.instance_id,
                              c.competitor_id,
                              item.key,
                              !done.has(item.key),
                            ),
                          );
                        }}
                      />
                    ))}
                  </XStack>
                </YStack>
              );
            })}
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
