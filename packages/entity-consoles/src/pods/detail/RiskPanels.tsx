import { Divider, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { FinanceWaterfallList, buildWaterfallLines, type PodFinanceWaterfall } from '@duncit/ui';
import { formatDateTime } from '@duncit/app-settings';
import { usePodDetailsTranslation } from '@duncit/pod-details';
import type { PodCancellationRiskView } from './queries';

type Translate = ReturnType<typeof usePodDetailsTranslation>['t'];

const money = (symbol: string, amount: number) => `${symbol}${amount.toFixed(2)}`;

/** One label/value line, the same shape the Finance card uses. */
function Line({ label, value, strong }: Readonly<{ label: string; value: string; strong?: boolean }>) {
  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: strong ? 800 : 600, color: strong ? 'error.main' : 'text.primary' }}>
        {value}
      </Typography>
    </Stack>
  );
}

function PanelTitle({ title, intro }: Readonly<{ title: string; intro?: string }>) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      {intro && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {intro}
        </Typography>
      )}
    </Stack>
  );
}

/** The money: the waterfall on today's collections, ending below zero. */
export function FinancePanel({ risk }: Readonly<{ risk: PodCancellationRiskView }>) {
  const { t } = usePodDetailsTranslation();
  const lines = buildWaterfallLines(
    risk.waterfall as unknown as PodFinanceWaterfall,
    risk.currency_symbol,
    true,
    t,
    risk.collected_total
  );
  return (
    <Stack spacing={1.25}>
      <PanelTitle title={t('admin.podRisk.financeTitle')} intro={t('admin.podRisk.financeIntro')} />
      <FinanceWaterfallList symbol={risk.currency_symbol} lines={lines} />
      <Divider />
      <Line label={t('admin.podRisk.shortfall')} value={money(risk.currency_symbol, risk.shortfall)} strong />
    </Stack>
  );
}

/** What "bookings needed" reads as, for the three shapes the server answers. */
function spotsNeededLabel(t: Translate, risk: PodCancellationRiskView): string {
  const { attendees } = risk;
  if (attendees.ticket_price <= 0) return t('admin.podRisk.freePod');
  if (attendees.spots_needed === null) return t('admin.podRisk.cannotCover');
  return t('admin.podRisk.spotsNeededCount', { count: attendees.spots_needed });
}

/** The seats: how full the pod is, and what would close the gap. */
export function AttendeesPanel({ risk }: Readonly<{ risk: PodCancellationRiskView }>) {
  const { t } = usePodDetailsTranslation();
  const { attendees } = risk;
  const capacity = attendees.total_spots > 0 ? String(attendees.total_spots) : t('admin.podRisk.unlimitedSpots');
  return (
    <Stack spacing={1.25}>
      <PanelTitle title={t('admin.podRisk.attendeesTitle')} />
      <Line label={t('admin.podRisk.bookedSeats')} value={`${attendees.booked_seats} / ${capacity}`} />
      {attendees.total_spots > 0 && (
        <Line label={t('admin.podRisk.seatsAvailable')} value={String(attendees.seats_available)} />
      )}
      <Line label={t('admin.podRisk.ticketPrice')} value={money(risk.currency_symbol, attendees.ticket_price)} />
      <Divider />
      <Line label={t('admin.podRisk.spotsNeeded')} value={spotsNeededLabel(t, risk)} strong />
    </Stack>
  );
}

/** The ways out, in the order an admin should try them. */
export function FixList({ risk }: Readonly<{ risk: PodCancellationRiskView }>) {
  const { t } = usePodDetailsTranslation();
  const needed = risk.attendees.spots_needed;
  const steps = [
    needed === null ? null : t('admin.podRisk.fixShare', { count: needed }),
    t('admin.podRisk.fixSlot'),
    t('admin.podRisk.fixPrice'),
    t('admin.podRisk.fixCancel'),
  ].filter((step): step is string => step !== null);
  return (
    <Stack spacing={0.5}>
      <PanelTitle title={t('admin.podRisk.fixTitle')} />
      <List dense disablePadding sx={{ listStyleType: 'disc', pl: 2.5 }}>
        {steps.map((step) => (
          <ListItem key={step} disableGutters sx={{ display: 'list-item', py: 0.25 }}>
            <ListItemText primary={step} slotProps={{ primary: { variant: 'body2' } }} />
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}

/** Who has been told, when, and when they are told again. */
export function AlertsLine({ risk }: Readonly<{ risk: PodCancellationRiskView }>) {
  const { t } = usePodDetailsTranslation();
  const sent =
    risk.alert_count > 0 && risk.alerted_at
      ? t('admin.podRisk.alertsSent', {
          count: risk.alert_count,
          vars: {
            last: formatDateTime(risk.alerted_at),
            next: risk.next_alert_at ? formatDateTime(risk.next_alert_at) : '—',
          },
        })
      : t('admin.podRisk.alertsNone');
  return (
    <Stack spacing={0.5}>
      <PanelTitle title={t('admin.podRisk.alertsTitle')} />
      <Typography variant="body2">{sent}</Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('admin.podRisk.alertsEvery', { vars: { hours: risk.alert_hours } })}
      </Typography>
    </Stack>
  );
}
