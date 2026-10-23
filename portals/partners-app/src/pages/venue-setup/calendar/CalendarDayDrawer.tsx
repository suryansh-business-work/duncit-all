import { useState } from 'react';
import { Alert, Box, Drawer, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DayToggles } from '@duncit/availability-calendar';
import { DuncitIconButton } from '@duncit/buttons';
import { formatDay } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';

interface Props {
  /** 'yyyy-MM-dd'; null = closed. */
  ymd: string | null;
  blocked: boolean;
  holiday: boolean;
  /** Something is booked that day — closing it keeps the booking. */
  hasBookings: boolean;
  onClose: () => void;
  onBlocked: (next: boolean) => Promise<void>;
  onHoliday: (next: boolean) => Promise<void>;
}

/** One date of the venue's calendar: block it, or mark it a holiday. No prices. */
export default function CalendarDayDrawer({ ymd, blocked, holiday, hasBookings, onClose, onBlocked, onHoliday }: Readonly<Props>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = (write: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    write()
      .catch((e: unknown) => setError(parseApiError(e) || t('partners.venueSetup.saveFailed')))
      .finally(() => setBusy(false));
  };

  return (
    <Drawer
      anchor="right"
      open={!!ymd}
      onClose={onClose}
      data-testid="venue-calendar-day"
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 380 } } } }}
    >
      {ymd && (
        <Stack spacing={2} sx={{ p: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 900 }}>
                {t('partners.venueSetup.dayTitle')}
              </Typography>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 900 }}>
                {formatDay(ymd)}
              </Typography>
            </Box>
            <DuncitIconButton size="small" onClick={onClose} aria-label={t('partners.venueSetup.close')}>
              <CloseIcon />
            </DuncitIconButton>
          </Stack>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <DayToggles
            blocked={blocked}
            holiday={holiday}
            busy={busy}
            hasBookings={hasBookings}
            onBlocked={(next) => run(() => onBlocked(next))}
            onHoliday={(next) => run(() => onHoliday(next))}
          />
        </Stack>
      )}
    </Drawer>
  );
}
