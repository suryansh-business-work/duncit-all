import { Avatar, Box, Divider, Stack, TextField, Typography } from '@mui/material';
import MediaPickerField from '../../components/MediaPickerField';
import type { BrandingFormState } from './queries';

interface Props {
  form: BrandingFormState;
  setForm: (next: BrandingFormState) => void;
}

export default function IdentitySection({ form, setForm }: Readonly<Props>) {
  const update = <K extends keyof BrandingFormState>(k: K, v: BrandingFormState[K]) =>
    setForm({ ...form, [k]: v });

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
        <Avatar
          src={form.logo_url || undefined}
          variant="rounded"
          sx={{
            width: 96,
            height: 96,
            bgcolor: form.primary_color,
            fontSize: 36,
            fontWeight: 700,
          }}
        >
          {form.app_name?.[0]?.toUpperCase() ?? 'D'}
        </Avatar>
        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            Live preview
          </Typography>
          <Typography variant="h5">{form.app_name || 'App name'}</Typography>
          <Typography variant="caption" color="text.secondary">
            {form.support_email || 'support@example.com'}
          </Typography>
        </Box>
      </Stack>

      <Divider />

      <TextField
        label="App name"
        value={form.app_name}
        onChange={(e) => update('app_name', e.target.value)}
        fullWidth
      />
      <TextField
        label="Home header tagline"
        value={form.home_header_tagline}
        onChange={(e) => update('home_header_tagline', e.target.value)}
        fullWidth
        placeholder="It All Starts Here!"
        helperText="Shown at the top of the home screen, above the location (mWeb + mobile app)."
      />
      <MediaPickerField
        label="Logo URL"
        value={form.logo_url}
        onChange={(url) => update('logo_url', url)}
        folder="/branding"
        helperText="Square or wordmark image used in the app header."
        showPreview={false}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Primary color"
          value={form.primary_color}
          onChange={(e) => update('primary_color', e.target.value)}
          fullWidth
          placeholder="#1976d2"
        />
        <TextField
          label="Support email"
          value={form.support_email}
          onChange={(e) => update('support_email', e.target.value)}
          fullWidth
          type="email"
        />
      </Stack>
      <TextField
        label="Support phone (Bouncers → Quick Support)"
        value={form.support_phone}
        onChange={(e) => update('support_phone', e.target.value)}
        fullWidth
        placeholder="+919999999999"
        helperText="Users tap “Call Now” in Bouncers → Quick Support to dial this number."
      />
    </Stack>
  );
}
