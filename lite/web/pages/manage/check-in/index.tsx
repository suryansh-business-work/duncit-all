import { useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { SectionCard } from '@duncit/ui';
import type { LiteEvent, LiteRegistration } from '../../../../shared/graphql/documents';
import { useWebT } from '../../../../shared/i18n';
import { CheckInForm } from './check-in.form';
import { ConfirmedGuestSearch } from './ConfirmedGuestSearch';

export { CheckInForm } from './check-in.form';
export { makeCheckInSchema } from './check-in.types';
export type { CheckInValues } from './check-in.types';

/** At the door: type the code, or find the guest by name. */
export function CheckInTab({ event, onChanged }: Readonly<{ event: LiteEvent; onChanged: () => void }>) {
  const { t } = useWebT();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const [last, setLast] = useState<LiteRegistration | null>(null);

  const checkedIn = (registration: LiteRegistration) => {
    setLast(registration);
    onChanged();
  };

  return (
    <Stack spacing={3} data-testid="manage-checkin">
      <SectionCard title={t('liteWeb.manage.checkIn.title')} subtitle={t('liteWeb.manage.checkIn.subtitle')}>
        <Stack spacing={2}>
          <CheckInForm eventId={event.id} onCheckedIn={checkedIn} />
          <Stack aria-live="polite">
            {last ? (
              <Alert severity="success" data-testid="check-in-result">
                <Typography sx={{ fontWeight: 800 }}>{last.user.name}</Typography>
                <Typography variant="body2">
                  {last.ticket.name} × {last.quantity} · {last.code}
                </Typography>
                {last.checked_in_at ? (
                  <Typography variant="body2">{t('liteWeb.manage.checkIn.at', { vars: { time: formatDateTime(last.checked_in_at) } })}</Typography>
                ) : null}
              </Alert>
            ) : null}
          </Stack>
        </Stack>
      </SectionCard>
      <SectionCard title={t('liteWeb.manage.checkIn.searchTitle')} subtitle={t('liteWeb.manage.checkIn.searchSubtitle')}>
        <ConfirmedGuestSearch eventId={event.id} onCheckedIn={checkedIn} />
      </SectionCard>
      <Typography variant="body2" color="text.secondary">
        {t('liteWeb.manage.checkIn.count', { vars: { checked: event.stats.checked_in, going: event.stats.going } })}
      </Typography>
    </Stack>
  );
}
