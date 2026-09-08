import { Divider, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import type { PodRevokeRefund } from './queries';

/** Money gone reads as a loss; money merely scheduled is not one yet. */
const REFUND_STATE_COLORS: StatusColorMap = { PAID: 'error', HELD: 'warning' };

interface Props {
  refunds: PodRevokeRefund[];
  lossTotal: number;
  heldTotal: number;
  currencySymbol: string;
}

/**
 * Who was given their money back, and how much of that this decision cannot
 * take back.
 *
 * The split is the point. A PAID row has already left the platform: revoking
 * reinstates the pod but not the payment, so it is a real loss and is totalled
 * as one. A HELD row was only ever scheduled — revoking drops it and it costs
 * nothing, which is the whole reason the hold setting exists.
 */
export default function RefundLedger({
  refunds,
  lossTotal,
  heldTotal,
  currencySymbol,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = (value: number) => formatMoney(value, { symbol: currencySymbol, decimals: 2 });

  if (refunds.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('admin.pods.revokeNoRefunds')}
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
        {t('admin.pods.revokeRefundsHeading')}
      </Typography>
      <List dense disablePadding>
        {refunds.map((refund) => (
          <ListItem key={refund.payment_id} disableGutters
            secondaryAction={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {money(refund.amount)}
                </Typography>
                <StatusChip
                  status={refund.state}
                  colorMap={REFUND_STATE_COLORS}
                  label={
                    refund.state === 'PAID'
                      ? t('admin.pods.revokeRefundPaid')
                      : t('admin.pods.revokeRefundHeld')
                  }
                />
              </Stack>
            }
          >
            <ListItemText
              primary={refund.user_name || refund.user_email}
              secondary={refund.user_email}
              slotProps={{
                primary: { variant: 'body2', sx: { fontWeight: 700 } },
                secondary: { variant: 'caption' },
              }}
            />
          </ListItem>
        ))}
      </List>
      <Divider />
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ fontWeight: 800 }} color="error.main">
          {t('admin.pods.revokeLossTotal')}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 800 }} color="error.main">
          {money(lossTotal)}
        </Typography>
      </Stack>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('admin.pods.revokeHeldTotal')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {money(heldTotal)}
        </Typography>
      </Stack>
    </Stack>
  );
}
