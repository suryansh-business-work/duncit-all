import { LinearGradient } from 'expo-linear-gradient';
import { YStack } from 'tamagui';

/** Slim gradient progress bar (0–100) — matches mWeb's survey LinearProgress. */
export function SurveyProgress({ value }: Readonly<{ value: number }>) {
  return (
    <YStack
      testID="survey-progress"
      height={6}
      overflow="hidden"
      borderRadius={999}
      backgroundColor="$borderColor"
    >
      <LinearGradient
        colors={['#ff4f73', '#ff8b5f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: '100%', width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </YStack>
  );
}
