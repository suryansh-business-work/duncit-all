import { Box, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import MediaPickerField from '../../components/MediaPickerField';
import type { BrandingFormState } from './queries';

interface Props {
  form: BrandingFormState;
  setForm: (next: BrandingFormState) => void;
}

/**
 * The backdrop behind the sign-in and sign-up screens on mWeb and the app.
 *
 * TWO switches rather than one image/video selector, because "neither" is a
 * real state and the one an untouched install is in: with both off the apps
 * draw their own animated gradient, which is what they have always done. The
 * asset survives its switch being turned off, so taking a backdrop down for a
 * week does not mean picking it again afterwards.
 *
 * Video wins when both are on, and the same rule is written once more on the
 * clients — a video backdrop is the richer of the two, so an admin who has
 * configured both gets the one they went to more trouble for.
 */
export default function LoginBackgroundSection({ form, setForm }: Readonly<Props>) {
  const { t } = useTranslation();

  const update = <K extends keyof BrandingFormState>(key: K, value: BrandingFormState[K]) =>
    setForm({ ...form, [key]: value });

  return (
    <Stack spacing={2.5}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('admin.branding.loginBackgroundHint')}
      </Typography>

      <Stack spacing={1}>
        <FormControlLabel
          control={
            <Switch
              checked={form.login_background_image_enabled}
              onChange={(e) => update('login_background_image_enabled', e.target.checked)}
            />
          }
          label={t('admin.branding.loginBackgroundImage')}
        />
        {form.login_background_image_enabled && (
          <MediaPickerField
            label={t('admin.branding.loginBackgroundImage')}
            value={form.login_background_image_url}
            onChange={(url) => update('login_background_image_url', url)}
            folder="/branding/login"
            accept="image/*"
            helperText={t('admin.branding.loginBackgroundImageSize')}
          />
        )}
      </Stack>

      <Stack spacing={1}>
        <FormControlLabel
          control={
            <Switch
              checked={form.login_background_video_enabled}
              onChange={(e) => update('login_background_video_enabled', e.target.checked)}
            />
          }
          label={t('admin.branding.loginBackgroundVideo')}
        />
        {form.login_background_video_enabled && (
          <>
            <MediaPickerField
              label={t('admin.branding.loginBackgroundVideo')}
              value={form.login_background_video_url}
              onChange={(url) => update('login_background_video_url', url)}
              folder="/branding/login"
              accept="video/*"
              showPreview={false}
              helperText={t('admin.branding.loginBackgroundVideoSize')}
            />
            {form.login_background_video_url && (
              <Box
                component="video"
                src={form.login_background_video_url}
                muted
                loop
                autoPlay
                playsInline
                sx={{
                  width: 234,
                  height: 132,
                  objectFit: 'cover',
                  borderRadius: 1.5,
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                }}
              />
            )}
          </>
        )}
      </Stack>
    </Stack>
  );
}
