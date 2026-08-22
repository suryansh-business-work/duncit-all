import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { CategoryLabels } from './useOnboardingFlow';
import { useTranslation } from '@/hooks/useTranslation';

const summary = (labels: CategoryLabels) =>
  [labels.super, labels.category, labels.sub].filter(Boolean).join(' › ');

/**
 * Read-only recap of the chosen Super › Category › Sub shown at the top of the
 * survey + meeting steps, with a "Change" affordance that returns to the picker.
 * The mWeb twin is survey-gate/CategorySummaryBanner.
 */
export function CategorySummaryBanner({
  labels,
  onChange,
}: Readonly<{ labels: CategoryLabels; onChange: () => void }>) {
  const { t } = useTranslation();
  const { color: ink, primary } = useThemeColors();
  const text = summary(labels);
  if (!text) return null;
  return (
    <XStack
      testID="category-banner"
      alignItems="center"
      justifyContent="space-between"
      gap={10}
      padding={12}
      marginHorizontal={16}
      marginTop={12}
      borderRadius={12}
      backgroundColor="$color2"
    >
      <YStack flex={1} gap={2}>
        <Text fontSize={11} fontWeight="600" opacity={0.6} color={ink}>
          CATEGORY
        </Text>
        <Text fontSize={13} fontWeight="700" color={ink}>
          {text}
        </Text>
      </YStack>
      <XStack
        testID="category-change"
        role="button"
        aria-label={t('mweb.surveyOnboarding.changeCategory')}
        onPress={onChange}
        alignItems="center"
        gap={4}
        paddingVertical={4}
        paddingHorizontal={6}
      >
        <MaterialIcons name="edit" size={14} color={primary} />
        <Text fontSize={12} fontWeight="600" color={primary}>
          Change
        </Text>
      </XStack>
    </XStack>
  );
}
