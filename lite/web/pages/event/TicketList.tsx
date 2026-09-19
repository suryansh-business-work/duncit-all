import { Chip, Stack, Typography } from '@mui/material';
import { priceLabel } from '../../../shared/format';
import type { LiteTicketType } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { isSoldOut } from '../../components/register/TicketStep';

/** The ticket types on sale, each with its price and whether it is gone. */
export function TicketList({ tickets }: Readonly<{ tickets: readonly LiteTicketType[] }>) {
  const { t } = useWebT();
  const active = tickets.filter((ticket) => ticket.is_active);
  return (
    <Stack component="ul" spacing={1} sx={{ listStyle: 'none', p: 0, m: 0 }} data-testid="ticket-list">
      {active.map((ticket) => {
        const soldOut = isSoldOut(ticket);
        return (
          <Stack component="li" key={ticket.id} direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }}>{ticket.name}</Typography>
              {ticket.description ? (
                <Typography variant="body2" color="text.secondary">
                  {ticket.description}
                </Typography>
              ) : null}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
              {soldOut ? <Chip size="small" label={t('liteWeb.register.soldOut')} /> : null}
              <Typography sx={{ fontWeight: 800, color: soldOut ? 'text.disabled' : 'primary.main' }}>{priceLabel(ticket.price, t('lite.common.free'))}</Typography>
            </Stack>
          </Stack>
        );
      })}
    </Stack>
  );
}
