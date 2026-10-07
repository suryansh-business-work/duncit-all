import { XStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';

interface Props {
  acceptLabel: string;
  declineLabel: string;
  busy: boolean;
  onAnswer: (accept: boolean) => void;
  testID: string;
}

/** The yes / no pair a received request (or a sent slot) is answered with. */
export function RespondButtons({
  acceptLabel,
  declineLabel,
  busy,
  onAnswer,
  testID,
}: Readonly<Props>) {
  return (
    <XStack gap={8} testID={testID}>
      <DuncitButton
        testID={`${testID}-accept`}
        label={acceptLabel}
        onPress={() => onAnswer(true)}
        size="sm"
        disabled={busy}
      />
      <DuncitButton
        testID={`${testID}-decline`}
        label={declineLabel}
        onPress={() => onAnswer(false)}
        size="sm"
        variant="outline"
        tone="danger"
        disabled={busy}
      />
    </XStack>
  );
}
