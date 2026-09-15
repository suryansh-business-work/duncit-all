import { Stack, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { BrandingFormState } from './queries';

interface Props {
  form: BrandingFormState;
  setForm: (next: BrandingFormState) => void;
}

/**
 * The Terms & Conditions and Privacy Policy pages the sign-in and sign-up
 * screens link to — mWeb, the native app and every portal login read these.
 * The server rejects anything that is not an http(s) address and answers its
 * default for a blank one.
 */
export default function LegalLinksSection({ form, setForm }: Readonly<Props>) {
  const { t } = useTranslation();
  const update = (key: 'terms_url' | 'privacy_url', value: string) =>
    setForm({ ...form, [key]: value.trim() });

  return (
    <Stack spacing={2.5}>
      <TextField
        label={t('admin.branding.termsUrl')}
        value={form.terms_url}
        onChange={(e) => update('terms_url', e.target.value)}
        helperText={t('admin.branding.legalUrlHint')}
        type="url"
        fullWidth
      />
      <TextField
        label={t('admin.branding.privacyUrl')}
        value={form.privacy_url}
        onChange={(e) => update('privacy_url', e.target.value)}
        helperText={t('admin.branding.legalUrlHint')}
        type="url"
        fullWidth
      />
    </Stack>
  );
}
