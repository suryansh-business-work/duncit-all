import { Stack, TextField, Typography } from '@mui/material';
import MediaPickerField from '../../components/MediaPickerField';
import type { BrandingFormState } from './queries';

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
  const update = (key: keyof BrandingFormState, value: string) =>
    setForm({ ...form, [key]: value });

  return (
    <Stack spacing={2.5}>
      <Typography variant="caption" color="text.secondary">
        Used by the public marketing websites. The static sites bake these in at build time — a
        redeploy picks up changes. Empty fields fall back to the sites' bundled assets.
      </Typography>

      <MediaPickerField
        label="Header logo"
        value={form.website_header_logo_url}
        onChange={(url) => update('website_header_logo_url', url)}
        folder="/branding/website"
        accept="image/*"
        helperText="Transparent PNG/SVG, ~320×96px — shown in the site header on light glass."
      />

      <MediaPickerField
        label="Footer logo"
        value={form.website_footer_logo_url}
        onChange={(url) => update('website_footer_logo_url', url)}
        folder="/branding/website"
        accept="image/*"
        helperText="Transparent PNG/SVG, ~320×96px — shown in the site footer on dark ink."
      />

      <MediaPickerField
        label="Favicon"
        value={form.website_favicon_url}
        onChange={(url) => update('website_favicon_url', url)}
        folder="/branding/website"
        accept="image/*"
        helperText="Square PNG/SVG, 64×64px — browser-tab icon for every website."
      />

      <TextField
        label="Android app URL (Google Play)"
        value={form.android_app_url}
        onChange={(e) => update('android_app_url', e.target.value)}
        helperText="Play Store listing link for the websites' Download section. Leave empty until live — the sites show a 'coming soon' state."
        fullWidth
      />

      <TextField
        label="iOS app URL (App Store)"
        value={form.ios_app_url}
        onChange={(e) => update('ios_app_url', e.target.value)}
        helperText="App Store listing link for the websites' Download section. Leave empty until live — the sites show a 'coming soon' state."
        fullWidth
      />

      <TextField
        label="Minimum supported app version"
        value={form.app_min_supported_version}
        onChange={(e) => update('app_min_supported_version', e.target.value)}
        placeholder="e.g. 1.50.0"
        helperText="Mobile builds older than this are force-updated and cannot use the app. Raise it ONLY after that release is live in the stores — set it to a version users cannot download yet and they are locked out. Leave empty to block nobody. (The app's own version bumps on every deploy; this one never does.)"
        fullWidth
      />
    </Stack>
  );
}
