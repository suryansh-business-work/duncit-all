import { MaterialIcons } from '@expo/vector-icons';
import { Button, Spinner, Text, XStack, YStack } from 'tamagui';

import { useLoadingRegion } from '@/components/Skeleton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { ReportCategoryOption } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  options: ReportCategoryOption[];
  /** True only while there is nothing to show yet. */
  loading: boolean;
  /** True when the options could not be loaded. */
  failed: boolean;
  /** The picked category's key; blank before a choice. */
  value: string;
  onChange: (key: string) => void;
  onRetry: () => void;
}

/**
 * The "What is wrong?" list in the report sheet. mWeb twin: ReportCategoryPicker
 * (rule 27).
 *
 * The options are the report categories Legal manages, so the list has three
 * honest states rather than one: still loading, could not load (with a way to
 * try again — a report nobody can file is worse than a slow one), and the
 * categories themselves.
 */
export function ReportCategoryList({
  options,
  loading,
  failed,
  value,
  onChange,
  onRetry,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { color, primary } = useThemeColors();
  const loadingRegion = useLoadingRegion(t('contentReport.categoriesLoading'));

  if (loading) {
    return (
      <YStack testID="report-categories-loading" alignItems="center" paddingVertical={16}>
        <Spinner color="$primary" {...loadingRegion} />
      </YStack>
    );
  }

  if (failed) {
    return (
      <YStack testID="report-categories-failed" gap={8} role="alert">
        <Text fontSize={13} color="$danger">
          {t('contentReport.categoriesFailed')}
        </Text>
        <Button testID="report-categories-retry" size="$3" alignSelf="flex-start" onPress={onRetry}>
          {t('contentReport.categoriesRetry')}
        </Button>
      </YStack>
    );
  }

  return (
    <YStack
      testID="report-categories"
      role="radiogroup"
      aria-label={t('contentReport.reasonLabel')}
    >
      <Text fontSize={12} fontWeight="600" color="$muted">
        {t('contentReport.reasonLabel')}
      </Text>
      {options.map((option) => {
        const checked = value === option.key;
        return (
          <XStack
            key={option.key}
            testID={`report-reason-${option.key}`}
            role="radio"
            aria-checked={checked}
            tabIndex={0}
            aria-label={option.label}
            onPress={() => onChange(option.key)}
            alignItems="flex-start"
            gap={10}
            minHeight={44}
            paddingVertical={10}
            pressStyle={PRESS_STYLE.row}
          >
            <MaterialIcons
              name={checked ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={20}
              color={checked ? primary : color}
            />
            <YStack flex={1} gap={2}>
              <Text fontSize={14} color="$color">
                {option.label}
              </Text>
              {option.description ? (
                <Text fontSize={12} color="$muted">
                  {option.description}
                </Text>
              ) : null}
            </YStack>
          </XStack>
        );
      })}
    </YStack>
  );
}
