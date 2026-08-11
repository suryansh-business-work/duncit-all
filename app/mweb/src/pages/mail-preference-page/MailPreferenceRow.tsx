import { Chip, CircularProgress, Stack, Switch, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation } from '@duncit/app-settings';
import type { MailPreferenceCategory } from './queries';

interface Props {
  item: MailPreferenceCategory;
  busy: boolean;
  onChange: (category: string, enabled: boolean) => void;
}

/**
 * One kind of email, with its switch.
 *
 * A required category is shown and locked rather than hidden. "Will I still get
 * my OTP if I unsubscribe?" is the question people actually have, and a screen
 * that only lists what you can switch off never answers it.
 */
export default function MailPreferenceRow({ item, busy, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const base = `mailPreference.categories.${item.category}`;

  return (
    <Stack
      direction="row"
      alignItems="flex-start"
      spacing={1.5}
      sx={{ py: 1.25 }}
      data-testid={`mail-preference-${item.category}`}
    >
      <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Typography variant="subtitle2" fontWeight={700}>
            {t(`${base}.label`)}
          </Typography>
          {item.required && (
            <Chip
              size="small"
              variant="outlined"
              icon={<LockOutlinedIcon fontSize="small" />}
              label={t('mailPreference.alwaysOn')}
            />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {t(`${base}.description`)}
        </Typography>
      </Stack>

      {busy ? (
        <CircularProgress size={20} sx={{ m: 1 }} />
      ) : (
        <Switch
          checked={item.enabled}
          disabled={item.required}
          onChange={(event) => onChange(item.category, event.target.checked)}
          inputProps={{ 'aria-label': t(`${base}.label`) }}
        />
      )}
    </Stack>
  );
}
