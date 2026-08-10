import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

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
  const { muted, danger, success } = useThemeColors();

  return (
    <YStack
      testID={testID}
      gap={6}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
    >
      <XStack alignItems="center" gap={10}>
        <MaterialIcons
          name={connected ? 'check-circle' : 'radio-button-unchecked'}
          size={20}
          color={connected ? success : muted}
        />
        <YStack flex={1} gap={1}>
          <Text fontSize={13.5} fontWeight="700" color="$color">
            {label}
          </Text>
          <Text testID={`${testID}-value`} fontSize={12.5} color="$muted" numberOfLines={1}>
            {value}
          </Text>
          {status ? (
            <Text fontSize={11.5} color="$muted">
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
            paddingHorizontal={12}
            paddingVertical={7}
            borderRadius={10}
            borderWidth={1}
            borderColor={danger}
            opacity={busy ? 0.5 : 1}
            pressStyle={{ opacity: 0.75 }}
          >
            <Text fontSize={12.5} fontWeight="700" color="$danger">
              {actionLabel}
            </Text>
          </XStack>
        ) : null}
      </XStack>

      {hint ? (
        <Text testID={`${testID}-hint`} fontSize={11.5} color="$muted">
          {hint}
        </Text>
      ) : null}
    </YStack>
  );
}
