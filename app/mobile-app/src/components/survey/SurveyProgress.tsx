import { YStack } from 'tamagui';

/** Slim progress bar (0–100): a green fill on its own tonal track — mWeb's themed LinearProgress. */
export function SurveyProgress({ value }: Readonly<{ value: number }>) {
  return (
    <YStack
      testID="survey-progress"
      height={6}
      overflow="hidden"
      borderRadius={999}
      backgroundColor="$primarySoft"
    >
      <YStack
        height="100%"
        width={`${Math.max(0, Math.min(100, value))}%`}
        borderRadius={999}
        backgroundColor="$primary"
      />
    </YStack>
  );
}
