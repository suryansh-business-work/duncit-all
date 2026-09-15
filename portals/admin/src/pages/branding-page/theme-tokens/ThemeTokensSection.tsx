import { Alert, FormControlLabel, FormHelperText, Stack, Switch } from '@mui/material';
import { dark, light } from '@duncit/auth-tokens';
import { useTranslation } from '@duncit/shell';
import type { BrandingFormState } from '../queries';
import ThemeTokensTable from './ThemeTokensTable';
import type { TokenKey } from './tokenRows';

type ModeField = 'theme_tokens_light' | 'theme_tokens_dark';

const SOURCE_HINT_ID = 'branding-token-source-hint';

interface Props {
  form: BrandingFormState;
  setForm: (next: BrandingFormState) => void;
}

/**
 * Admin → Branding → Theme tokens: whether mWeb and the app theme from their
 * bundled tokens (LOCAL, the default) or from the two tables below (SERVER),
 * and the light and dark values themselves.
 */
export default function ThemeTokensSection({ form, setForm }: Readonly<Props>) {
  const { t } = useTranslation();
  const serverOn = form.theme_token_source === 'SERVER';
  const sourceHint = serverOn ? t('admin.branding.tokenSourceServer') : t('admin.branding.tokenSourceLocal');
  const changeToken = (field: ModeField) => (key: TokenKey, value: string) =>
    setForm({ ...form, [field]: { ...form[field], [key]: value } });

  return (
    <Stack spacing={3}>
      <Alert severity="info">{t('admin.branding.themeTokensInfo')}</Alert>
      <Stack spacing={0.5}>
        <FormControlLabel
          control={
            <Switch
              checked={serverOn}
              onChange={(e) => setForm({ ...form, theme_token_source: e.target.checked ? 'SERVER' : 'LOCAL' })}
              slotProps={{ input: { 'aria-describedby': SOURCE_HINT_ID } }}
            />
          }
          label={t('admin.branding.tokenSourceLabel')}
        />
        <FormHelperText id={SOURCE_HINT_ID} sx={{ mt: 0 }}>
          {sourceHint}
        </FormHelperText>
      </Stack>
      <ThemeTokensTable
        title={t('admin.branding.tokenTableLight')}
        local={light}
        values={form.theme_tokens_light}
        onChange={changeToken('theme_tokens_light')}
      />
      <ThemeTokensTable
        title={t('admin.branding.tokenTableDark')}
        local={dark}
        values={form.theme_tokens_dark}
        onChange={changeToken('theme_tokens_dark')}
      />
    </Stack>
  );
}
