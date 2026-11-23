import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { rentalActorKey, rentalEventKey, type RentalBookingRow, type RentalEvent } from '@duncit/utils';
import DetailSection from './DetailSection';
import { bookingMoney, when } from './format';

interface Props {
  events: RentalEvent[];
  money: Pick<RentalBookingRow, 'currency_symbol'>;
}

/** The rental's life in order: what happened, who did it, when, and any amount it moved. */
export default function RentalTimelineSection({ events, money }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <DetailSection title={t('venueRentals.detail.timeline')} testId="rental-detail-timeline">
      {events.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('venueRentals.detail.noEvents')}
        </Typography>
      ) : (
        <Stack component="ol" spacing={1.5} sx={{ m: 0, p: 0 }}>
          {events.map((event) => {
            // The actor's own name when the server knows it; otherwise who they acted as.
            const role = t(rentalActorKey(event.actor_role));
            const at = when(event.at);
            const by = event.actor_name
              ? t('venueRentals.proof.addedBy', { vars: { name: event.actor_name, role, at } })
              : t('venueRentals.detail.eventBy', { vars: { actor: role, at } });
            return (
              <Box
                component="li"
                key={`${event.type}-${event.at}`}
                data-testid="rental-detail-event"
                sx={{ listStyle: 'none', borderLeft: 2, borderColor: 'divider', pl: 1.5 }}
              >
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {t(rentalEventKey(event.type))}
                  </Typography>
                  {event.amount != null && (
                    <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {bookingMoney(money, event.amount)}
                    </Typography>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" component="p">
                  {by}
                </Typography>
                {event.detail && (
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {event.detail}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Stack>
      )}
    </DetailSection>
  );
}
