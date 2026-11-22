import { useEffect, useMemo, type ReactNode } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { emailThemeSchema, themeToForm } from './email-theme.schema';
import type { EmailThemeFormProps, EmailThemeFormValues } from './email-theme.types';
import ThemeColorsSection from './sections/ThemeColorsSection';
import ThemeTypographySection from './sections/ThemeTypographySection';
import ThemeShapeSection from './sections/ThemeShapeSection';
import ThemeDarkSection from './sections/ThemeDarkSection';

function Block({ title, hint, children }: Readonly<{ title: string; hint: string; children: ReactNode }>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {hint}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Email Templates › Settings › Theme. Every change that validates is handed to
 * `onPreview` (the live preview beside the form); Save stores the theme, which
 * every CRM email then renders with. "Use Duncit defaults" fills the form with
 * the shared design tokens — it is saved only when Save is pressed.
 */
export default function EmailThemeForm({
  initialValues,
  defaults,
  fonts,
  submitting,
  onSubmit,
  onPreview,
}: Readonly<EmailThemeFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => emailThemeSchema(t), [t]);
  const methods = useForm<EmailThemeFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: themeToForm(initialValues),
  });
  const { reset, handleSubmit, control, formState } = methods;
  const values = useWatch({ control }) as EmailThemeFormValues;

  useEffect(() => {
    reset(themeToForm(initialValues));
  }, [initialValues, reset]);

  useEffect(() => {
    // The parsed values (trimmed, normalised), so the preview renders what Save would store.
    const parsed = schema.safeParse(values);
    if (onPreview && parsed.success) onPreview(parsed.data);
  }, [values, schema, onPreview]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="email-theme-form">
        <Stack spacing={2}>
          <Block title={t('crm.emailSettings.colorsTitle')} hint={t('crm.emailSettings.colorsHint')}>
            <ThemeColorsSection />
          </Block>
          <Block title={t('crm.emailSettings.typographyTitle')} hint={t('crm.emailSettings.typographyHint')}>
            <ThemeTypographySection fonts={fonts} />
          </Block>
          <Block title={t('crm.emailSettings.shapeTitle')} hint={t('crm.emailSettings.shapeHint')}>
            <ThemeShapeSection />
          </Block>
          <Block title={t('crm.emailSettings.darkTitle')} hint={t('crm.emailSettings.darkHint')}>
            <ThemeDarkSection />
          </Block>
          <Stack direction="row" spacing={1} useFlexGap sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <DuncitButton
              startIcon={<RestartAltIcon />}
              onClick={() => reset(themeToForm(defaults), { keepDefaultValues: true })}
              disabled={submitting}
              data-testid="email-theme-defaults"
            >
              {t('crm.emailSettings.useDefaults')}
            </DuncitButton>
            <DuncitButton
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              loading={submitting}
              disabled={!formState.isDirty}
              data-testid="email-theme-save"
            >
              {t('crm.emailSettings.saveTheme')}
            </DuncitButton>
          </Stack>
        </Stack>
      </form>
    </FormProvider>
  );
}
