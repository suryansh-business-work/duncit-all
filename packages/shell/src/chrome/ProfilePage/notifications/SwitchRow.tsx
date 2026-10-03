import { Chip, CircularProgress, Stack, Switch, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  label: string;
  description: string;
  checked: boolean;
  /** Locked rows are shown, never hidden — "will I still get my code?" is the
   * question people have, and a list of only what can be switched off never
   * answers it. */
  locked: boolean;
  lockedLabel?: string;
  busy: boolean;
  testId: string;
  onChange: (enabled: boolean) => void;
}

/** One preference with its switch — a mail or WhatsApp category, or a channel. */
export function SwitchRow({
  label,
  description,
  checked,
  locked,
  lockedLabel,
  busy,
  testId,
  onChange,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1.5} data-testid={testId} sx={{ alignItems: 'center', py: 1.25 }}>
      <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 600 }}>{label}</Typography>
          {locked && lockedLabel && (
            <Chip size="small" icon={<LockOutlinedIcon fontSize="small" />} label={lockedLabel} />
          )}
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {description}
        </Typography>
      </Stack>
      {busy ? (
        <CircularProgress size={20} sx={{ m: 1 }} aria-label={t('shell.a11y.loading')} />
      ) : (
        <Switch
          checked={checked}
          disabled={locked}
          onChange={(event) => onChange(event.target.checked)}
          slotProps={{ input: { 'aria-label': label } }}
        />
      )}
    </Stack>
  );
}
