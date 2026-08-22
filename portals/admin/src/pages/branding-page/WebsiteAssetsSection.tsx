import { Stack, TextField, Typography } from '@mui/material';
import MediaPickerField from '../../components/MediaPickerField';
import type { BrandingFormState } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  form: BrandingFormState;
  setForm: (next: BrandingFormState) => void;
}

/**
 * Website Logos (Branding accordion 1D) — assets for the public marketing
 * sites (duncit.com + partners/ads/earnwith subsites): header logo, footer
 * logo and favicon, plus the app-store listing URLs their shared "Download the
 * app" section links to. Distinct from mWeb (the PWA) — no duplication.
 */
export default function WebsiteAssetsSection({ form, setForm }: Readonly<Props>) {
  const { t } = useTranslation();
  const update = (key: keyof BrandingFormState, value: string) =>
    setForm({ ...form, [key]: value });

  return (
    <Stack spacing={2.5}>
      <Typography variant="caption" color="text.secondary">
        Used by the public marketing websites. The static sites bake these in at build time — a
        redeploy picks up changes. Empty fields fall back to the sites' bundled assets.
      </Typography>

      <MediaPickerField
        label={t('admin.branding.headerLogo')}
        value={form.website_header_logo_url}
        onChange={(url) => update('website_header_logo_url', url)}
        folder="/branding/website"
        accept="image/*"
        helperText={t('admin.branding.headerLogoHint')}
      />

      <MediaPickerField
        label={t('admin.branding.footerLogo')}
        value={form.website_footer_logo_url}
        onChange={(url) => update('website_footer_logo_url', url)}
        folder="/branding/website"
        accept="image/*"
        helperText={t('admin.branding.footerLogoHint')}
      />

      <MediaPickerField
        label={t('admin.branding.favicon')}
        value={form.website_favicon_url}
        onChange={(url) => update('website_favicon_url', url)}
        folder="/branding/website"
        accept="image/*"
        helperText={t('admin.branding.faviconHint')}
      />

      <TextField
        label={t('admin.branding.androidUrl')}
        value={form.android_app_url}
        onChange={(e) => update('android_app_url', e.target.value)}
        helperText="Play Store listing link for the websites' Download section. Leave empty until live — the sites show a 'coming soon' state."
        fullWidth
      />

      <TextField
        label={t('admin.branding.iosUrl')}
        value={form.ios_app_url}
        onChange={(e) => update('ios_app_url', e.target.value)}
        helperText="App Store listing link for the websites' Download section. Leave empty until live — the sites show a 'coming soon' state."
        fullWidth
      />

      <TextField
        label={t('admin.branding.minVersion')}
        value={form.app_min_supported_version}
        onChange={(e) => update('app_min_supported_version', e.target.value)}
        placeholder={t('admin.branding.minVersionPlaceholder')}
        helperText="Mobile builds older than this are force-updated and cannot use the app. Raise it ONLY after that release is live in the stores — set it to a version users cannot download yet and they are locked out. Leave empty to block nobody. (The app's own version bumps on every deploy; this one never does.)"
        fullWidth
      />
    </Stack>
  );
}
