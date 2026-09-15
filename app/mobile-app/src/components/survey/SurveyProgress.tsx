import { YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

/** Slim progress bar (0–100): a green fill on its own tonal track — mWeb's themed LinearProgress. */
export function SurveyProgress({ value }: Readonly<{ value: number }>) {
  const { t } = useTranslation();
  const percent = Math.max(0, Math.min(100, value));
  return (
    <YStack
      testID="survey-progress"
      role="progressbar"
      aria-label={t('mweb.a11y.surveyProgress')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      height={6}
      overflow="hidden"
      borderRadius={999}
      backgroundColor="$primarySoft"
    >
      <YStack height="100%" width={`${percent}%`} borderRadius={999} backgroundColor="$primary" />
    </YStack>
  );
}
