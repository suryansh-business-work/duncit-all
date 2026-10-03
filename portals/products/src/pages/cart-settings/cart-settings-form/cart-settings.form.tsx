import { useEffect, useMemo } from 'react';
import { Controller, useForm, type Control, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Card, CardContent, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import {
  cartSettingsSchema,
  type CartSettingsFormValues,
  type CartSettingsNumberField,
} from './cart-settings.types';

type Toggle = 'nudge_enabled' | 'email_enabled';

interface SectionDef {
  title: string;
  toggle: { name: Toggle; label: string; hint: string };
  fields: { name: CartSettingsNumberField; label: string; hint: string }[];
}

interface SectionProps extends SectionDef {
  control: Control<CartSettingsFormValues>;
}

function SettingsSection({ control, title, toggle, fields }: Readonly<SectionProps>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Controller
            name={toggle.name}
            control={control}
            render={({ field }) => (
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      slotProps={{ input: { 'aria-describedby': `${toggle.name}-hint` } }}
                    />
                  }
                  label={toggle.label}
                />
                <Typography id={`${toggle.name}-hint`} variant="body2" sx={{ color: 'text.secondary' }}>
                  {toggle.hint}
                </Typography>
              </Box>
            )}
          />
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
            {fields.map((field) => (
              <RhfTextField
                key={field.name}
                control={control}
                name={field.name}
                label={field.label}
                hint={field.hint}
                required
                size="small"
                inputMode="numeric"
              />
            ))}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

interface Props {
  initialValues: CartSettingsFormValues;
  saving: boolean;
  onSubmit: (values: CartSettingsFormValues) => Promise<void>;
}

/** Products > Cart > Cart Settings: when the in-app nudge shows and when the
 * reminder email goes out. */
export default function CartSettingsForm({ initialValues, saving, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => cartSettingsSchema(t), [t]);
  const { control, handleSubmit, reset, formState } = useForm<CartSettingsFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<CartSettingsFormValues>,
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  useEffect(() => reset(initialValues), [initialValues, reset]);

  const sections: SectionDef[] = [
    {
      title: t('products.cartSettings.nudgeSection'),
      toggle: { name: 'nudge_enabled', label: t('products.cartSettings.nudgeEnabled'), hint: t('products.cartSettings.nudgeEnabledHint') },
      fields: [
        { name: 'nudge_delay_minutes', label: t('products.cartSettings.nudgeDelay'), hint: t('products.cartSettings.nudgeDelayHint') },
        { name: 'nudge_auto_hide_seconds', label: t('products.cartSettings.nudgeAutoHide'), hint: t('products.cartSettings.nudgeAutoHideHint') },
      ],
    },
    {
      title: t('products.cartSettings.emailSection'),
      toggle: { name: 'email_enabled', label: t('products.cartSettings.emailEnabled'), hint: t('products.cartSettings.emailEnabledHint') },
      fields: [
        { name: 'email_first_delay_hours', label: t('products.cartSettings.emailFirstDelay'), hint: t('products.cartSettings.emailFirstDelayHint') },
        { name: 'email_repeat_hours', label: t('products.cartSettings.emailRepeat'), hint: t('products.cartSettings.emailRepeatHint') },
        { name: 'email_max_count', label: t('products.cartSettings.emailMaxCount'), hint: t('products.cartSettings.emailMaxCountHint') },
      ],
    },
  ];

  return (
    <Stack
      component="form"
      noValidate
      spacing={2}
      onSubmit={(event) => {
        handleSubmit(onSubmit)(event).catch(() => undefined);
      }}
    >
      {sections.map((section) => (
        <SettingsSection key={section.toggle.name} control={control} {...section} />
      ))}
      <Box>
        <DuncitButton type="submit" variant="contained" disabled={!formState.isDirty || saving}>
          {saving ? t('shell.common.saving') : t('shell.common.save')}
        </DuncitButton>
      </Box>
    </Stack>
  );
}
