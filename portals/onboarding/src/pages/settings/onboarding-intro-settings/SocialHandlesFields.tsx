import type { ReactElement } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { Card, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import XIcon from '@mui/icons-material/X';
import InstagramIcon from '@mui/icons-material/Instagram';
import YouTubeIcon from '@mui/icons-material/YouTube';
import FacebookIcon from '@mui/icons-material/Facebook';
import LanguageIcon from '@mui/icons-material/Language';
import { useTranslation } from '@duncit/app-settings';
import type { OnboardingIntroSettingsValues, SocialHandlesValues } from './onboarding-intro-settings.types';

interface Props {
  control: Control<OnboardingIntroSettingsValues>;
}

interface HandleField {
  key: keyof SocialHandlesValues;
  /** Written out in full: the translation gate only sees literal keys. */
  labelKey: string;
  icon: ReactElement;
}

const FIELDS: readonly HandleField[] = [
  { key: 'x_url', labelKey: 'onboarding.settingsPage.socialX', icon: <XIcon fontSize="small" /> },
  { key: 'instagram_url', labelKey: 'onboarding.settingsPage.socialInstagram', icon: <InstagramIcon fontSize="small" /> },
  { key: 'youtube_url', labelKey: 'onboarding.settingsPage.socialYoutube', icon: <YouTubeIcon fontSize="small" /> },
  { key: 'facebook_url', labelKey: 'onboarding.settingsPage.socialFacebook', icon: <FacebookIcon fontSize="small" /> },
  { key: 'website_url', labelKey: 'onboarding.settingsPage.socialWebsite', icon: <LanguageIcon fontSize="small" /> },
];

/** "Social Media Handles" — one link per platform, shown with its icon on the
 * Host, Venue and Club Admin survey pages. A blank link is hidden there. */
export default function SocialHandlesFields({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined" component="section" aria-labelledby="social-handles-heading" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography id="social-handles-heading" variant="subtitle1" component="h2">
            {t('onboarding.settingsPage.socialHandles')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('onboarding.settingsPage.socialHandlesHint')}
          </Typography>
        </Stack>
        {FIELDS.map((item) => (
          <Controller
            key={item.key}
            name={`social_handles.${item.key}`}
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                data-testid={`social-handle-${item.key}`}
                label={t(item.labelKey)}
                type="url"
                fullWidth
                error={!!fieldState.error}
                helperText={fieldState.error?.message ? t(fieldState.error.message) : undefined}
                slotProps={{
                  input: { startAdornment: <InputAdornment position="start">{item.icon}</InputAdornment> },
                }}
              />
            )}
          />
        ))}
      </Stack>
    </Card>
  );
}
