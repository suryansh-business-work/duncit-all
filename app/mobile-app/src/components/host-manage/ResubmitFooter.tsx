import { Spinner, Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  busy: boolean;
  onCancel?: () => void;
  onSubmit: () => void;
}

/** Cancel / Resubmit action row for the resubmission sheet. */
export function ResubmitFooter({ busy, onCancel, onSubmit }: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  return (
    <XStack gap={12} paddingTop={12}>
      <XStack
        testID="pod-resubmit-cancel"
        role="button"
        aria-label="Cancel"
        aria-disabled={busy}
        onPress={onCancel}
        flex={1}
        height={46}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        opacity={busy ? 0.6 : 1}
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={14} fontWeight="800" color="$color">
          Cancel
        </Text>
      </XStack>
      <XStack
        testID="pod-resubmit-save"
        role="button"
        aria-label="Resubmit request"
        aria-disabled={busy}
        onPress={busy ? undefined : onSubmit}
        flex={1}
        height={46}
        alignItems="center"
        justifyContent="center"
        gap={8}
        borderRadius={12}
        backgroundColor="$primary"
        opacity={busy ? 0.7 : 1}
        pressStyle={{ opacity: 0.85 }}
      >
        {busy ? <Spinner size="small" color={onPrimary} /> : null}
        <Text fontSize={14} fontWeight="900" color="$onPrimary">
          {busy ? 'Resubmitting…' : 'Resubmit request'}
        </Text>
      </XStack>
    </XStack>
  );
}
