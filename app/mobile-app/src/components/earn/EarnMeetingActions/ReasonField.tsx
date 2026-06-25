import { Text, TextArea, YStack } from 'tamagui';

interface Props {
  testID: string;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}

/** Required free-text reason captured before a reschedule / cancel. */
export function ReasonField({ testID, label, value, onChangeText }: Readonly<Props>) {
  return (
    <YStack gap={6} paddingTop={12}>
      <Text fontSize={13} fontWeight="800" color="$color">
        {label} *
      </Text>
      <TextArea
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder="Add a short reason"
        minHeight={70}
        maxLength={500}
        backgroundColor="$surface"
        borderColor="$borderColor"
      />
    </YStack>
  );
}
