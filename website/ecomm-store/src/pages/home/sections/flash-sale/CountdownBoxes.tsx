import { Stack, Typography } from '@mui/material';

import { useStoreT } from '../../../../i18n';
import { STORE_TOKENS as T } from '../../../../theme/tokens';
import type { Countdown } from './useCountdown';

const pad = (value: number) => String(value).padStart(2, '0');

function Unit({ value, label }: Readonly<{ value: number; label: string }>) {
  return (
    <Stack sx={{ alignItems: 'center', bgcolor: T.surface, borderRadius: '14px', minWidth: 52, py: 0.75, px: 1 }}>
      <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.1 }}>{pad(value)}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
        {label}
      </Typography>
    </Stack>
  );
}

/** hh : mm : ss in white boxes. A timer, so it is not read out every second. */
export function CountdownBoxes({ countdown }: Readonly<{ countdown: Countdown }>) {
  const { t } = useStoreT();
  const summary = t('ecommStore.flash.endsIn', {
    vars: { h: countdown.hours, m: countdown.minutes, s: countdown.seconds },
  });
  return (
    <Stack direction="row" spacing={0.75} role="timer" aria-label={summary}>
      <Unit value={countdown.hours} label={t('ecommStore.flash.hrs')} />
      <Unit value={countdown.minutes} label={t('ecommStore.flash.min')} />
      <Unit value={countdown.seconds} label={t('ecommStore.flash.sec')} />
    </Stack>
  );
}
