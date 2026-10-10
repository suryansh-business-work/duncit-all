import { useState } from 'react';
import { Switch } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { CHALLENGE_ACTION_KEYS, CHALLENGE_CONFIRM_KEYS, CHALLENGE_TOGGLES } from '@duncit/utils';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

interface Props {
  challenge: PodChallengeView;
  actions: HostChallengeActions;
}

/**
 * Lifecycle moves the server allows right now, and the host's switches — the
 * Tamagui twin of mWeb's HostLifecycle + HostToggles (rule 27). Hiding a
 * challenge never stops it; a live one must be paused or ended before it can
 * be switched off (the server enforces the same).
 */
export function HostChallengeControls({ challenge, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  const [confirming, setConfirming] = useState('');
  const label = (action: string) => t(CHALLENGE_ACTION_KEYS[action] ?? action);
  const ask = CHALLENGE_CONFIRM_KEYS[confirming];
  const lockedOn = challenge.status === 'LIVE' && challenge.enabled;

  const run = (action: string) => {
    // Actions that end or freeze play ask first: they cannot be undone.
    if (CHALLENGE_CONFIRM_KEYS[action]) setConfirming(action);
    else fireAndForget(actions.transition(action));
  };

  return (
    <YStack gap={12}>
      <XStack gap={8} flexWrap="wrap">
        {challenge.viewer.allowed_actions.map((action) => (
          <DuncitButton
            key={action}
            size="sm"
            variant={action === 'START' || action === 'RESUME' ? 'solid' : 'outline'}
            tone={action === 'CANCEL' ? 'danger' : 'primary'}
            disabled={actions.busy}
            label={label(action)}
            onPress={() => run(action)}
            testID={`challenge-action-${action}`}
          />
        ))}
      </XStack>
      {CHALLENGE_TOGGLES.map(({ key, label: labelKey }) => (
        <XStack key={key} alignItems="center" gap={12}>
          <Text flex={1} fontSize={14} color="$color">
            {t(labelKey)}
          </Text>
          <Switch
            testID={`challenge-toggle-${key}`}
            aria-label={t(labelKey)}
            value={challenge[key]}
            disabled={actions.busy || (key === 'enabled' && lockedOn)}
            onValueChange={(next) => fireAndForget(actions.toggle(key, next))}
            trackColor={{ true: primary }}
          />
        </XStack>
      ))}
      {lockedOn && (
        <Text fontSize={12} color="$muted">
          {t('mweb.challenge.pauseBeforeOff')}
        </Text>
      )}
      <ConfirmDialog
        open={!!ask}
        title={ask ? t(ask.title) : ''}
        message={ask ? t(ask.body, { vars: { name: challenge.name } }) : ''}
        confirmLabel={label(confirming)}
        cancelLabel={t('mweb.challenge.cancel')}
        destructive={confirming === 'CANCEL'}
        busy={actions.busy}
        onCancel={() => setConfirming('')}
        onConfirm={() =>
          fireAndForget(actions.transition(confirming).then(() => setConfirming('')))
        }
        testID="challenge-transition-confirm"
      />
    </YStack>
  );
}
