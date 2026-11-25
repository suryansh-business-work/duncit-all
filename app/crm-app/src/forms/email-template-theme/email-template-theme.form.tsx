import { useEffect, useMemo, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useForm, useWatch } from 'react-hook-form';
import { Text, YStack, useTheme } from 'tamagui';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import {
  emailThemeToValues,
  makeEmailThemeSchema,
  type EmailThemeSource,
  type EmailThemeValues,
} from './email-template-theme.types';
import {
  ThemeColorsSection,
  ThemeDarkSection,
  ThemeShapeSection,
  ThemeTypographySection,
} from './ThemeSections';

interface Props {
  /** The saved theme the form starts from. */
  initialValues: EmailThemeSource;
  /** The shared design tokens — what "Use Duncit defaults" fills in. */
  defaults: EmailThemeSource;
  fonts: readonly { key: string; label: string }[];
  onSubmit: (values: EmailThemeValues) => Promise<void>;
  /** Every valid change, for the live preview under the form. */
  onPreview: (values: EmailThemeValues) => void;
}

/**
 * Email Templates › Settings › Theme, as the portal's form: colours, fonts,
 * spacing and dark mode. "Use Duncit defaults" only fills the form; Save
 * stores the theme every CRM email then renders with.
 */
export function EmailThemeForm({
  initialValues,
  defaults,
  fonts,
  onSubmit,
  onPreview,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const schema = useMemo(() => makeEmailThemeSchema(t), [t]);
  const resolver = useMemo(() => formResolver<EmailThemeValues>(schema), [schema]);
  const { control, handleSubmit, reset, formState } = useForm<EmailThemeValues>({
    defaultValues: emailThemeToValues(initialValues),
    resolver,
    mode: 'onChange',
  });
  const values = useWatch({ control });

  useEffect(() => {
    reset(emailThemeToValues(initialValues));
  }, [initialValues, reset]);

  useEffect(() => {
    // The parsed values (trimmed), so the preview renders what Save would store.
    const parsed = schema.safeParse(values);
    if (parsed.success) onPreview(parsed.data);
  }, [values, schema, onPreview]);

  const block = (title: string, hint: string, body: ReactNode) => (
    <Card title={title}>
      <Text color="$muted" fontSize="$2" marginBottom="$2">
        {hint}
      </Text>
      {body}
    </Card>
  );

  return (
    <YStack gap="$3">
      {block(
        t('crm.emailSettings.colorsTitle'),
        t('crm.emailSettings.colorsHint'),
        <ThemeColorsSection control={control} />,
      )}
      {block(
        t('crm.emailSettings.typographyTitle'),
        t('crm.emailSettings.typographyHint'),
        <ThemeTypographySection control={control} fonts={fonts} />,
      )}
      {block(
        t('crm.emailSettings.shapeTitle'),
        t('crm.emailSettings.shapeHint'),
        <ThemeShapeSection control={control} />,
      )}
      {block(
        t('crm.emailSettings.darkTitle'),
        t('crm.emailSettings.darkHint'),
        <ThemeDarkSection control={control} />,
      )}
      <DuncitButton
        label={t('crm.emailSettings.useDefaults')}
        onPress={() => reset(emailThemeToValues(defaults), { keepDefaultValues: true })}
        variant="outline"
        disabled={formState.isSubmitting}
        icon={<MaterialIcons name="restart-alt" size={18} color={theme.accentText?.val} />}
        testID="email-theme-defaults"
      />
      <DuncitButton
        label={t('crm.emailSettings.saveTheme')}
        onPress={handleSubmit(onSubmit)}
        loading={formState.isSubmitting}
        disabled={!formState.isDirty}
        fullWidth
        icon={<MaterialIcons name="save" size={18} color={theme.onPrimary?.val} />}
        testID="email-theme-save"
      />
    </YStack>
  );
}
