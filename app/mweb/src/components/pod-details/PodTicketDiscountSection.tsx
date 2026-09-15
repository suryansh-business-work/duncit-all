import { Box, Stack, Typography } from '@mui/material';
import { ticketDiscountRows, type TicketDiscountSource } from '@duncit/utils';
import { usePricing } from '../../hooks/usePricing';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** One ticket's price — the base row, and what each tier discounts. */
  unitPrice: number;
  /** The pod's `ticket_discount_enabled` + `ticket_discount_tiers`. */
  pod: TicketDiscountSource;
}

/**
 * The pod's multi-ticket offer on Pod Details: the full-price single ticket,
 * then one row per tier with what a ticket costs once it applies. The rows come
 * from `ticketDiscountRows`, the same helper checkout prices with, so the offer
 * and the bill cannot disagree. Native twin: components/details (rule 27).
 */
export default function PodTicketDiscountSection({ unitPrice, pod }: Readonly<Props>) {
  const { t } = useTranslation();
  const { format } = usePricing();
  const rows = ticketDiscountRows(unitPrice, pod);

  return (
    <Stack data-testid="pod-ticket-discount-section" spacing={1}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('mweb.podDetails.ticketDiscountIntro')}
      </Typography>
      <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
        {rows.map((row) => {
          const isBase = row.discount_pct === 0;
          const tickets = isBase
            ? t('mweb.podDetails.ticketDiscountBaseRow')
            : t('mweb.podDetails.ticketDiscountTierRow', { vars: { count: row.min_tickets } });
          const saving = isBase
            ? t('mweb.podDetails.ticketDiscountFullPrice')
            : t('mweb.podDetails.ticketDiscountPct', { vars: { pct: row.discount_pct } });
          return (
            <Stack
              key={row.min_tickets}
              data-testid={`pod-ticket-discount-row-${row.min_tickets}`}
              direction="row"
              spacing={2}
              sx={{ alignItems: 'center', justifyContent: 'space-between', py: 1 }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {tickets}
                </Typography>
                <Typography variant="caption" sx={{ color: isBase ? 'text.secondary' : 'success.main' }}>
                  {saving}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
                {t('mweb.podDetails.ticketDiscountPerTicket', { vars: { price: format(row.per_ticket) } })}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
}
