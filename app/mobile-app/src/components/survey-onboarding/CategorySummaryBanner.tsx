import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { CategoryLabels } from './useOnboardingFlow';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

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
  const { primary } = useThemeColors();
  const text = summary(labels);
  if (!text) return null;
  return (
    <XStack
      testID="category-banner"
      alignItems="center"
      justifyContent="space-between"
      gap={10}
      paddingHorizontal={16}
      paddingVertical={12}
      marginHorizontal={16}
      marginTop={8}
      borderRadius={16}
      borderWidth={1}
      borderColor="$cardBorder"
      backgroundColor="$surface"
    >
      <YStack flex={1} gap={2}>
        <Text fontSize={12} fontWeight="600" color="$muted">
          CATEGORY
        </Text>
        <Text fontSize={14} fontWeight="600" color="$color">
          {text}
        </Text>
      </YStack>
      <XStack
        pressStyle={PRESS_STYLE.surface}
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
