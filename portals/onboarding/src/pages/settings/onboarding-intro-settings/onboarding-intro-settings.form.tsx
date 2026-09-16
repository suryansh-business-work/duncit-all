import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { DuncitRichTextInput } from '@duncit/rich-text';
import { useTranslation } from '@duncit/app-settings';
import {
  onboardingIntroSettingsSchema,
  type OnboardingIntroSettingsValues,
} from './onboarding-intro-settings.types';

interface Props {
  defaultValues: OnboardingIntroSettingsValues;
  saving: boolean;
  onSubmit: (values: OnboardingIntroSettingsValues) => void;
}

interface Section {
  field: keyof OnboardingIntroSettingsValues;
  labelKey: string;
  aiContext: string;
}

const SECTIONS: Section[] = [
  { field: 'host_intro_html', labelKey: 'onboarding.settingsPage.hostIntro', aiContext: 'host onboarding intro' },
  { field: 'venue_intro_html', labelKey: 'onboarding.settingsPage.venueIntro', aiContext: 'venue onboarding intro' },
  { field: 'ecomm_intro_html', labelKey: 'onboarding.settingsPage.ecommIntro', aiContext: 'product onboarding intro' },
  {
    field: 'club_admin_intro_html',
    labelKey: 'onboarding.settingsPage.clubAdminIntro',
    aiContext: 'club admin onboarding intro',
  },
];

/** The four per-kind rich-text fields shown first on each onboarding flow
 * (native + mWeb), authored here. A section left blank skips straight to the
 * category picker on the client. */
export default function OnboardingIntroSettingsForm({ defaultValues, saving, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<OnboardingIntroSettingsValues>({
    resolver: zodResolver(onboardingIntroSettingsSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <Stack spacing={3} component="form" onSubmit={handleSubmit(onSubmit)}>
      <Alert severity="info">{t('onboarding.settingsPage.hint')}</Alert>
      {SECTIONS.map((section) => (
        <Stack key={section.field} spacing={1}>
          <Typography variant="subtitle1">{t(section.labelKey)}</Typography>
          <Controller
            name={section.field}
            control={control}
            render={({ field }) => (
              <DuncitRichTextInput
                value={field.value}
                onChange={(html) => field.onChange(html)}
                minHeight={200}
                aiContext={section.aiContext}
                ariaLabel={t(section.labelKey)}
              />
            )}
          />
        </Stack>
      ))}
      <DuncitButton type="submit" variant="contained" disabled={saving || !isDirty} sx={{ alignSelf: 'flex-start' }}>
        {saving ? t('shell.common.saving') : t('shell.common.save')}
      </DuncitButton>
    </Stack>
  );
}
