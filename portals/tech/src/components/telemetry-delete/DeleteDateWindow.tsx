import { Alert, Chip, Stack, Typography } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { subDays, startOfDay } from 'date-fns';
import { useTranslation } from '@duncit/app-settings';

export interface DeleteWindow {
  from: Date | null;
  to: Date | null;
}

export const EMPTY_WINDOW: DeleteWindow = { from: null, to: null };

/**
 * "Older than N days" is the whole reason this control exists, so it is one
 * click rather than a date somebody has to work out. Each preset is an upper
 * bound alone — nothing older survives, everything newer is untouched.
 */
const OLDER_THAN_PRESETS = [
  { days: 7, key: 'tech.telemetryDelete.presetOlder7' },
  { days: 30, key: 'tech.telemetryDelete.presetOlder30' },
  { days: 90, key: 'tech.telemetryDelete.presetOlder90' },
] as const;

/** A window whose sides cross covers nothing, and is worth saying out loud. */
export function windowIsInverted(window: DeleteWindow): boolean {
  return window.from !== null && window.to !== null && window.from.getTime() > window.to.getTime();
}

/** ISO bounds for the server, or null where a side is left open. */
export function windowToScope(window: DeleteWindow): { from: string | null; to: string | null } {
  return {
    from: window.from ? window.from.toISOString() : null,
    to: window.to ? window.to.toISOString() : null,
  };
}

interface Props {
  value: DeleteWindow;
  onChange: (next: DeleteWindow) => void;
  disabled: boolean;
}

export default function DeleteDateWindow({ value, onChange, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const inverted = windowIsInverted(value);

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2">{t('tech.telemetryDelete.windowLabel')}</Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {OLDER_THAN_PRESETS.map((preset) => (
          <Chip
            key={preset.days}
            size="small"
            label={t(preset.key)}
            disabled={disabled}
            onClick={() => onChange({ from: null, to: startOfDay(subDays(new Date(), preset.days)) })}
          />
        ))}
        <Chip
          size="small"
          variant="outlined"
          label={t('tech.telemetryDelete.presetNoLimit')}
          disabled={disabled}
          onClick={() => onChange(EMPTY_WINDOW)}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <DateTimePicker
          label={t('tech.telemetryDelete.from')}
          value={value.from}
          disabled={disabled}
          onChange={(next: Date | null) => onChange({ ...value, from: next })}
          slotProps={{
            textField: { size: 'small', fullWidth: true },
            field: { clearable: true },
          }}
        />
        <DateTimePicker
          label={t('tech.telemetryDelete.to')}
          value={value.to}
          disabled={disabled}
          onChange={(next: Date | null) => onChange({ ...value, to: next })}
          slotProps={{
            textField: { size: 'small', fullWidth: true },
            field: { clearable: true },
          }}
        />
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('tech.telemetryDelete.windowHint')}
      </Typography>
      {inverted ? <Alert severity="warning">{t('tech.telemetryDelete.rangeInverted')}</Alert> : null}
    </Stack>
  );
}
