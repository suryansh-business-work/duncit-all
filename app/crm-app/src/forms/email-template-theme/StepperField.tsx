import { useController, type Control } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import { IconButton } from '@/components/email-templates/IconButton';
import { useTranslation } from '@/hooks/useTranslation';
import {
  EMAIL_THEME_RANGES,
  type EmailThemeRangeField,
  type EmailThemeValues,
} from './email-template-theme.types';

interface Props {
  control: Control<EmailThemeValues>;
  name: EmailThemeRangeField;
  label: string;
}

/**
 * A pixel value within the server's range — the portal's slider as a stepper,
 * one pixel per press, its value beside the label and announced as it changes.
 */
export function StepperField({ control, name, label }: Readonly<Props>) {
  const { t } = useTranslation();
  const { field, fieldState } = useController({ control, name });
  const { min, max } = EMAIL_THEME_RANGES[name];
  const value = Number(field.value);
  const step = (by: number) => field.onChange(Math.min(max, Math.max(min, value + by)));
  return (
    <YStack gap="$1">
      <XStack alignItems="center" gap="$2">
        <Text flex={1} fontWeight="600">
          {label}
        </Text>
        <IconButton
          icon="remove"
          label={t('crmApp.emailTemplates.decrease', { vars: { name: label } })}
          onPress={() => step(-1)}
          disabled={value <= min}
          testID={`theme-${name}-down`}
        />
        <Text minWidth={56} textAlign="center" aria-live="polite" testID={`theme-${name}-value`}>
          {t('crm.emailSettings.pixels', { vars: { value } })}
        </Text>
        <IconButton
          icon="add"
          label={t('crmApp.emailTemplates.increase', { vars: { name: label } })}
          onPress={() => step(1)}
          disabled={value >= max}
          testID={`theme-${name}-up`}
        />
      </XStack>
      {fieldState.error ? (
        <Text color="$danger" fontSize="$2" role="alert">
          {fieldState.error.message}
        </Text>
      ) : null}
    </YStack>
  );
}
