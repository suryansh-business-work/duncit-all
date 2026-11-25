import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';

export type RowTone = 'ok' | 'warn' | 'info';

const TONE_COLOR: Record<RowTone, string> = {
  ok: '$success',
  warn: '$danger',
  info: '$muted',
};

interface Props {
  label: string;
  value: string;
  tone: RowTone;
  /** What to do about it, in a sentence — shown under a row that needs action. */
  hint?: string;
  action?: { label: string; onPress: () => void };
  testID: string;
}

/** One line of Settings › Calling & recording: what it is, how it stands, and the fix. */
export function DiagnosticRow({ label, value, tone, hint, action, testID }: Readonly<Props>) {
  return (
    <YStack gap="$1" paddingVertical="$1" testID={testID}>
      <XStack alignItems="center" justifyContent="space-between" gap="$2">
        <Text flex={1}>{label}</Text>
        <Text color={TONE_COLOR[tone]} fontWeight="600" testID={`${testID}-value`}>
          {value}
        </Text>
      </XStack>
      {hint ? (
        <Text color="$muted" fontSize="$2">
          {hint}
        </Text>
      ) : null}
      {action ? (
        <XStack>
          <DuncitButton
            label={action.label}
            onPress={action.onPress}
            size="sm"
            variant="soft"
            accessibilityLabel={`${action.label}: ${label}`}
            testID={`${testID}-action`}
          />
        </XStack>
      ) : null}
    </YStack>
  );
}
