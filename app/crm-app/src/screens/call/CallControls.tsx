import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import type { ControlAction } from '@/features/calls/callLine';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  muted: boolean;
  onHold: boolean;
  /** Mute and hold need a connected call; End works from the first ring. */
  connected: boolean;
  busy: ControlAction | null;
  onControl: (action: ControlAction) => void;
}

/** Mute / Hold / End call — the portal's controls. One in flight disables them all, so a double tap never sends two. */
export function CallControls({ muted, onHold, connected, busy, onControl }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const locked = busy !== null;
  const muteLabel = muted ? t('crm.call.unmute') : t('crm.call.mute');
  const holdLabel = onHold ? t('crm.call.resume') : t('crm.call.hold');
  const icon = (name: keyof typeof MaterialIcons.glyphMap, color: string | undefined) => (
    <MaterialIcons name={name} size={20} color={color} />
  );

  return (
    <YStack gap="$2">
      <XStack gap="$2">
        <YStack flex={1}>
          <DuncitButton
            label={muteLabel}
            onPress={() => onControl(muted ? 'UNMUTE' : 'MUTE')}
            disabled={!connected || locked}
            variant={muted ? 'solid' : 'outline'}
            icon={icon(
              muted ? 'mic-off' : 'mic',
              muted ? theme.onPrimary?.val : theme.accentText?.val,
            )}
            fullWidth
            testID="call-mute"
          />
        </YStack>
        <YStack flex={1}>
          <DuncitButton
            label={holdLabel}
            onPress={() => onControl(onHold ? 'RESUME' : 'HOLD')}
            disabled={!connected || locked}
            variant={onHold ? 'solid' : 'outline'}
            icon={icon(
              onHold ? 'play-arrow' : 'pause',
              onHold ? theme.onPrimary?.val : theme.accentText?.val,
            )}
            fullWidth
            testID="call-hold"
          />
        </YStack>
      </XStack>
      {connected ? null : (
        <Text color="$muted" fontSize="$2" textAlign="center">
          {t('crm.call.controlsHint')}
        </Text>
      )}
      <DuncitButton
        label={busy === 'END' ? t('crm.call.ending') : t('crm.call.endCall')}
        onPress={() => onControl('END')}
        disabled={locked}
        tone="danger"
        icon={icon('call-end', theme.onDanger?.val)}
        fullWidth
        testID="call-end"
      />
    </YStack>
  );
}
