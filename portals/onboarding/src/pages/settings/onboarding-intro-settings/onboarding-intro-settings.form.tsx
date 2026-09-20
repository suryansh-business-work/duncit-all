import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { DuncitRichTextInput } from '@duncit/rich-text';
import { useProductVisibility, useTranslation } from '@duncit/app-settings';
import SocialHandlesFields from './SocialHandlesFields';
import {
  onboardingIntroSettingsSchema,
  type OnboardingIntroSettingsValues,
} from './onboarding-intro-settings.types';

interface Props {
  defaultValues: OnboardingIntroSettingsValues;
  saving: boolean;
  onSubmit: (values: OnboardingIntroSettingsValues) => void;
}

type IntroField = Exclude<keyof OnboardingIntroSettingsValues, 'social_handles'>;

interface Section {
  field: IntroField;
  labelKey: string;
  aiContext: string;
}

/** The List Product flow's intro — a product surface, so it follows the
 * `is_product_visible` flag like the rest of e-commerce. */
const PRODUCT_INTRO_FIELD: IntroField = 'ecomm_intro_html';

const SECTIONS: Section[] = [
  { field: 'host_intro_html', labelKey: 'onboarding.settingsPage.hostIntro', aiContext: 'host onboarding intro' },
  { field: 'venue_intro_html', labelKey: 'onboarding.settingsPage.venueIntro', aiContext: 'venue onboarding intro' },
  { field: PRODUCT_INTRO_FIELD, labelKey: 'onboarding.settingsPage.ecommIntro', aiContext: 'product onboarding intro' },
  {
    field: 'club_admin_intro_html',
    labelKey: 'onboarding.settingsPage.clubAdminIntro',
    aiContext: 'club admin onboarding intro',
  },
];

/** The per-kind rich-text fields shown first on each onboarding flow
 * (native + mWeb), authored here. A section left blank skips straight to the
 * category picker on the client. The Product intro is drawn only while the
 * `is_product_visible` flag is on; its stored copy still rides along in the
 * form values, so a save with the flag off never blanks it. Beside them:
 * Duncit's social media handles, shown on the survey pages. */
export default function OnboardingIntroSettingsForm({ defaultValues, saving, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { visible: showEcomm } = useProductVisibility();
  const sections = showEcomm ? SECTIONS : SECTIONS.filter((section) => section.field !== PRODUCT_INTRO_FIELD);
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
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          alignItems: 'start',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 360px' },
        }}
      >
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          {sections.map((section) => (
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
        </Stack>
        <SocialHandlesFields control={control} />
      </Box>
      <DuncitButton type="submit" variant="contained" disabled={saving || !isDirty} sx={{ alignSelf: 'flex-start' }}>
        {saving ? t('shell.common.saving') : t('shell.common.save')}
      </DuncitButton>
    </Stack>
  );
}
