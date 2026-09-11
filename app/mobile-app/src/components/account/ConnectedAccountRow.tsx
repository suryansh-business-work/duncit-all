import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  label: string;
  /** The address this method signs in with, or the not-connected placeholder. */
  value: string;
  /** Secondary line — "Active", or when the link was granted. */
  status?: string;
  connected: boolean;
  busy?: boolean;
  actionLabel?: string;
  /** Omitted when disconnecting is not allowed — see `hint`. */
  onAction?: () => void;
  /** Why the action is absent (Google is the only way in). */
  hint?: string;
  testID: string;
}

/** One sign-in method in Profile > Connected accounts. mWeb twin. */
export function ConnectedAccountRow({
  label,
  value,
  status,
  connected,
  busy,
  actionLabel,
  onAction,
  hint,
  testID,
}: Readonly<Props>) {
  const { muted, success } = useThemeColors();

  return (
    <YStack testID={testID} gap={6}>
      <XStack alignItems="center" gap={12}>
        <MaterialIcons
          name={connected ? 'check-circle' : 'radio-button-unchecked'}
          size={20}
          color={connected ? success : muted}
        />
        <YStack flex={1} gap={1}>
          <Text fontSize={15} fontWeight="500" color="$color">
            {label}
          </Text>
          <Text testID={`${testID}-value`} fontSize={14} color="$muted" numberOfLines={1}>
            {value}
          </Text>
          {status ? (
            <Text fontSize={12} color="$muted">
              {status}
            </Text>
          ) : null}
        </YStack>
        {actionLabel && onAction ? (
          <XStack
            testID={`${testID}-action`}
            role="button"
            aria-label={actionLabel}
            aria-disabled={busy}
            onPress={busy ? undefined : onAction}
            height={36}
            alignItems="center"
            paddingHorizontal={14}
            borderRadius={999}
            backgroundColor="$dangerSoft"
            opacity={busy ? 0.5 : 1}
            pressStyle={PRESS_STYLE.control}
          >
            <Text fontSize={13} fontWeight="600" color="$danger">
              {actionLabel}
            </Text>
          </XStack>
        ) : null}
      </XStack>

      {hint ? (
        <Text testID={`${testID}-hint`} fontSize={12} color="$muted">
          {hint}
        </Text>
      ) : null}
    </YStack>
  );
}
