import { useCallback, useEffect, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { PodChallengeScoreLogDocument } from '@/graphql/challenges';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { fireAndForget } from '@/utils/fire-and-forget';

import { ReasonSheet } from './ReasonSheet';

interface Entry {
  id: string;
  tool_instance_id: string;
  competitor_id: string;
  value: number;
  voided: boolean;
  void_reason: string;
  created_at: string;
}

interface Props {
  challenge: Pick<PodChallengeView, 'id' | 'status' | 'revision' | 'tools' | 'competitors'>;
  actions: HostChallengeActions;
}

/**
 * The latest score entries, each removable — the Tamagui twin of mWeb's
 * HostScoreLog (rule 27). Scores are never edited: removing one voids it, kept
 * on file with who and why. After the challenge ends a removal is a correction
 * and needs a reason.
 */
export function HostChallengeLog({ challenge, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [voiding, setVoiding] = useState<Entry | null>(null);
  const correcting = challenge.status !== 'LIVE';

  const load = useCallback(async () => {
    const res = await graphqlRequest(
      PodChallengeScoreLogDocument,
      { id: challenge.id },
      { auth: true },
    );
    setEntries(res.podChallengeScoreLog);
  }, [challenge.id]);

  // Re-read whenever the challenge moves: another device may have scored.
  useEffect(() => {
    fireAndForget(load());
  }, [load, challenge.revision]);

  const toolLabel = new Map(challenge.tools.map((tool) => [tool.instance_id, tool.label]));
  const name = new Map(challenge.competitors.map((c) => [c.competitor_id, c.name]));

  if (!entries.length) {
    return (
      <Text fontSize={14} color="$muted">
        {t('mweb.challenge.noScores')}
      </Text>
    );
  }
  return (
    <YStack gap={8}>
      {entries.map((e) => (
        <XStack
          key={e.id}
          alignItems="center"
          gap={8}
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
          paddingBottom={8}
        >
          <YStack flex={1}>
            <Text
              fontSize={14}
              color="$color"
              textDecorationLine={e.voided ? 'line-through' : 'none'}
            >
              {t('mweb.challenge.logEntry', {
                vars: {
                  name: name.get(e.competitor_id) ?? '—',
                  tool: toolLabel.get(e.tool_instance_id) ?? '—',
                  value: e.value,
                },
              })}
            </Text>
            <Text fontSize={12} color="$muted">
              {e.voided
                ? t('mweb.challenge.removed', { vars: { reason: e.void_reason || '—' } })
                : formatDateTime(e.created_at)}
            </Text>
          </YStack>
          {!e.voided && (
            <DuncitButton
              size="sm"
              variant="ghost"
              tone="danger"
              disabled={actions.busy}
              label={t('mweb.challenge.removeScore')}
              onPress={() => setVoiding(e)}
              testID={`challenge-log-remove-${e.id}`}
            />
          )}
        </XStack>
      ))}
      <ReasonSheet
        open={!!voiding}
        title={t('mweb.challenge.removeScoreTitle')}
        message={t(
          correcting ? 'mweb.challenge.removeScoreCorrection' : 'mweb.challenge.removeScoreBody',
        )}
        confirmLabel={t('mweb.challenge.removeScore')}
        required={correcting}
        busy={actions.busy}
        onClose={() => setVoiding(null)}
        onSubmit={(reason) => {
          if (!voiding) return;
          fireAndForget(
            actions.voidScore(voiding.id, reason || undefined).then((ok) => {
              if (ok) setVoiding(null);
            }),
          );
        }}
      />
    </YStack>
  );
}
