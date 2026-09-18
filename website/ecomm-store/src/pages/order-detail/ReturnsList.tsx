import { Chip, Paper, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';

import type { StoreReturn } from '../../graphql/returns';
import { useMoney } from '../../lib/money';
import { useStoreT } from '../../i18n';
import { RETURN_KEYS } from './orderLabels';

/** Return requests: number, status, items, reason and any refund. */
export function ReturnsList({ returns }: Readonly<{ returns: StoreReturn[] }>) {
  const { t } = useStoreT();
  const money = useMoney();
  const { formatDate } = useDateFormat();
  return (
    <Stack component="ul" spacing={1.5} sx={{ listStyle: 'none', p: 0, m: 0 }}>
      {returns.map((r) => (
        <Paper component="li" key={r.id} variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={0.75}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 800 }}>{t('ecommStore.returns.number', { vars: { returnNo: r.return_no, orderNo: r.order_no } })}</Typography>
              <Chip size="small" label={t(RETURN_KEYS[r.status])} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {formatDate(r.created_at)}
            </Typography>
            <Typography variant="body2">
              {r.items.map((i) => t('ecommStore.checkout.lineQty', { vars: { name: i.name, qty: i.qty } })).join(', ')}
            </Typography>
            <Typography variant="body2">{t('ecommStore.returns.because', { vars: { reason: r.reason } })}</Typography>
            {r.refund_amount > 0 ? (
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {r.refund_mode === 'COINS'
                  ? t('ecommStore.returns.refundCoins', { vars: { amount: money(r.refund_amount) } })
                  : t('ecommStore.returns.refundOriginal', { vars: { amount: money(r.refund_amount) } })}
              </Typography>
            ) : null}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
