import { Label, Text, XStack, YStack } from 'tamagui';
import { Toggle } from '@/components/Toggle';

interface Props {
  id: string;
  label: string;
  hint: string;
  value: boolean;
  onChange: (next: boolean) => void;
}

/** A labelled switch with its explanation, read out together by TalkBack. */
export function ToggleRow({ id, label, hint, value, onChange }: Readonly<Props>) {
  return (
    <XStack gap="$3" alignItems="center" paddingVertical="$2">
      <YStack flex={1} gap="$1">
        <Label htmlFor={id} fontWeight="600">
          {label}
        </Label>
        <Text color="$muted" fontSize="$2">
          {hint}
        </Text>
      </YStack>
      <Toggle checked={value} onChange={onChange} label={label} testID={id} />
    </XStack>
  );
}
