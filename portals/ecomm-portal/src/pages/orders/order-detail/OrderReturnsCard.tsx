import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Link, List, ListItem, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { QueryGuard, SectionCard } from '@duncit/ui';
import { ReturnStatusChip } from '../../../components/chips';
import { money } from '../../../lib/format';
import { STORE_RETURNS_FOR_ORDER } from '../queries';

/** The returns raised against this order, each opening its own page. */
export default function OrderReturnsCard({ orderId, symbol }: Readonly<{ orderId: string; symbol: string }>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { data, loading, error } = useQuery(STORE_RETURNS_FOR_ORDER, { variables: { order_id: orderId }, fetchPolicy: 'cache-and-network' });
  const returns = data?.storeReturnsForOrder ?? [];
  return (
    <SectionCard title={t('ecommPortal.nav.returns')}>
      <QueryGuard loading={loading && !data} error={error}>
        {returns.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('ecommPortal.orders.noReturns')}
          </Typography>
        )}
        <List dense disablePadding aria-label={t('ecommPortal.nav.returns')}>
          {returns.map((item) => (
            <ListItem key={item.id} divider disableGutters>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
                <Link component={RouterLink} to={`/returns/${item.id}`} sx={{ fontWeight: 700 }}>
                  {item.return_no}
                </Link>
                <ReturnStatusChip status={item.status} />
                <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
                  {[formatDate(item.created_at), money(item.refund_amount, symbol)].join(' · ')}
                </Typography>
              </Stack>
            </ListItem>
          ))}
        </List>
      </QueryGuard>
    </SectionCard>
  );
}
